# Security best practices

- Private keys and seed phrases are stored only encrypted (scrypt N=2^15 → AES-256-GCM); the keystore file is written with mode `0600`.
- Use a strong, unique password (min 8 chars enforced; longer is better). A lost password cannot be recovered.
- Back up your seed phrase offline on paper. Never photograph it, paste it into websites, or share it with anyone.
- Prefer the hidden prompt over `WALLET_PASSWORD`; environment variables can leak via process listings and shell history.
- Test on `devnet` first. Double check recipient addresses before sending; transactions are irreversible.
- Never commit `.env` or keystore files (both are git-ignored / outside the repo by default).
- Use a trusted RPC endpoint; public endpoints are rate limited and can see your queries.
- `export` and `show-mnemonic` print secrets to the terminal – clear your scrollback afterwards.
- Keep large holdings in a hardware wallet; use this tool for small/dev balances.
