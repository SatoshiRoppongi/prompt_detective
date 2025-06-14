
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
  betReturn: number;
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
  // 入力の正規化
  const normalizeText = (text: string): string => {
    return text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ") // 複数の空白を単一の空白に
      .replace(/[^\w\s\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g, ""); // 日本語文字とアルファベット、数字のみ残す
  };

  const normalizedGuess = normalizeText(guessPrompt);
  const normalizedSecret = normalizeText(secretPrompt);

  // 完全一致の場合は最高スコア
  if (normalizedGuess === normalizedSecret) {
    return 100;
  }

  // レーベンシュタイン距離を計算
  const levenshteinDistance = distance(normalizedGuess, normalizedSecret);
  const maxLength = Math.max(normalizedGuess.length, normalizedSecret.length);

  if (maxLength === 0) {
    return 100; // 両方の文字列が空の場合は完全一致とする
  }

  // 基本スコア計算
  let score = (1 - levenshteinDistance / maxLength) * 100;

  // 単語単位での一致率もチェック（ボーナススコア）
  const guessWords = normalizedGuess.split(" ").filter(word => word.length > 0);
  const secretWords = normalizedSecret.split(" ").filter(word => word.length > 0);
  
  if (guessWords.length > 0 && secretWords.length > 0) {
    let wordMatches = 0;
    for (const guessWord of guessWords) {
      if (secretWords.some(secretWord => 
        secretWord.includes(guessWord) || guessWord.includes(secretWord)
      )) {
        wordMatches++;
      }
    }
    const wordMatchRatio = wordMatches / Math.max(guessWords.length, secretWords.length);
    // 単語一致率に基づくボーナス（最大10点）
    const wordBonus = wordMatchRatio * 10;
    score = Math.min(100, score + wordBonus);
  }

  return Math.round(score * 100) / 100; // 小数点第2位まで
};
