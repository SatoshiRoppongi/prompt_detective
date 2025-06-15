/* eslint-disable max-len */
// Development server for local testing
import * as admin from "firebase-admin";
import express from "express";
import cors from "cors";
import * as dotenv from "dotenv";
import { createServer } from "http";

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

import * as userController from "./controllers/userController";
import * as imageController from "./controllers/imageController";
import * as quizController from "./controllers/quizController";
import * as participationController from "./controllers/participationController";
import * as adminController from "./controllers/adminController";
import {errorHandler} from "./middleware/errorHandler";
import {validateCreateGame, validateParticipation, validateGameId} from "./middleware/validation";
import {optionalAuth, requireAdmin} from "./middleware/auth";
import {generalRateLimit, participationRateLimit, gameCreationRateLimit} from "./middleware/rateLimit";
import {initializeWebSocket} from "./services/realtimeService";

const app = express();
app.use(cors({origin: true}));
app.use(express.json());

// Apply general rate limiting to all endpoints
app.use(generalRateLimit);

// User API Endpoints
app.post("/users", userController.createUser);
app.get("/users/:id", userController.getUser);
app.get("/users", userController.getUserByWalletAddress);
app.put("/users/:id", userController.updateUser);
app.delete("/users/:id", userController.deleteUser);

// Image API Endpoints
app.get("/image", imageController.getImage);

// Quiz API Endpoints
app.get("/latestQuiz", optionalAuth, quizController.getLatestQuiz);
app.get("/activeQuiz", optionalAuth, quizController.getActiveQuiz);
app.get("/quiz/:gameId", optionalAuth, validateGameId, quizController.getQuizById);
app.post("/createGame", gameCreationRateLimit, requireAdmin, validateCreateGame, quizController.createGame);
app.put("/endGame/:gameId", requireAdmin, validateGameId, quizController.endGame);

// Participation API Endpoints
app.post("/participation", participationRateLimit, validateParticipation, participationController.createParticipant);

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({status: "OK", timestamp: new Date().toISOString()});
});

// Admin endpoints 
app.get("/admin/status", requireAdmin, adminController.getSystemStatus);
app.get("/admin/games", requireAdmin, adminController.getActiveGames);
app.get("/admin/games/:gameId", requireAdmin, adminController.getGameDetails);
app.post("/admin/games/end", requireAdmin, adminController.forceEndGame);
app.post("/admin/games/extend", requireAdmin, adminController.extendGame);
app.post("/admin/games/emergency", requireAdmin, adminController.createEmergencyGame);

// Scheduler management endpoints
app.get("/admin/scheduler/status", requireAdmin, adminController.getSchedulerStatus);
app.put("/admin/scheduler/settings", requireAdmin, adminController.updateSchedulerSettings);
app.post("/admin/scheduler/toggle", requireAdmin, adminController.toggleScheduler);
app.get("/admin/scheduler/history", requireAdmin, adminController.getSchedulerHistory);
app.post("/admin/scheduler/run", requireAdmin, adminController.runSchedulerManually);

// Legacy admin endpoints (development only)
app.post("/admin/createGame", gameCreationRateLimit, validateCreateGame, quizController.createGame);
app.put("/admin/endGame/:gameId", validateGameId, quizController.endGame);

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

// Error handling middleware (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5001;

// Create HTTP server and initialize WebSocket
const server = createServer(app);
initializeWebSocket(server);

server.listen(PORT, () => {
  console.log(`🚀 Development server running at http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`🎮 Active quiz: http://localhost:${PORT}/activeQuiz`);
  console.log(`⚡ WebSocket server initialized for real-time updates`);
});

export default app;
