// Run: npx tsx examples/basic.ts   (uses devnet, an in-memory wallet, no keystore)
import { generateMnemonic, getConnection, getSolBalance, keypairFromMnemonic } from "../src/index.js";

const mnemonic = generateMnemonic();
const wallet = keypairFromMnemonic(mnemonic);
console.log("Address:", wallet.publicKey.toBase58());

const conn = getConnection({ network: "devnet" });
console.log("SOL balance:", await getSolBalance(conn, wallet.publicKey));
