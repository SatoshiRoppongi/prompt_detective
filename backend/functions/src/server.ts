/* eslint-disable max-len */
// Development server for local testing
import * as admin from "firebase-admin";
import express from "express";
import cors from "cors";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Initialize Firebase Admin SDK
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ServiceAccount = require("./service_account.json");
  admin.initializeApp({
    credential: admin.credential.cert(ServiceAccount as admin.ServiceAccount),
  });
  console.log("✅ Firebase Admin SDK initialized successfully");
} catch (error) {
  console.error("❌ Failed to initialize Firebase:", error);
  process.exit(1);
}

const app = express();
app.use(cors({origin: true}));
app.use(express.json());

import * as userController from "./controllers/userController";
import * as imageController from "./controllers/imageController";
import * as quizController from "./controllers/quizController";
import * as participationController from "./controllers/participationController";

// User API Endpoints
app.post("/users", userController.createUser);
app.get("/users/:id", userController.getUser);
app.get("/users", userController.getUserByWalletAddress);
app.put("/users/:id", userController.updateUser);
app.delete("/users/:id", userController.deleteUser);

// Image API Endpoints
app.get("/image", imageController.getImage);

// Quiz API Endpoints
app.get("/latestQuiz", quizController.getLatestQuiz);
app.get("/activeQuiz", quizController.getActiveQuiz);
app.get("/quiz/:gameId", quizController.getQuizById);
app.post("/createGame", quizController.createGame);
app.put("/endGame/:gameId", quizController.endGame);

// Participation API Endpoints
app.post("/participation", participationController.createParticipant);

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({status: "OK", timestamp: new Date().toISOString()});
});

// Solana test endpoint
app.get("/test-solana", async (_req, res) => {
  try {
    const {getGameInfo} = require("./services/solanaService");
    const testGameId = "test-game-123";
    
    const gameInfo = await getGameInfo(testGameId);
    res.json({
      message: "Solana service test",
      gameId: testGameId,
      gameInfo: gameInfo,
      status: "OK"
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Solana service test failed", 
      error: error.message,
      status: "ERROR"
    });
  }
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`🚀 Development server running at http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`🎮 Active quiz: http://localhost:${PORT}/activeQuiz`);
});

export default app;
