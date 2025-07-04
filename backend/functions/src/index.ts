/* eslint-disable max-len */
// index.ts
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import express from "express";
import cors from "cors";

// TODO: ウォレットのキーを利用したauth(firebase authenticationwを利用？)を検討する
// 検討内容：Beare tokenの変わりに、secret keyで検証する？

// Firebase Admin SDKの初期化
// Firebase Functions環境では自動的に認証される
admin.initializeApp();

const app = express();
app.use(cors({origin: true}));

import * as userController from "./controllers/userController";
import * as imageController from "./controllers/imageController";
import * as quizController from "./controllers/quizController";
import * as participationController from "./controllers/participationController";
import * as leaderboardController from "./controllers/leaderboardController";
import * as resultController from "./controllers/resultController";
import * as distributionController from "./controllers/distributionController";
import * as gameStateController from "./controllers/gameStateController";
import * as securityController from "./controllers/securityController";
import * as adminController from "./controllers/adminController";

// User API Endpoints
app.post("/users", userController.createUser);
app.get("/users/:id", userController.getUser);
app.get("/users", userController.getUserByWalletAddress);
app.put("/users/:id", userController.updateUser);
app.delete("/users/:id", userController.deleteUser);

// User Profile API Endpoints
app.get("/users/:walletAddress/profile", userController.getUserProfile);
app.get("/users/:walletAddress/stats", userController.getUserStats);
app.get("/users/:walletAddress/history", userController.getUserHistory);
app.get("/users/:walletAddress/achievements", userController.getUserAchievements);
app.put("/users/:walletAddress/preferences", userController.updateUserPreferences);
app.post("/users/login", userController.updateLastLogin);

// Image API Endpoints
app.get("/image", imageController.getImage);
app.post("/images/generate", imageController.generateImage);
app.post("/images/:imageId/upload", imageController.uploadImage);
app.post("/images/optimize-prompt", imageController.optimizePrompt);
app.post("/images/random-prompt", imageController.generateRandomPrompt);
app.get("/images/:imageId", imageController.getImageDetails);
app.get("/images", imageController.getImageHistory);
app.get("/images/stats/overview", imageController.getImageStats);

// Quiz API Endpoints
app.get("/latestQuiz", quizController.getLatestQuiz);
app.get("/activeQuiz", quizController.getActiveQuiz);
app.get("/quiz/:gameId", quizController.getQuizById);
app.post("/createGame", quizController.createGame);
app.put("/endGame/:gameId", quizController.endGame);

// Participation API Endpoints
app.post("/participation", participationController.createParticipant);

// Leaderboard API Endpoints
app.get("/leaderboard/:quizId", leaderboardController.getLeaderboard);
app.get("/leaderboard/:quizId/rank", leaderboardController.getUserRank);

// Result API Endpoints
app.get("/results/:quizId", resultController.getQuizResult);
app.get("/results", resultController.getQuizResultHistory);
app.post("/results/:quizId/calculate", resultController.calculateQuizResult);
app.put("/results/:quizId/distribution", resultController.updateDistributionStatus);
app.get("/statistics", resultController.getQuizStatistics);

// Distribution API Endpoints
app.get("/distributions/:quizId", distributionController.getDistributionHistory);
app.get("/distributions", distributionController.getAllDistributionHistory);
app.post("/distributions/:quizId/execute", distributionController.manualDistribution);
app.post("/distributions/pending", distributionController.distributePendingPrizes);
app.get("/treasury/stats", distributionController.getTreasuryStats);
app.get("/distributions/health", distributionController.getDistributionHealth);

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({
    success: true,
    message: "API is running",
    timestamp: new Date().toISOString(),
  });
});

// Game State API Endpoints
app.get("/gamestate/:quizId", gameStateController.getGameState);
app.post("/gamestate/:quizId/initialize", gameStateController.initializeGameState);
app.put("/gamestate/:quizId/update", gameStateController.updateGameState);
app.put("/gamestate/:quizId/transition", gameStateController.transitionPhase);
app.get("/gamestate", gameStateController.getActiveGameStates);
app.put("/gamestate/update-all", gameStateController.updateAllGameStates);
app.get("/gamestate/:quizId/history", gameStateController.getGameStateHistory);

// Security API Endpoints
app.use(securityController.securityMiddleware);
app.post("/security/log", securityController.logSecurityEvent);
app.post("/security/ratelimit", securityController.checkRateLimit);
app.post("/security/validate", securityController.validateQuizSubmission);
app.post("/security/ban/:walletAddress", securityController.banUser);
app.get("/security/ban/:walletAddress", securityController.checkUserBanned);
app.get("/security/stats", securityController.getSecurityStats);
app.post("/security/token", securityController.generateSecureToken);

// Admin API Endpoints
app.get("/admin/system/status", adminController.getSystemStatus);
app.get("/admin/scheduler/config", adminController.getSchedulerStatus);
app.put("/admin/scheduler/config", adminController.updateSchedulerSettings);
app.post("/admin/scheduler/toggle", adminController.toggleScheduler);
app.post("/admin/scheduler/run", adminController.runSchedulerManually);
app.get("/admin/scheduler/history", adminController.getSchedulerHistory);

// OpenAI API Control Endpoints
app.post("/admin/openai/toggle", adminController.toggleOpenAIAPI);
app.post("/admin/generation/toggle", adminController.toggleAutoGameGeneration);
app.put("/admin/images/limit", adminController.updateDailyImageLimit);
app.post("/admin/images/reset", adminController.resetDailyImageCounter);
app.get("/admin/images/status", adminController.getImageGenerationStatus);

// Emergency Game Management
app.post("/admin/games/emergency", adminController.createEmergencyGame);

// Apply rate limiting to critical endpoints
app.use("/participation", securityController.rateLimitMiddleware("quiz_participation"));

// TODO: cloud storageから画像を格納、取得するエンドポイントを追加する

exports.api = functions.https.onRequest(app);

// Scheduled Functions

// 結果の計算 & 分配Transactionの作成と送信
// TODO: to be implemented
/*
import * as sendTransaction from "./scheduled/sendTransaction";
exports.scheduledDistributes = sendTransaction.scheduledDistributes;
*/

// secret promptとimageの生成
// TODO: to be implemented
// Temporarily disabled due to Cloud Scheduler permissions
/*
import {scheduledQuizRoundHandler} from "./scheduled/quizRoundHandler";
exports.quizRoundHandler = scheduledQuizRoundHandler;

// Game state updater
import {scheduledGameStateUpdater} from "./scheduled/gameStateUpdater";
exports.gameStateUpdater = scheduledGameStateUpdater;
*/

// import * as cleanup from "./scheduled/cleanup";
// exports.cleanupOldUsers = cleanup.cleanupOldUsers;
