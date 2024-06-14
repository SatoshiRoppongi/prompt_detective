// 古いユーザを定期的に削除する処理（スケジュール実行のサンプル）
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();

export const cleanupOldUsers = functions.pubsub
  .schedule("every 24 hours")
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    const cutoff = now.toMillis() - 30 * 24 * 60 * 60 * 1000; // 30 days ago
    const oldUsersQuery = db
      .collection("users")
      .where("createdAt", "<", cutoff);

    const batch = db.batch();
    const oldUsersSnapshot = await oldUsersQuery.get();
    oldUsersSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log("Deleted old users successfully.");
    return null;
  });
