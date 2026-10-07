import { clusterApiUrl, Commitment, Connection } from "@solana/web3.js";
import "dotenv/config";
import { WalletError } from "./errors.js";

export type Network = "devnet" | "testnet" | "mainnet-beta" | "localnet";

export function resolveRpcUrl(network?: string, rpcUrl?: string): string {
  const url = rpcUrl ?? process.env.SOLANA_RPC_URL;
  if (url) {
    if (!/^https?:\/\//.test(url)) throw new WalletError("RPC URL must start with http(s)://", "INVALID_RPC_URL");
    return url;
  }
  const net = network ?? process.env.SOLANA_NETWORK ?? "devnet";
  if (net === "localnet") return "http://127.0.0.1:8899";
  if (net === "devnet" || net === "testnet" || net === "mainnet-beta") return clusterApiUrl(net);
  throw new WalletError(`Unknown network: ${net}`, "INVALID_NETWORK");
}

export function getConnection(opts: { network?: string; rpcUrl?: string; commitment?: Commitment } = {}): Connection {
  return new Connection(resolveRpcUrl(opts.network, opts.rpcUrl), opts.commitment ?? "confirmed");
}
