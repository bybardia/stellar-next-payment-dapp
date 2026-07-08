import {
  Horizon,
  Networks,
  Operation,
  TransactionBuilder,
  BASE_FEE,
  Asset,
} from "@stellar/stellar-sdk";

// Horizon server for the Stellar Testnet
const server = new Horizon.Server("https://horizon-testnet.stellar.org");

export const NETWORK_PASSPHRASE = Networks.TESTNET;

/**
 * Fetch the native XLM balance for a given public key.
 */
export async function getXlmBalance(publicKey: string): Promise<string> {
  const account = await server.loadAccount(publicKey);

  const nativeBalance = account.balances.find(
    (balance) => balance.asset_type === "native"
  );

  return nativeBalance?.balance ?? "0";
}

/**
 * Build an unsigned XLM payment transaction and return it as XDR.
 */
export async function buildPaymentTransaction({
  sourcePublicKey,
  destination,
  amount,
}: {
  sourcePublicKey: string;
  destination: string;
  amount: string;
}): Promise<string> {
  const account = await server.loadAccount(sourcePublicKey);

  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.payment({
        destination,
        asset: Asset.native(),
        amount,
      })
    )
    .setTimeout(30)
    .build();

  return transaction.toXDR();
}

/**
 * Submit a signed transaction (XDR) to the Stellar Testnet.
 * Returns the transaction hash on success.
 */
export async function submitSignedTransaction(
  signedXdr: string
): Promise<string> {
  const transaction = TransactionBuilder.fromXDR(
    signedXdr,
    NETWORK_PASSPHRASE
  );

  const result = await server.submitTransaction(transaction);
  return result.hash;
}
