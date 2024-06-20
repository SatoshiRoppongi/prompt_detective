/* eslint-disable max-len */
import * as admin from "firebase-admin";
import {FieldValue} from "firebase-admin/firestore";

const db = admin.firestore();
const quizzesCollection = db.collection("quizzes");

export interface Quiz {
  id?: string;
  imageName: string | null;
  secretPrompt: string;
  totalParticipants: number;
  averageScore: number;
  pot: number; // poolの方がいい？
  createdAt: FieldValue;

    // todo: 必要なら他の問題情報を定義
}

export const createQuiz = async (quiz: Quiz): Promise<void> => {
  // 一旦quiz.id = documentのキーとする
  const key = quiz.id;
  if (!key) {
    return;
  }
  await quizzesCollection.doc(key).set(
    quiz
  );
  return;
};

export const getLatestQuiz = async (): Promise<Quiz | null>=> {
  try {
    const querySnapshot = await quizzesCollection
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();
    if (querySnapshot.empty) {
      console.log("No matching quizzes.");
      return null;
    }

    const doc = querySnapshot.docs[0];
    console.log("doc:", doc);
    return {id: doc.id, ...doc.data()} as Quiz;
  } catch (error) {
    console.error("Error getting latest document:", error);
    return null;
  }
};
