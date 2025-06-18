const fetch = require("node-fetch");

async function createTestGame() {
  console.log("🎮 Creating test game...");
  
  const gameData = {
    gameId: "test-game-" + Date.now(),
    secretPrompt: "A red apple sitting on a wooden table with sunlight coming through a window",
    imageName: "test-apple.jpg",
    minBet: 100000000, // 0.1 SOL in lamports
    maxParticipants: 10,
    durationHours: 24
  };

  try {
    const response = await fetch("http://localhost:5001/createGame", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(gameData)
    });

    const result = await response.json();
    console.log("✅ Test game created:", result);
    
    // Also test getting the active quiz
    const activeResponse = await fetch("http://localhost:5001/activeQuiz");
    if (activeResponse.ok) {
      const activeGame = await activeResponse.json();
      console.log("✅ Active game retrieved:", activeGame);
    } else {
      console.log("⚠️ No active game found (expected if this is the first game)");
    }
    
    return gameData.gameId;
  } catch (error) {
    console.error("❌ Failed to create test game:", error);
    throw error;
  }
}

async function createTestParticipation(gameId) {
  console.log("👤 Creating test participation...");
  
  const participationData = {
    quizId: gameId,
    walletAddress: "6dNVeACdySTuXnuBVgNkJMAhHNs2kBZZDzFr8bSx1234", // Mock wallet address
    guessPrompt: "An apple on a table",
    bet: 0.15 // 0.15 SOL
  };

  try {
    const response = await fetch("http://localhost:5001/participation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(participationData)
    });

    if (response.ok) {
      const result = await response.json();
      console.log("✅ Test participation created:", result);
    } else {
      const error = await response.text();
      console.log("⚠️ Participation creation failed (expected without real Firestore):", error);
    }
  } catch (error) {
    console.error("❌ Failed to create test participation:", error);
  }
}

async function runTests() {
  console.log("🚀 Setting up test data for UI testing...\n");
  
  try {
    const gameId = await createTestGame();
    console.log("\n");
    await createTestParticipation(gameId);
    
    console.log("\n✅ Test setup completed!");
    console.log("💡 You can now test the UI at: http://localhost:3000");
    console.log("🎯 Game ID created:", gameId);
    
  } catch (error) {
    console.error("❌ Test setup failed:", error);
  }
}

runTests();