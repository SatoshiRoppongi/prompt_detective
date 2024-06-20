
/* eslint-disable max-len */
import * as admin from "firebase-admin";
import {FieldValue} from "firebase-admin/firestore";
import {distance} from "fastest-levenshtein";

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


      const quizData = quizDoc.data() as Quiz;

      const participantScore = await calculateScore(guessPrompt, quizData.secretPrompt);
      const newPot = quizData.pot + bet;

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
        pot: newPot,
      });

      console.log(`Participant added with ID: ${newParticipantRef.id}`);
      console.log(`Total Participants: ${newTotalParticipants}`);
      console.log(`Average Score: ${newAverageScore}`);
    });
  } catch (e) {
    console.error("Transaction failed: ", e);
  }
};

const calculateScore = async (guessPrompt: string, secretPrompt: string): Promise<number> => {
  // (ユーザ)推測文字列と、正解(秘密)文字列のレーベンシュタイン距離を計算
  // TODO: 文字列類似度を測るアルゴリズムはこれで問題ないか。きたるタイミングで要検討
  // また、免責事項として、レーベンシュタイン距離を用いている旨を、サイトに記載する

  const levenshteinDistance = distance(guessPrompt, secretPrompt);

  // 距離を、一致率（類似度）に変換するために正規化を行う
  const maxLength = Math.max(guessPrompt.length, secretPrompt.length);

  if (maxLength === 0) {
    return 100; // 両方の文字列がからの場合は完全一致とする
  }

  const score = (1 - levenshteinDistance / maxLength) * 100;

  return score;
};
