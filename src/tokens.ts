import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, getOrCreateAssociatedTokenAccount, getMint } from "@solana/spl-token";
import { WalletError } from "./errors.js";

/** Creates (if missing) the owner's associated token account for a mint. */
export async function createTokenAccount(conn: Connection, payer: Keypair, mint: PublicKey) {
  const info = await conn.getAccountInfo(mint);
  if (!info) throw new WalletError("Mint not found", "INVALID_MINT");
  const acc = await getOrCreateAssociatedTokenAccount(
    conn, payer, mint, payer.publicKey, false, undefined, undefined, info.owner,
  );
  return { address: acc.address.toBase58(), mint: mint.toBase58(), amount: acc.amount.toString() };
}

export function associatedTokenAddress(mint: PublicKey, owner: PublicKey): string {
  return getAssociatedTokenAddressSync(mint, owner).toBase58();
}

export async function getTokenInfo(conn: Connection, mint: PublicKey) {
  const info = await conn.getAccountInfo(mint);
  if (!info) throw new WalletError("Mint not found", "INVALID_MINT");
  const m = await getMint(conn, mint, undefined, info.owner);
  return {
    mint: mint.toBase58(),
    decimals: m.decimals,
    supply: m.supply.toString(),
    mintAuthority: m.mintAuthority?.toBase58() ?? null,
    freezeAuthority: m.freezeAuthority?.toBase58() ?? null,
  };
}
