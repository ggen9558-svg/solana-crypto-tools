export class WalletError extends Error {
  constructor(message: string, public readonly code: string = "WALLET_ERROR") {
    super(message);
    this.name = "WalletError";
  }
}
