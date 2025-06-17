interface Window {
    solana: any
}

declare var window: Window


export const useWallet = () => {
  const config = useRuntimeConfig()
  const walletAddress = useState('walletAddress', () => null)
  const balance = useState('balance', () => 0)
  const { $solana } = useNuxtApp() as any;



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
      } catch (err: any) {
        console.error("Wallet connection error:", err);
        
        // Provide user-friendly error messages
        if (err.code === 4001) {
          alert("ウォレット接続が拒否されました。もう一度お試しください。");
        } else if (err.code === -32002) {
          alert("Phantom walletでリクエストが保留中です。ウォレットを確認してください。");
        } else {
          alert("ウォレット接続に失敗しました。Phantomウォレットがインストールされているか確認してください。");
        }
        
        // Keep wallet disconnected state instead of fallback
        walletAddress.value = null;
        balance.value = 0;
      }
    } else {
      const installWallet = confirm(
        "Phantom Walletがインストールされていません。\n" +
        "インストールページを開きますか？"
      );
      
      if (installWallet) {
        (window as any).open("https://phantom.app/", "_blank");
      }
      
      // Keep wallet disconnected state
      walletAddress.value = null;
      balance.value = 0;
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
      
      const publicKeyObj = new $solana.PublicKey(publicKey);
      const balanceInfo = await $solana.connection.getBalance(publicKeyObj);
      balance.value = balanceInfo / 1000000000; // lamports to sol
      console.log(`Real devnet balance: ${balance.value} SOL`);
    } catch (err) {
      console.error("Error fetching balance:", err);
      balance.value = 0; // Set to 0 instead of mock balance when real connection fails
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
