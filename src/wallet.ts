import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import * as bip39 from "bip39";
import { derivePath } from "ed25519-hd-key";
import { WalletError } from "./errors.js";

export function generateMnemonic(strength: 128 | 256 = 128): string {
  return bip39.generateMnemonic(strength);
}

export function generateKeypair(): Keypair {
  return Keypair.generate();
}

/** Derives m/44'/501'/index'/0' (the path used by Phantom/Solflare). */
export function keypairFromMnemonic(mnemonic: string, index = 0, passphrase = ""): Keypair {
  const normalized = mnemonic.trim().toLowerCase().split(/\s+/).join(" ");
  if (!bip39.validateMnemonic(normalized)) {
    throw new WalletError("Invalid seed phrase", "INVALID_MNEMONIC");
  }
  if (!Number.isInteger(index) || index < 0) {
    throw new WalletError("Invalid account index", "INVALID_INDEX");
  }
  const seed = bip39.mnemonicToSeedSync(normalized, passphrase);
  const { key } = derivePath(`m/44'/501'/${index}'/0'`, seed.toString("hex"));
  return Keypair.fromSeed(key);
}

/** Accepts a base58 string or a JSON array of bytes (Solana CLI format). */
export function keypairFromSecret(secret: string): Keypair {
  const input = secret.trim();
  try {
    const bytes = input.startsWith("[") ? Uint8Array.from(JSON.parse(input)) : bs58.decode(input);
    return Keypair.fromSecretKey(bytes);
  } catch {
    throw new WalletError("Invalid private key", "INVALID_PRIVATE_KEY");
  }
}

export function exportSecretBase58(kp: Keypair): string {
  return bs58.encode(kp.secretKey);
}

export function exportSecretJson(kp: Keypair): string {
  return JSON.stringify(Array.from(kp.secretKey));
}
