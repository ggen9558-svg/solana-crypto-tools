#!/usr/bin/env bash
# Example CLI session on devnet. You will be prompted for a password.
set -e
npm run -s cli -- create main
npm run -s cli -- airdrop main 1 --network devnet
npm run -s cli -- balance main
npm run -s cli -- send main <RECIPIENT_ADDRESS> 0.1
npm run -s cli -- history main --limit 5
