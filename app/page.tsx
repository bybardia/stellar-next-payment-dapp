"use client";

import { useState } from "react";
import {
  isConnected,
  requestAccess,
  getAddress,
  signTransaction,
} from "@stellar/freighter-api";
import {
  getXlmBalance,
  buildPaymentTransaction,
  submitSignedTransaction,
  NETWORK_PASSPHRASE,
} from "@/lib/stellar-helper";

export default function Home() {
  const [publicKey, setPublicKey] = useState<string>("");
  const [balance, setBalance] = useState<string>("");
  const [destination, setDestination] = useState<string>("");
  const [amount, setAmount] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<string>("");
  const [txHash, setTxHash] = useState<string>("");
  const [error, setError] = useState<string>("");

  // Connect Freighter wallet
  async function handleConnect() {
    setError("");
    setStatus("");
    try {
      const connected = await isConnected();
      if (!connected.isConnected) {
        setError("Freighter wallet is not installed.");
        return;
      }

      const access = await requestAccess();
      if (access.error) {
        setError(access.error);
        return;
      }

      const key = access.address;
      setPublicKey(key);

      await refreshBalance(key);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to connect wallet.");
    }
  }

  // Disconnect wallet (clear local state)
  function handleDisconnect() {
    setPublicKey("");
    setBalance("");
    setDestination("");
    setAmount("");
    setStatus("");
    setTxHash("");
    setError("");
  }

  // Fetch and update balance
  async function refreshBalance(key: string) {
    try {
      const bal = await getXlmBalance(key);
      setBalance(bal);
    } catch {
      setBalance("0");
    }
  }

  // Send XLM payment
  async function handleSend() {
    setError("");
    setStatus("");
    setTxHash("");

    if (!publicKey) {
      setError("Please connect your wallet first.");
      return;
    }
    if (!destination || !amount) {
      setError("Please enter a destination address and amount.");
      return;
    }

    setLoading(true);
    try {
      // 1. Build unsigned transaction
      const xdr = await buildPaymentTransaction({
        sourcePublicKey: publicKey,
        destination,
        amount,
      });

      // 2. Sign with Freighter
      const signed = await signTransaction(xdr, {
        networkPassphrase: NETWORK_PASSPHRASE,
        address: publicKey,
      });

      if (signed.error) {
        setError(signed.error);
        setLoading(false);
        return;
      }

      // 3. Submit to the network
      const hash = await submitSignedTransaction(signed.signedTxXdr);

      setTxHash(hash);
      setStatus("success");
      await refreshBalance(publicKey);
    } catch (e) {
      setStatus("failure");
      setError(e instanceof Error ? e.message : "Transaction failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Stellar Testnet Payment</h1>
          <p className="text-gray-400 text-sm">
            Connect Freighter, check your balance, and send XLM on Testnet.
          </p>
        </div>

        {/* Wallet connection */}
        <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800 space-y-4">
          {!publicKey ? (
            <button
              onClick={handleConnect}
              className="w-full bg-indigo-600 hover:bg-indigo-500 transition rounded-xl py-3 font-medium"
            >
              Connect Wallet
            </button>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500">Connected wallet</p>
                <p className="text-sm break-all font-mono">{publicKey}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">XLM Balance</p>
                <p className="text-2xl font-semibold">
                  {balance ? `${balance} XLM` : "…"}
                </p>
              </div>
              <button
                onClick={handleDisconnect}
                className="w-full bg-gray-800 hover:bg-gray-700 transition rounded-xl py-2 text-sm"
              >
                Disconnect
              </button>
            </div>
          )}
        </div>

        {/* Payment form */}
        {publicKey && (
          <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800 space-y-4">
            <h2 className="font-semibold">Send Payment</h2>

            <div className="space-y-1">
              <label className="text-xs text-gray-500">Destination address</label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="G..."
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-500">Amount (XLM)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="10"
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              onClick={handleSend}
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition rounded-xl py-3 font-medium"
            >
              {loading ? "Sending..." : "Send Payment"}
            </button>
          </div>
        )}

        {/* Transaction feedback */}
        {status === "success" && (
          <div className="bg-emerald-950 border border-emerald-800 rounded-2xl p-4 text-sm space-y-1">
            <p className="text-emerald-400 font-medium">
              ✅ Transaction successful!
            </p>
            <p className="text-gray-400 break-all">
              Hash: <span className="font-mono">{txHash}</span>
            </p>
            <a
              href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 underline"
            >
              View on Stellar Expert
            </a>
          </div>
        )}

        {error && (
          <div className="bg-red-950 border border-red-800 rounded-2xl p-4 text-sm">
            <p className="text-red-400 font-medium">❌ {error}</p>
          </div>
        )}
      </div>
    </main>
  );
}
