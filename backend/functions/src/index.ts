/* eslint-disable max-len */
// index.ts
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import express from "express";
import cors from "cors";
import * as ServiceAccount from "./service_account.json";

// TODO: ウォレットのキーを利用したauth(firebase authenticationwを利用？)を検討する
// 検討内容：Beare tokenの変わりに、secret keyで検証する？


// Firebase Admin SDKの初期化
admin.initializeApp({
  credential: admin.credential.cert(ServiceAccount as admin.ServiceAccount),
});

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

// User API Endpoints
app.post("/users", userController.createUser);
app.get("/users/:id", userController.getUser);
app.get("/users", userController.getUserByWalletAddress);
app.put("/users/:id", userController.updateUser);
app.delete("/users/:id", userController.deleteUser);

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

// Game State API Endpoints
app.get("/gamestate/:quizId", gameStateController.getGameState);
app.post("/gamestate/:quizId/initialize", gameStateController.initializeGameState);
app.put("/gamestate/:quizId/update", gameStateController.updateGameState);
app.put("/gamestate/:quizId/transition", gameStateController.transitionPhase);
app.get("/gamestate", gameStateController.getActiveGameStates);
app.put("/gamestate/update-all", gameStateController.updateAllGameStates);
app.get("/gamestate/:quizId/history", gameStateController.getGameStateHistory);

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
import {scheduledQuizRoundHandler} from "./scheduled/quizRoundHandler";
exports.quizRoundHandler = scheduledQuizRoundHandler;

// Game state updater
import {scheduledGameStateUpdater} from "./scheduled/gameStateUpdater";
exports.gameStateUpdater = scheduledGameStateUpdater;

// import * as cleanup from "./scheduled/cleanup";
// exports.cleanupOldUsers = cleanup.cleanupOldUsers;
