// index.ts
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as express from "express";
import * as cors from "cors";
import * as ServiceAccount from "./service_account.json";

// Firebase Admin SDKの初期化
admin.initializeApp({
  credential: admin.credential.cert(ServiceAccount as admin.ServiceAccount),
});
// const db = admin.firestore();
// const storage = admin.storage().bucket();

const app = express();
app.use(cors({origin: true}));

import * as userController from "./controllers/userController";
import * as imageController from "./controllers/imageController";

// User API Endpoints
app.post("/users", userController.createUser);
app.get("/users/:id", userController.getUser);
app.put("/users/:id", userController.updateUser);
app.delete("/users/:id", userController.deleteUser);

// Image API Endpoints
app.get("/image", imageController.getImage);

// TODO: cloud storageから画像を格納、取得するエンドポイントを追加する

exports.api = functions.https.onRequest(app);

// Scheduled Functions

// 結果の計算 & 分配Transactionの作成と送信
// TODO: to be implemented
/*
import * as sendTransaction from "./scheduled/sendTransaction";
exports.scheduledSetScores = sendTransaction.scheduledSetScores;
*/

// secret promptとimageの生成
// TODO: to be implemented
/*
import * as generateImage from "./scheduled/generateImage";
exports.generateImage = generateImage.generateImage;
*/

// import * as cleanup from "./scheduled/cleanup";
// exports.cleanupOldUsers = cleanup.cleanupOldUsers;
