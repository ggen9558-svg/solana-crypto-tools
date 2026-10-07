#!/usr/bin/env node
import { createInterface } from "node:readline";
import { Writable } from "node:stream";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getAccountInfo, getSolBalance, getTokenBalances } from "./balance.js";
import { getConnection } from "./connection.js";
import { WalletError } from "./errors.js";
import { getTransactionHistory, getTransactionStatus } from "./history.js";
import { Keystore } from "./store.js";
import { associatedTokenAddress, createTokenAccount, getTokenInfo } from "./tokens.js";
import { sendSol, sendToken } from "./transfer.js";
import { parsePublicKey } from "./validation.js";
import {
  exportSecretBase58, exportSecretJson, generateKeypair, generateMnemonic, keypairFromMnemonic, keypairFromSecret,
} from "./wallet.js";

const USAGE = `Usage: solana-wallet <command> [options]

Wallets:
  create <name> [--no-mnemonic]          Create a new wallet (seed phrase based by default)
  import-mnemonic <name> [--index N]     Import from a seed phrase (prompted)
  import-key <name>                      Import from a private key (prompted)
  list                                   List accounts
  export <name> [--format base58|json]   Export private key (requires password)
  show-mnemonic <name>                   Reveal stored seed phrase (requires password)
  remove <name>                          Delete an account (requires password)

Info:
  address <name>
  balance <name|address>                 SOL + SPL token balances
  account <name|address>                 Raw account details
  history <name|address> [--limit N]
  status <signature>
  token-info <mint>

Transactions:
  send <name> <to> <amountSol>
  send-token <name> <mint> <to> <amount>
  create-token-account <name> <mint>
  airdrop <name|address> [amountSol]     (devnet/testnet/localnet only)

Global options: --network <devnet|testnet|mainnet-beta|localnet>  --rpc <url>
Password is read from a hidden prompt, or WALLET_PASSWORD if set (avoid on shared systems).`;

function ask(question: string, hidden: boolean): Promise<string> {
  return new Promise((resolve) => {
    let muted = false;
    const out = new Writable({
      write(chunk, _enc, cb) {
        if (!muted) process.stderr.write(chunk);
        cb();
      },
    });
    const rl = createInterface({ input: process.stdin, output: out, terminal: true });
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stderr.write("\n");
      resolve(answer);
    });
    muted = hidden;
  });
}

async function password(confirm = false): Promise<string> {
  if (process.env.WALLET_PASSWORD) return process.env.WALLET_PASSWORD;
  const pw = await ask("Password: ", true);
  if (confirm && (await ask("Confirm password: ", true)) !== pw) {
    throw new WalletError("Passwords do not match", "PASSWORD_MISMATCH");
  }
  return pw;
}

function parseArgs(argv: string[]) {
  const positional: string[] = [];
  const flags: Record<string, string | true> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("--") && ["network", "rpc", "index", "limit", "format"].includes(key)) {
        flags[key] = next;
        i++;
      } else flags[key] = true;
    } else positional.push(a);
  }
  return { positional, flags };
}

function need(args: string[], n: number): void {
  if (args.length < n) throw new WalletError(`Missing arguments.\n\n${USAGE}`, "USAGE");
}

const print = (v: unknown) => console.log(typeof v === "string" ? v : JSON.stringify(v, null, 2));

