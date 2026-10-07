import { PublicKey } from "@solana/web3.js";
import { WalletError } from "./errors.js";

export function parsePublicKey(value: string, label = "address"): PublicKey {
  try {
    return new PublicKey(value);
  } catch {
    throw new WalletError(`Invalid ${label}: ${value}`, "INVALID_ADDRESS");
  }
}

export function parsePositiveAmount(value: string | number, label = "amount"): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    throw new WalletError(`Invalid ${label}: must be a positive number`, "INVALID_AMOUNT");
  }
  return n;
}

/** Convert a decimal string/number to base units without floating point error. */
export function toBaseUnits(value: string | number, decimals: number): bigint {
  const str = String(value).trim();
  if (!/^\d+(\.\d+)?$/.test(str)) {
    throw new WalletError(`Invalid amount: ${str}`, "INVALID_AMOUNT");
  }
  const [whole, frac = ""] = str.split(".");
  if (frac.length > decimals) {
    throw new WalletError(`Amount has more than ${decimals} decimal places`, "INVALID_AMOUNT");
  }
  const result = BigInt(whole + frac.padEnd(decimals, "0"));
  if (result <= 0n) throw new WalletError("Amount must be greater than zero", "INVALID_AMOUNT");
  return result;
}

export function fromBaseUnits(value: bigint, decimals: number): string {
  const s = value.toString().padStart(decimals + 1, "0");
  const whole = s.slice(0, s.length - decimals);
  const frac = s.slice(s.length - decimals).replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole;
}

export function validatePassword(password: string): void {
  if (typeof password !== "string" || password.length < 8) {
    throw new WalletError("Password must be at least 8 characters", "WEAK_PASSWORD");
  }
}
