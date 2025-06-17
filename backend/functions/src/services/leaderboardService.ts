import * as admin from "firebase-admin";

const db = admin.firestore();

export interface LeaderboardEntry {
  rank: number;
  walletAddress: string;
  score: number;
  bet: number;
  guessPrompt: string;
  submissionTime: string;
  isCurrentUser?: boolean;
}

export interface LeaderboardData {
  entries: LeaderboardEntry[];
  totalParticipants: number;
  averageScore: number;
  topScore: number;
  userRank?: number;
}

/**
 * クイズの現在のリーダーボードを取得
 */
export const getLeaderboard = async (
  quizId: string,
  limit = 10,
  userWalletAddress?: string
): Promise<LeaderboardData> => {
  try {
    const quizRef = db.collection("quizzes").doc(quizId);
    const participantsRef = quizRef.collection("participants");

    // スコア順（降順）で参加者を取得
    // NOTE: Firestoreエミュレータでは複合インデックスが必要ないため、シンプルなクエリに変更
    const snapshot = await participantsRef
      .orderBy("score", "desc")
      .get();

    const allParticipants = snapshot.docs.map((doc, index) => {
      const data = doc.data();
      return {
        rank: index + 1,
        walletAddress: data.walletAddress,
        score: data.score || 0,
        bet: data.bet || 0,
        guessPrompt: data.guessPrompt || "",
        submissionTime: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        isCurrentUser: userWalletAddress === data.walletAddress,
      } as LeaderboardEntry;
    });

    // 統計情報を計算
    const totalParticipants = allParticipants.length;
    const averageScore = totalParticipants > 0 ?
      allParticipants.reduce((sum, p) => sum + p.score, 0) / totalParticipants :
      0;
    const topScore = totalParticipants > 0 ? allParticipants[0].score : 0;

    // ユーザーのランキング
    const userRank = userWalletAddress ?
      allParticipants.findIndex((p) => p.walletAddress === userWalletAddress) + 1 :
      undefined;

    // 上位N件を取得（ただし、ユーザーが圏外の場合は含める）
    const topEntries = allParticipants.slice(0, limit);

    // ユーザーが上位に入っていない場合、ユーザーの情報を追加
    if (userWalletAddress && userRank && userRank > limit) {
      const userEntry = allParticipants.find((p) => p.walletAddress === userWalletAddress);
      if (userEntry) {
        topEntries.push({
          ...userEntry,
          rank: userRank,
        });
      }
    }

    return {
      entries: topEntries,
      totalParticipants,
      averageScore: Math.round(averageScore * 100) / 100,
      topScore,
      userRank: userRank || undefined,
    };
  } catch (error) {
    console.error("Error getting leaderboard:", error);
    throw new Error("Failed to get leaderboard");
  }
};

/**
 * リアルタイムリーダーボード更新のリスナーを設定
 */
export const setupLeaderboardListener = (
  quizId: string,
  callback: (leaderboard: LeaderboardData) => void,
  userWalletAddress?: string
) => {
  const quizRef = db.collection("quizzes").doc(quizId);
  const participantsRef = quizRef.collection("participants");

  return participantsRef
    .orderBy("score", "desc")
    .onSnapshot(async (snapshot) => {
      try {
        const leaderboard = await getLeaderboard(quizId, 10, userWalletAddress);
        callback(leaderboard);
      } catch (error) {
        console.error("Error in leaderboard listener:", error);
      }
    });
};

/**
 * ユーザーの現在のランキング位置を取得
 */
export const getUserRank = async (quizId: string, walletAddress: string): Promise<number | null> => {
  try {
    const quizRef = db.collection("quizzes").doc(quizId);
    const participantsRef = quizRef.collection("participants");

    // 自分より高いスコアの参加者数を数える
    const userSnapshot = await participantsRef
      .where("walletAddress", "==", walletAddress)
      .get();

    if (userSnapshot.empty) {
      return null;
    }

    const userData = userSnapshot.docs[0].data();
    const userScore = userData.score || 0;
    const userTime = userData.createdAt;

    // 自分より高いスコア、または同じスコアで早い投稿の参加者数
    const higherScoreSnapshot = await participantsRef
      .where("score", ">", userScore)
      .get();

    const sameScoreEarlierSnapshot = await participantsRef
      .where("score", "==", userScore)
      .where("createdAt", "<", userTime)
      .get();

    return higherScoreSnapshot.size + sameScoreEarlierSnapshot.size + 1;
  } catch (error) {
    console.error("Error getting user rank:", error);
    return null;
  }
};
