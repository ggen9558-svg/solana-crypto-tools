import { randomBytes, scryptSync, createCipheriv, createDecipheriv } from "node:crypto";
import { WalletError } from "./errors.js";

export interface EncryptedBlob {
  version: 1;
  kdf: "scrypt";
  cipher: "aes-256-gcm";
  salt: string;
  iv: string;
  tag: string;
  data: string;
}

const SCRYPT = { N: 2 ** 15, r: 8, p: 1, maxmem: 128 * 1024 * 1024 };

function deriveKey(password: string, salt: Buffer): Buffer {
  return scryptSync(password, salt, 32, SCRYPT);
}

export function encrypt(plaintext: Uint8Array, password: string): EncryptedBlob {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(password, salt), iv);
  const data = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return {
    version: 1,
    kdf: "scrypt",
    cipher: "aes-256-gcm",
    salt: salt.toString("hex"),
    iv: iv.toString("hex"),
    tag: cipher.getAuthTag().toString("hex"),
    data: data.toString("hex"),
  };
}

export function decrypt(blob: EncryptedBlob, password: string): Uint8Array {
  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      deriveKey(password, Buffer.from(blob.salt, "hex")),
      Buffer.from(blob.iv, "hex"),
    );
    decipher.setAuthTag(Buffer.from(blob.tag, "hex"));
    return new Uint8Array(Buffer.concat([decipher.update(Buffer.from(blob.data, "hex")), decipher.final()]));
  } catch {
    throw new WalletError("Decryption failed: wrong password or corrupted data", "DECRYPT_FAILED");
  }
}
