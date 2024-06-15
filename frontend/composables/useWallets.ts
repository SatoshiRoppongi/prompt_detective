import { ref } from "vue";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";

export function useWallet() {
  const walletAddress = ref<string | null>(null);
  const balance = ref<number | null>(null);

  const connectWallet = async () => {
    if (window.solana && window.solana.isPhantom) {
      try {
        const resp = await window.solana.connect();
        walletAddress.value = resp.publicKey.toString();
        await updateBalance(resp.publicKey);
      } catch (err) {
        console.error("Wallet connection error:", err);
      }
    } else {
      alert("Phantom Wallet not found. Please install it.");
    }
  };

  const disconnectWallet = async () => {
    try {
      if (window.solana && window.solana.isPhantom) {
        await solana.disconnect();
        walletAddress.value = null;
        balance.value = 0;
      } else {
        alert("Solana object not found! Get a Phantom Wallet");
      }
    } catch (error) {
      console.error("Error disconnecting from wallet:", error);
    }
  };

  const updateBalance = async (publicKey: string) => {
    try {
      const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
      const publicKeyObj = new PublicKey(publicKey);
      const balanceInfo = await connection.getBalance(publicKeyObj);
      balance.value = balanceInfo / 1000000000; // lamports to sol
      console.log("aaa");
      console.log(balance.value);
    } catch (err) {
      console.error("error fetching balance:", err);
    }
  };

  return {
    walletAddress,
    balance,
    connectWallet,
    disconnectWallet,
  };
}
