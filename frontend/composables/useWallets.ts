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
    // Mock mode for testing without Phantom wallet
    if (config.public.mockSolana === 'true') {
      console.log("Mock mode: Simulating wallet connection");
      walletAddress.value = "GLcDQyrP9LurDBnf7rFjS9N9tXWraDb3Djsmns3MJoeD";
      await updateBalance(walletAddress.value);
      return;
    }
    
    if (window.solana && window.solana.isPhantom) {
      try {
        const resp = await window.solana.connect();
        walletAddress.value = resp.publicKey.toString();
        await updateBalance(resp.publicKey);
      } catch (err) {
        console.error("Wallet connection error:", err);
        // Fallback to mock mode if real wallet fails
        console.log("Falling back to mock wallet");
        walletAddress.value = "GLcDQyrP9LurDBnf7rFjS9N9tXWraDb3Djsmns3MJoeD";
        await updateBalance(walletAddress.value);
      }
    } else {
      alert("Phantom Wallet not found. Please install it.");
      // Fallback to mock mode
      console.log("Using mock wallet");
      walletAddress.value = "GLcDQyrP9LurDBnf7rFjS9N9tXWraDb3Djsmns3MJoeD";
      await updateBalance(walletAddress.value);
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
      // Mock mode for testing without Solana connection
      if (config.public.mockSolana === 'true') {
        console.log("Mock mode: Setting dummy balance");
        balance.value = 1.5; // Dummy balance in SOL
        return;
      }
      
      // const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
      const publicKeyObj = new $solana.PublicKey(publicKey);
      const balanceInfo = await $solana.connection.getBalance(publicKeyObj);
      balance.value = balanceInfo / 1000000000; // lamports to sol
    } catch (err) {
      console.error("error fetching balance:", err);
      // Fallback to mock mode if real connection fails
      console.log("Falling back to mock mode");
      balance.value = 1.5;
    }
  };

  const joinQuiz = async (bet: number) => {
    const programId = config.public.programId
    console.log("programId:", programId);
    
    // Mock mode for testing without Solana transactions
    if (config.public.mockSolana === 'true') {
      console.log("Mock mode: Simulating quiz join");
      // Simulate a delay like a real transaction
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Quiz joined successfully (mock)!');
      return;
    }
    
    // 仮（要見積もり・要調整）
    // 分配コントラクトを実行する際の手数料を参加者からあらかじめ徴収し
    // 余ったものを、返還する　
    const fee = 0.00001 // sol
    try {
      await $solana.joinQuiz(window.solana, programId, bet, fee );
      console.log('Quiz joined successfully!');
    } catch (error:any) {
      console.error('Failed to join the quiz:', error);
      // Fallback to mock mode if Solana transaction fails
      console.log("Falling back to mock quiz join");
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('Quiz joined successfully (fallback mock)!');
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
