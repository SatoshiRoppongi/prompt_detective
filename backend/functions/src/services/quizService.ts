/* eslint-disable max-len */
import * as admin from "firebase-admin";
import {FieldValue} from "firebase-admin/firestore";
import {Participant} from "./participationService";

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
  participants: Array<Participant>

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
    const quizQuerySnapshot = await quizzesCollection
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();
    if (quizQuerySnapshot.empty) {
      console.log("No matching quizzes.");
      return null;
    }

    const doc = quizQuerySnapshot.docs[0];
    console.log("doc:", doc);
    // サブコレクションの参照を取得
    const participantsRef = doc.ref.collection("participants");

    // サブコレクションのドキュメントを取得
    const participantSnapshot = await participantsRef.get();

    if (participantSnapshot.empty) {
      console.log("No matching participants");
      return null;
    }

    const participants = participantSnapshot.docs.map((participantDoc) => participantDoc.data());

    //
    return {id: doc.id, ...doc.data(), participants: participants} as Quiz;
  } catch (error) {
    console.error("Error getting latest document:", error);
    return null;
  }
};
