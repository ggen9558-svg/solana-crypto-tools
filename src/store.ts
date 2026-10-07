import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { Keypair } from "@solana/web3.js";
import { decrypt, encrypt, EncryptedBlob } from "./crypto.js";
import { WalletError } from "./errors.js";
import { validatePassword } from "./validation.js";

export interface StoredAccount {
  name: string;
  publicKey: string;
  secret: EncryptedBlob;
  /** Encrypted BIP39 mnemonic, present only for wallets created/imported from a seed phrase. */
  mnemonic?: EncryptedBlob;
  createdAt: string;
}

interface KeystoreFile {
  version: 1;
  accounts: StoredAccount[];
}

export function defaultKeystorePath(): string {
  return process.env.WALLET_KEYSTORE_PATH || join(homedir(), ".solana-wallet", "keystore.json");
}

/** Encrypted multi-account keystore. Secret material is only ever written encrypted. */
export class Keystore {
  constructor(private readonly path: string = defaultKeystorePath()) {}

  private load(): KeystoreFile {
    if (!existsSync(this.path)) return { version: 1, accounts: [] };
    try {
      return JSON.parse(readFileSync(this.path, "utf8")) as KeystoreFile;
    } catch {
      throw new WalletError(`Keystore is corrupted: ${this.path}`, "KEYSTORE_CORRUPT");
    }
  }

  private save(data: KeystoreFile): void {
    mkdirSync(dirname(this.path), { recursive: true, mode: 0o700 });
    const tmp = `${this.path}.tmp`;
    writeFileSync(tmp, JSON.stringify(data, null, 2), { mode: 0o600 });
    chmodSync(tmp, 0o600);
    renameSync(tmp, this.path);
  }

  list(): Pick<StoredAccount, "name" | "publicKey" | "createdAt">[] {
    return this.load().accounts.map(({ name, publicKey, createdAt }) => ({ name, publicKey, createdAt }));
  }

  add(name: string, kp: Keypair, password: string, mnemonic?: string): void {
    validatePassword(password);
    if (!/^[\w.-]{1,32}$/.test(name)) {
      throw new WalletError("Account name must be 1-32 chars of letters, digits, _ . -", "INVALID_NAME");
    }
    const data = this.load();
    if (data.accounts.some((a) => a.name === name)) {
      throw new WalletError(`Account "${name}" already exists`, "DUPLICATE_ACCOUNT");
    }
    if (data.accounts.some((a) => a.publicKey === kp.publicKey.toBase58())) {
      throw new WalletError("This wallet is already in the keystore", "DUPLICATE_ACCOUNT");
    }
    data.accounts.push({
      name,
      publicKey: kp.publicKey.toBase58(),
      secret: encrypt(kp.secretKey, password),
      mnemonic: mnemonic ? encrypt(Buffer.from(mnemonic, "utf8"), password) : undefined,
      createdAt: new Date().toISOString(),
    });
    this.save(data);
  }

  private find(name: string): StoredAccount {
    const acc = this.load().accounts.find((a) => a.name === name);
    if (!acc) throw new WalletError(`Account "${name}" not found`, "ACCOUNT_NOT_FOUND");
    return acc;
  }

  getPublicKey(name: string): string {
    return this.find(name).publicKey;
  }

  unlock(name: string, password: string): Keypair {
    return Keypair.fromSecretKey(decrypt(this.find(name).secret, password));
  }

  revealMnemonic(name: string, password: string): string {
    const acc = this.find(name);
    if (!acc.mnemonic) throw new WalletError("No seed phrase stored for this account", "NO_MNEMONIC");
    return Buffer.from(decrypt(acc.mnemonic, password)).toString("utf8");
  }

  remove(name: string, password: string): void {
    this.unlock(name, password);
    const data = this.load();
    data.accounts = data.accounts.filter((a) => a.name !== name);
    this.save(data);
  }
}
