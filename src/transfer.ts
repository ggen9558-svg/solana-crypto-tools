import {
  Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, sendAndConfirmTransaction, SystemProgram, Transaction,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountIdempotentInstruction, createTransferCheckedInstruction,
  getAssociatedTokenAddressSync, getMint,
} from "@solana/spl-token";
import { WalletError } from "./errors.js";
import { toBaseUnits } from "./validation.js";

export async function sendSol(conn: Connection, from: Keypair, to: PublicKey, amountSol: string | number): Promise<string> {
  const lamports = toBaseUnits(amountSol, 9);
  if (lamports > BigInt(Number.MAX_SAFE_INTEGER)) throw new WalletError("Amount too large", "INVALID_AMOUNT");
  const balance = await conn.getBalance(from.publicKey);
  if (BigInt(balance) < lamports + 5000n) {
    throw new WalletError(
      `Insufficient funds: balance ${balance / LAMPORTS_PER_SOL} SOL, need ${amountSol} SOL plus fee`,
      "INSUFFICIENT_FUNDS",
    );
  }
  const tx = new Transaction().add(
    SystemProgram.transfer({ fromPubkey: from.publicKey, toPubkey: to, lamports: Number(lamports) }),
  );
  return sendAndConfirmTransaction(conn, tx, [from]);
}

/** Transfers SPL tokens from the sender's associated token account; creates the recipient's ATA if needed. */
export async function sendToken(
  conn: Connection, from: Keypair, mint: PublicKey, to: PublicKey, amount: string | number,
): Promise<string> {
  const mintInfo = await getMint(conn, mint).catch(() => {
    throw new WalletError("Mint not found or not an SPL token", "INVALID_MINT");
  });
  const programId = (await conn.getAccountInfo(mint))!.owner;
  const raw = toBaseUnits(amount, mintInfo.decimals);
  const source = getAssociatedTokenAddressSync(mint, from.publicKey, false, programId);
  const dest = getAssociatedTokenAddressSync(mint, to, true, programId);
  const srcBal = await conn.getTokenAccountBalance(source).catch(() => {
    throw new WalletError("Sender has no token account for this mint", "NO_TOKEN_ACCOUNT");
  });
  if (BigInt(srcBal.value.amount) < raw) throw new WalletError("Insufficient token balance", "INSUFFICIENT_FUNDS");
  const tx = new Transaction().add(
    createAssociatedTokenAccountIdempotentInstruction(from.publicKey, dest, to, mint, programId),
    createTransferCheckedInstruction(source, mint, dest, from.publicKey, raw, mintInfo.decimals, [], programId),
  );
  return sendAndConfirmTransaction(conn, tx, [from]);
}
