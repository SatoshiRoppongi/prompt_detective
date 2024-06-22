interface Window {
    solana: any
}

declare var window: Window


export const useWallet = () => {
  const config = useRuntimeConfig()
  const walletAddress = useState('walletAddress', () => null)
  const balance = useState('balance', () => 0)
  const { $solana } = useNuxtApp();



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
        await window.solana.disconnect();
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
      // const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
      const publicKeyObj = new $solana.PublicKey(publicKey);
      const balanceInfo = await $solana.connection.getBalance(publicKeyObj);
      balance.value = balanceInfo / 1000000000; // lamports to sol
    } catch (err) {
      console.error("error fetching balance:", err);
    }
  };

  const joinQuiz = async (bet: number) => {
    const programId = config.public.programId
    // 仮（要見積もり・要調整）
    // 分配コントラクトを実行する際の手数料を参加者からあらかじめ徴収し
    // 余ったものを、返還する　
    const fee = 0.00001 // sol
    try {
      await $solana.joinQuiz(window.solana, programId, bet, fee );
      console.log('Quiz joined successfully!');
    } catch (error:any) {
      console.error('Failed to join the quiz:', error);
    }
  }

  return {
    walletAddress,
    balance,
    connectWallet,
    disconnectWallet,
    joinQuiz
  };
}
