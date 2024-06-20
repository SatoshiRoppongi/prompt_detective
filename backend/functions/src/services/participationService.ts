
/* eslint-disable max-len */
import * as admin from "firebase-admin";
import {FieldValue} from "firebase-admin/firestore";

const db = admin.firestore();
const quizzesCollection = db.collection("quizzes");

import {Quiz} from "../services/quizService";


export interface Participant {
  // id?: string;
  walletAddress: string;
  guessPrompt: string;
  score: number; // similarityの方がいいか？
  bet: number;
  createdAt: FieldValue;
}

export const createParticipant = async (
  quizId: string,
  walletAddress: string,
  guessPrompt: string,
  bet: number
): Promise<void> => {
  try {
    const quizDocRef = quizzesCollection.doc(quizId);
    const participantsColRef = quizDocRef.collection("participants");

    await db.runTransaction(async (transaction) => {
      const quizDoc = await transaction.get(quizDocRef);

      if (!quizDoc.exists) {
        throw new Error("Quiz document does not exist!");
      }

      const participantScore = await calculateScore(guessPrompt);

      const quizData = quizDoc.data() as Quiz;
      const newTotalParticipants = quizData.totalParticipants + 1;
      const newAverageScore = ((quizData.averageScore * quizData.totalParticipants) + participantScore) / newTotalParticipants;

      // 参加者を追加
      const newParticipantRef = participantsColRef.doc();
      transaction.set(newParticipantRef, {
        walletAddress,
        guessPrompt,
        score: participantScore,
        bet,
        createdAt: FieldValue.serverTimestamp(),
      });

      // クイズの統計情報を更新
      transaction.update(quizDocRef, {
        totalParticipants: newTotalParticipants,
        averageScore: newAverageScore,
      });

      console.log(`Participant added with ID: ${newParticipantRef.id}`);
      console.log(`Total Participants: ${newTotalParticipants}`);
      console.log(`Average Score: ${newAverageScore}`);
    });
  } catch (e) {
    console.error("Transaction failed: ", e);
  }
};

const calculateScore = async (guessPrompt: string): Promise<number> => {
  // TODO; guessPromptとsecretPromptの文字列類似度を測ってスコアを計算する
  const score = 50;
  return score;
};
