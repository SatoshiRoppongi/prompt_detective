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

// import * as cleanup from "./scheduled/cleanup";
// exports.cleanupOldUsers = cleanup.cleanupOldUsers;
