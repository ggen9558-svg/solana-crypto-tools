import { Connection, PublicKey } from "@solana/web3.js";
import { WalletError } from "./errors.js";

export async function getTransactionHistory(conn: Connection, address: PublicKey, limit = 10) {
  const sigs = await conn.getSignaturesForAddress(address, { limit });
  return sigs.map((s) => ({
    signature: s.signature,
    slot: s.slot,
    blockTime: s.blockTime ? new Date(s.blockTime * 1000).toISOString() : null,
    status: s.err ? "failed" : "success",
    confirmationStatus: s.confirmationStatus ?? null,
  }));
}

export async function getTransactionStatus(conn: Connection, signature: string) {
  const { value } = await conn.getSignatureStatus(signature, { searchTransactionHistory: true });
  if (!value) throw new WalletError("Transaction not found", "TX_NOT_FOUND");
  return {
    signature,
    slot: value.slot,
    confirmations: value.confirmations,
    confirmationStatus: value.confirmationStatus ?? null,
    error: value.err ? JSON.stringify(value.err) : null,
  };
}
