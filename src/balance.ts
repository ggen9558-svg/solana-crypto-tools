import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";

export async function getSolBalance(conn: Connection, owner: PublicKey): Promise<number> {
  return (await conn.getBalance(owner)) / LAMPORTS_PER_SOL;
}

export interface TokenBalance {
  tokenAccount: string;
  mint: string;
  amount: string;
  decimals: number;
  uiAmount: number | null;
}

export async function getTokenBalances(conn: Connection, owner: PublicKey): Promise<TokenBalance[]> {
  const results = await Promise.all(
    [TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID].map((programId) =>
      conn.getParsedTokenAccountsByOwner(owner, { programId }),
    ),
  );
  return results.flatMap((r) =>
    r.value.map(({ pubkey, account }) => {
      const info = account.data.parsed.info;
      return {
        tokenAccount: pubkey.toBase58(),
        mint: info.mint as string,
        amount: info.tokenAmount.amount as string,
        decimals: info.tokenAmount.decimals as number,
        uiAmount: info.tokenAmount.uiAmount as number | null,
      };
    }),
  );
}

export async function getAccountInfo(conn: Connection, address: PublicKey) {
  const info = await conn.getAccountInfo(address);
  if (!info) return null;
  return {
    address: address.toBase58(),
    lamports: info.lamports,
    sol: info.lamports / LAMPORTS_PER_SOL,
    owner: info.owner.toBase58(),
    executable: info.executable,
    dataLength: info.data.length,
  };
}
