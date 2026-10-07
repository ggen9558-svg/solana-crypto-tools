# solana-crypto-tools

A Solana wallet library and CLI in TypeScript: key/seed management with encrypted storage, SOL and SPL token
balances, transfers, token accounts, and transaction history.

## Setup
```bash
npm install
cp .env.example .env   # optional: choose network / RPC
npm run build
npm test
```

## CLI
```bash
npm run cli -- help            # during development (tsx)
node dist/cli.js help          # after build
```
Examples:
```bash
npm run cli -- create main                       # new wallet + seed phrase
npm run cli -- airdrop main 1 --network devnet
npm run cli -- balance main
npm run cli -- send main <ADDRESS> 0.1
npm run cli -- send-token main <MINT> <ADDRESS> 5
npm run cli -- create-token-account main <MINT>
npm run cli -- history main --limit 5
npm run cli -- status <SIGNATURE>
```
Other commands: `import-mnemonic`, `import-key`, `list`, `export`, `show-mnemonic`, `remove`, `address`, `account`, `token-info`.
Default network is `devnet`; override with `SOLANA_NETWORK`, `SOLANA_RPC_URL`, `--network` or `--rpc`.

## Docs
- [API reference](docs/API.md)
- [Security best practices](docs/SECURITY.md)
- Examples: [`examples/`](examples)

## License
MIT