async function main() {
  const { positional: [cmd, ...args], flags } = parseArgs(process.argv.slice(2));
  if (!cmd || cmd === "help" || flags.help) return print(USAGE);

  const store = new Keystore();
  const conn = () => getConnection({ network: flags.network as string, rpcUrl: flags.rpc as string });
  const resolveAddr = (v: string) => {
    try { return parsePublicKey(store.getPublicKey(v)); } catch (e) {
      if (e instanceof WalletError && e.code === "ACCOUNT_NOT_FOUND") return parsePublicKey(v);
      throw e;
    }
  };

  switch (cmd) {
    case "create": {
      need(args, 1);
      const pw = await password(true);
      if (flags["no-mnemonic"]) {
        const kp = generateKeypair();
        store.add(args[0], kp, pw);
        print({ name: args[0], address: kp.publicKey.toBase58() });
      } else {
        const mnemonic = generateMnemonic();
        const kp = keypairFromMnemonic(mnemonic);
        store.add(args[0], kp, pw, mnemonic);
        print({ name: args[0], address: kp.publicKey.toBase58() });
        console.log(`\nSeed phrase (write it down offline, never share it):\n${mnemonic}`);
      }
      break;
    }
    case "import-mnemonic": {
      need(args, 1);
      const phrase = await ask("Seed phrase: ", true);
      const kp = keypairFromMnemonic(phrase, flags.index ? Number(flags.index) : 0);
      store.add(args[0], kp, await password(true), phrase.trim().toLowerCase().split(/\s+/).join(" "));
      print({ name: args[0], address: kp.publicKey.toBase58() });
      break;
    }
    case "import-key": {
      need(args, 1);
      const kp = keypairFromSecret(await ask("Private key (base58 or JSON array): ", true));
      store.add(args[0], kp, await password(true));
      print({ name: args[0], address: kp.publicKey.toBase58() });
      break;
    }
    case "list": print(store.list()); break;
    case "export": {
      need(args, 1);
      const kp = store.unlock(args[0], await password());
      console.error("WARNING: anyone with this key controls your funds.");
      print(flags.format === "json" ? exportSecretJson(kp) : exportSecretBase58(kp));
      break;
    }
    case "show-mnemonic": need(args, 1); print(store.revealMnemonic(args[0], await password())); break;
    case "remove": need(args, 1); store.remove(args[0], await password()); print(`Removed ${args[0]}`); break;
    case "address": need(args, 1); print(store.getPublicKey(args[0])); break;
    case "balance": {
      need(args, 1);
      const owner = resolveAddr(args[0]);
      const c = conn();
      const [sol, tokens] = await Promise.all([getSolBalance(c, owner), getTokenBalances(c, owner)]);
      print({ address: owner.toBase58(), sol, tokens });
      break;
    }
    case "account": need(args, 1); print(await getAccountInfo(conn(), resolveAddr(args[0]))); break;
    case "history": need(args, 1); print(await getTransactionHistory(conn(), resolveAddr(args[0]), flags.limit ? Number(flags.limit) : 10)); break;
    case "status": need(args, 1); print(await getTransactionStatus(conn(), args[0])); break;
    case "token-info": need(args, 1); print(await getTokenInfo(conn(), parsePublicKey(args[0], "mint"))); break;
    case "send": {
      need(args, 3);
      const to = parsePublicKey(args[1], "recipient");
      const kp = store.unlock(args[0], await password());
      print({ signature: await sendSol(conn(), kp, to, args[2]) });
      break;
    }
    case "send-token": {
      need(args, 4);
      const mint = parsePublicKey(args[1], "mint");
      const to = parsePublicKey(args[2], "recipient");
      const kp = store.unlock(args[0], await password());
      print({ signature: await sendToken(conn(), kp, mint, to, args[3]) });
      break;
    }
    case "create-token-account": {
      need(args, 2);
      const mint = parsePublicKey(args[1], "mint");
      const kp = store.unlock(args[0], await password());
      const result = await createTokenAccount(conn(), kp, mint);
      print({ ...result, expected: associatedTokenAddress(mint, kp.publicKey) });
      break;
    }
    case "airdrop": {
      need(args, 1);
      if ((flags.network ?? process.env.SOLANA_NETWORK ?? "devnet") === "mainnet-beta") {
        throw new WalletError("Airdrops are not available on mainnet-beta", "INVALID_NETWORK");
      }
      const c = conn();
      const sig = await c.requestAirdrop(resolveAddr(args[0]), Math.round(Number(args[1] ?? 1) * LAMPORTS_PER_SOL));
      await c.confirmTransaction(sig);
      print({ signature: sig });
      break;
    }
    default:
      throw new WalletError(`Unknown command: ${cmd}\n\n${USAGE}`, "USAGE");
  }
}

main().catch((err) => {
  console.error(err instanceof WalletError ? `Error: ${err.message}` : `Unexpected error: ${(err as Error).message}`);
  process.exit(1);
});
