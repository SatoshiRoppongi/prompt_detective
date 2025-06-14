const admin = require("firebase-admin");

// Initialize Firebase Admin SDK
try {
  const ServiceAccount = require("./src/service_account.json");
  admin.initializeApp({
    credential: admin.credential.cert(ServiceAccount),
  });
  console.log("✅ Firebase Admin SDK initialized successfully");
} catch (error) {
  console.error("❌ Failed to initialize Firebase:", error);
  process.exit(1);
}

const db = admin.firestore();

async function createTestQuizData() {
  console.log("🎮 Creating test quiz data in Firestore...");
  
  const gameId = "demo-game-" + Date.now();
  const quizData = {
    id: gameId,
    imageName: "demo-apple.jpg",
    secretPrompt: "A red apple sitting on a wooden table with sunlight coming through a window",
    totalParticipants: 2,
    averageScore: 75.5,
    pot: 0.3, // 0.3 SOL
    status: "active",
    minBet: 100000000, // 0.1 SOL in lamports
    maxParticipants: 10,
    endTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  try {
    // Create quiz document
    await db.collection("quizzes").doc(gameId).set(quizData);
    console.log("✅ Quiz document created");

    // Create sample participants
    const participants = [
      {
        walletAddress: "6dNVeACdySTuXnuBVgNkJMAhHNs2kBZZDzFr8bSx1234",
        guessPrompt: "An apple on a table",
        score: 85.2,
        bet: 0.15,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      {
        walletAddress: "9fKLMeACdySTuXnuBVgNkJMAhHNs2kBZZDzFr8bSx5678",
        guessPrompt: "Red fruit on wooden surface",
        score: 65.8,
        bet: 0.15,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }
    ];

    const participantsCollection = db.collection("quizzes").doc(gameId).collection("participants");
    
    for (const participant of participants) {
      await participantsCollection.add(participant);
    }
    
    console.log("✅ Sample participants created");
    console.log(`🎯 Game ID: ${gameId}`);
    console.log("💡 Test data ready for UI testing!");
    
    return gameId;
  } catch (error) {
    console.error("❌ Failed to create test data:", error);
    throw error;
  }
}

async function testApiEndpoints(gameId) {
  console.log("\n🔍 Testing API endpoints...");
  
  const fetch = require("node-fetch");
  
  try {
    // Test active quiz endpoint
    const response = await fetch("http://localhost:5001/activeQuiz");
    if (response.ok) {
      const data = await response.json();
      console.log("✅ Active quiz API working:", data.id || "No active quiz");
    } else {
      console.log("⚠️ Active quiz API returned:", response.status);
    }

    // Test latest quiz endpoint  
    const latestResponse = await fetch("http://localhost:5001/latestQuiz");
    if (latestResponse.ok) {
      const data = await latestResponse.json();
      console.log("✅ Latest quiz API working:", data.id || "No latest quiz");
    } else {
      console.log("⚠️ Latest quiz API returned:", latestResponse.status);
    }
    
  } catch (error) {
    console.error("❌ API test failed:", error.message);
  }
}

async function setupTestEnvironment() {
  console.log("🚀 Setting up complete test environment...\n");
  
  try {
    const gameId = await createTestQuizData();
    await testApiEndpoints(gameId);
    
    console.log("\n✅ Test environment setup completed!");
    console.log("🌐 Frontend: http://localhost:3000");
    console.log("🔧 Backend: http://localhost:5001");
    console.log("🎮 Test game ready for UI interaction!");
    
  } catch (error) {
    console.error("❌ Setup failed:", error);
  } finally {
    // Keep the script running briefly to ensure data is written
    setTimeout(() => {
      console.log("✨ Setup complete - you can now test the UI!");
      process.exit(0);
    }, 2000);
  }
}

setupTestEnvironment();