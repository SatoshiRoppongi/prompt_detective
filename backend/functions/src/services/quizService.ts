/* eslint-disable max-len */
import * as admin from "firebase-admin";
import {FieldValue} from "firebase-admin/firestore";
import {Participant} from "./participationService";

const db = admin.firestore();
const quizzesCollection = db.collection("quizzes");

export enum GameStatus {
  WAITING = "waiting",
  ACTIVE = "active",
  ENDED = "ended",
  COMPLETED = "completed",
  CANCELLED = "cancelled"
}

export interface Quiz {
  id?: string;
  imageName: string | null;
  secretPrompt: string;
  totalParticipants: number;
  averageScore: number;
  pot: number;
  status: GameStatus;
  minBet: number;
  maxParticipants: number;
  endTime: FieldValue | Date;
  createdAt: FieldValue;
  winner?: string;
  winnerScore?: number;
}

export interface QuizWithParticipant extends Quiz {
  participants: Array<Participant>
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

export const getLatestQuiz = async (): Promise<QuizWithParticipant | null>=> {
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

    const participants = participantSnapshot.docs.map((participantDoc) => participantDoc.data());

    //
    return {id: doc.id, ...doc.data(), participants: participants} as QuizWithParticipant;
  } catch (error) {
    console.error("Error getting latest document:", error);
    return null;
  }
};

export const getActiveQuiz = async (): Promise<QuizWithParticipant | null> => {
  try {
    // Get the latest quiz and check if it's active
    const latestQuiz = await getLatestQuiz();

    if (!latestQuiz) {
      console.log("No quizzes found.");
      return null;
    }

    if (latestQuiz.status === GameStatus.ACTIVE) {
      console.log("Active quiz found:", latestQuiz.id);
      return latestQuiz;
    }

    console.log("Latest quiz is not active, status:", latestQuiz.status);
    return null;
  } catch (error) {
    console.error("Error getting active quiz:", error);
    return null;
  }
};

export const getQuizWithParticipants = async (quizId: string): Promise<QuizWithParticipant | null> => {
  try {
    const quizDoc = await quizzesCollection.doc(quizId).get();

    if (!quizDoc.exists) {
      console.log("Quiz not found:", quizId);
      return null;
    }

    // Get participants for this quiz
    const participantsSnapshot = await quizDoc.ref.collection("participants").get();
    const participants: Participant[] = participantsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        walletAddress: data.walletAddress,
        guessPrompt: data.guessPrompt,
        score: data.score || 0,
        bet: data.bet || 0,
        betReturn: data.betReturn || 0,
        createdAt: data.createdAt,
        submissionTime: data.submissionTime,
      } as Participant;
    });

    const quizData = quizDoc.data() as Quiz;
    return {
      id: quizDoc.id,
      ...quizData,
      participants: participants,
    } as QuizWithParticipant;
  } catch (error) {
    console.error("Error getting quiz with participants:", error);
    return null;
  }
};

export const createGameFromGeneration = async (
  secretPrompt: string,
  imageName: string,
  gameId: string,
  minBet = 100000000, // 0.1 SOL in lamports
  maxParticipants = 100,
  durationHours = 24
): Promise<void> => {
  const now = new Date();
  const endTime = new Date(now.getTime() + durationHours * 60 * 60 * 1000);

  const quiz: Quiz = {
    id: gameId,
    imageName: imageName,
    secretPrompt: secretPrompt,
    totalParticipants: 0,
    averageScore: 0,
    pot: 0,
    status: GameStatus.ACTIVE,
    minBet: minBet,
    maxParticipants: maxParticipants,
    endTime: endTime,
    createdAt: FieldValue.serverTimestamp(),
  };

  await quizzesCollection.doc(gameId).set(quiz);
  console.log(`Game created with ID: ${gameId}`);
};

export const endGame = async (gameId: string): Promise<void> => {
  await quizzesCollection.doc(gameId).update({
    status: GameStatus.ENDED,
  });
  console.log(`Game ${gameId} ended`);
};

export const completeGame = async (
  gameId: string,
  winner: string,
  winnerScore: number
): Promise<void> => {
  await quizzesCollection.doc(gameId).update({
    status: GameStatus.COMPLETED,
    winner: winner,
    winnerScore: winnerScore,
  });
  console.log(`Game ${gameId} completed with winner ${winner}`);
};

export const getQuizById = async (gameId: string): Promise<QuizWithParticipant | null> => {
  try {
    const doc = await quizzesCollection.doc(gameId).get();

    if (!doc.exists) {
      console.log("Quiz not found");
      return null;
    }

    const participantsRef = doc.ref.collection("participants");
    const participantSnapshot = await participantsRef.get();
    const participants = participantSnapshot.docs.map((participantDoc) => participantDoc.data());

    return {id: doc.id, ...doc.data(), participants: participants} as QuizWithParticipant;
  } catch (error) {
    console.error("Error getting quiz by ID:", error);
    return null;
  }
};
