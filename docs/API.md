# API

All functions are exported from `src/index.ts`. Errors are thrown as `WalletError` with a `code`.

## Wallet (`wallet.ts`)
- `generateMnemonic(strength = 128)` – new BIP39 seed phrase (12 or 24 words).
- `generateKeypair()` – random `Keypair`.
- `keypairFromMnemonic(mnemonic, index = 0, passphrase = "")` – derives `m/44'/501'/index'/0'`.
- `keypairFromSecret(secret)` – base58 or JSON byte array private key.
- `exportSecretBase58(kp)` / `exportSecretJson(kp)`.

## Keystore (`store.ts`)
`new Keystore(path?)` – encrypted, multi-account file (default `~/.solana-wallet/keystore.json`).
`add(name, kp, password, mnemonic?)`, `list()`, `getPublicKey(name)`, `unlock(name, password)`,
`revealMnemonic(name, password)`, `remove(name, password)`.

## Crypto (`crypto.ts`)
`encrypt(bytes, password)` / `decrypt(blob, password)` – scrypt + AES-256-GCM.

## Connection (`connection.ts`)
`getConnection({ network?, rpcUrl?, commitment? })`; `resolveRpcUrl()`. Uses `SOLANA_RPC_URL` / `SOLANA_NETWORK`.

## Balances (`balance.ts`)
`getSolBalance(conn, owner)`, `getTokenBalances(conn, owner)` (SPL and Token-2022), `getAccountInfo(conn, address)`.

## Transfers (`transfer.ts`)
`sendSol(conn, from, to, amountSol)`, `sendToken(conn, from, mint, to, amount)` – amounts are decimal strings,
converted exactly to base units; recipient ATA is created if missing.

## Tokens (`tokens.ts`)
`createTokenAccount(conn, payer, mint)`, `associatedTokenAddress(mint, owner)`, `getTokenInfo(conn, mint)`.

## History (`history.ts`)
`getTransactionHistory(conn, address, limit)`, `getTransactionStatus(conn, signature)`.

## Validation (`validation.ts`)
`parsePublicKey`, `toBaseUnits`, `fromBaseUnits`, `validatePassword`.
