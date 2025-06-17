/* eslint-disable max-len */
import * as admin from "firebase-admin";

const db = admin.firestore();
const usersCollection = db.collection("users");

export interface User {
  id?: string;
  name: string | null;
  walletAddress: string;
  email?: string;
  avatar?: string;
  bio?: string;
  stats?: UserStats;
  preferences?: UserPreferences;
  createdAt?: any;
  updatedAt?: any;
  lastLoginAt?: any;
}

export interface UserStats {
  totalQuizzes: number;
  totalWins: number;
  totalBets: number;
  totalWinnings: number;
  bestScore: number;
  averageScore: number;
  winRate: number;
  currentStreak: number;
  bestStreak: number;
  totalSpent: number;
  netProfit: number;
}

export interface UserPreferences {
  notifications: boolean;
  theme: "light" | "dark" | "auto";
  language: string;
  timezone: string;
  emailNotifications: boolean;
  soundEffects: boolean;
}

export interface QuizHistory {
  quizId: string;
  secretPrompt: string;
  guessPrompt: string;
  score: number;
  bet: number;
  winnings: number;
  rank: number;
  totalParticipants: number;
  createdAt: any;
  isWinner: boolean;
}

export interface UserProfile {
  user: User;
  stats: UserStats;
  recentHistory: QuizHistory[];
  achievements: Achievement[];
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: any;
  rarity: "common" | "rare" | "epic" | "legendary";
}

export const createUser = async (user: User): Promise<User> => {
  if (!user.name) {
    user.name = user.walletAddress;
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const userWithTimestamps = {
    ...user,
    stats: {
      totalQuizzes: 0,
      totalWins: 0,
      totalBets: 0,
      totalWinnings: 0,
      bestScore: 0,
      averageScore: 0,
      winRate: 0,
      currentStreak: 0,
      bestStreak: 0,
      totalSpent: 0,
      netProfit: 0,
    },
    preferences: {
      notifications: true,
      theme: "auto" as const,
      language: "ja",
      timezone: "Asia/Tokyo",
      emailNotifications: false,
      soundEffects: true,
    },
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
  };

  const docRef = await usersCollection.add(userWithTimestamps);
  return {id: docRef.id, ...userWithTimestamps};
};

export const getUser = async (id: string): Promise<User | null> => {
  const doc = await usersCollection.doc(id).get();
  if (!doc.exists) {
    return null;
  }
  return {id: doc.id, ...doc.data()} as User;
};

export const getUserByWalletAddress = async (walletAddress: string): Promise<User | null> => {
  console.log("test:", walletAddress);
  const snapshot = await usersCollection.where("walletAddress", "==", walletAddress).limit(1).get();
  if (snapshot.empty) {
    return null;
  }
  const doc = snapshot.docs[0];
  return {id: doc.id, ...doc.data()} as User;
};

export const updateUser = async (id: string, user: Partial<User>): Promise<void> => {
  const updateData = {
    ...user,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  await usersCollection.doc(id).update(updateData);
};

export const updateLastLogin = async (walletAddress: string): Promise<void> => {
  const user = await getUserByWalletAddress(walletAddress);
  if (user && user.id) {
    await usersCollection.doc(user.id).update({
      lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
};

export const deleteUser = async (id: string): Promise<void> => {
  await usersCollection.doc(id).delete();
};

export const getUserProfile = async (walletAddress: string): Promise<UserProfile | null> => {
  try {
    const user = await getUserByWalletAddress(walletAddress);
    if (!user || !user.id) {
      return null;
    }

    const stats = await calculateUserStats(user.id);
    const recentHistory = await getUserQuizHistory(user.id, 10);
    const achievements = await getUserAchievements(user.id);

    return {
      user: {
        ...user,
        stats,
      },
      stats,
      recentHistory,
      achievements,
    };
  } catch (error) {
    console.error("Error getting user profile:", error);
    return null;
  }
};

export const calculateUserStats = async (userId: string): Promise<UserStats> => {
  try {
    const user = await getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const participantsQuery = await db.collectionGroup("participants")
      .where("walletAddress", "==", user.walletAddress)
      .get();

    const participations = participantsQuery.docs.map((doc) => doc.data());

    const totalQuizzes = participations.length;
    const totalBets = participations.reduce((sum, p) => sum + (p.bet || 0), 0);
    const totalWinnings = participations.reduce((sum, p) => sum + (p.betReturn || 0), 0);
    const totalWins = participations.filter((p) => (p.betReturn || 0) > 0).length;
    const scores = participations.map((p) => p.score || 0);
    const bestScore = Math.max(...scores, 0);
    const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const winRate = totalQuizzes > 0 ? (totalWins / totalQuizzes) * 100 : 0;

    const {currentStreak, bestStreak} = calculateStreaks(participations);

    const totalSpent = totalBets;
    const netProfit = totalWinnings - totalSpent;

    return {
      totalQuizzes,
      totalWins,
      totalBets,
      totalWinnings,
      bestScore,
      averageScore,
      winRate,
      currentStreak,
      bestStreak,
      totalSpent,
      netProfit,
    };
  } catch (error) {
    console.error("Error calculating user stats:", error);
    return {
      totalQuizzes: 0,
      totalWins: 0,
      totalBets: 0,
      totalWinnings: 0,
      bestScore: 0,
      averageScore: 0,
      winRate: 0,
      currentStreak: 0,
      bestStreak: 0,
      totalSpent: 0,
      netProfit: 0,
    };
  }
};

export const getUserQuizHistory = async (userId: string, limit = 50): Promise<QuizHistory[]> => {
  try {
    const user = await getUser(userId);
    if (!user) {
      return [];
    }

    const participantsQuery = await db.collectionGroup("participants")
      .where("walletAddress", "==", user.walletAddress)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    const history: QuizHistory[] = [];

    for (const participantDoc of participantsQuery.docs) {
      const participation = participantDoc.data();
      const quizRef = participantDoc.ref.parent.parent;

      if (quizRef) {
        const quizDoc = await quizRef.get();
        const quizData = quizDoc.data();

        if (quizData) {
          const allParticipants = await quizRef.collection("participants").get();
          const participantsList = allParticipants.docs.map((doc) => doc.data());

          const sortedParticipants = participantsList.sort((a, b) => (b.score || 0) - (a.score || 0));
          const rank = sortedParticipants.findIndex((p) => p.walletAddress === user.walletAddress) + 1;

          history.push({
            quizId: quizDoc.id,
            secretPrompt: quizData.secretPrompt || "",
            guessPrompt: participation.guessPrompt || "",
            score: participation.score || 0,
            bet: participation.bet || 0,
            winnings: participation.betReturn || 0,
            rank,
            totalParticipants: participantsList.length,
            createdAt: participation.createdAt,
            isWinner: (participation.betReturn || 0) > 0,
          });
        }
      }
    }

    return history;
  } catch (error) {
    console.error("Error getting user quiz history:", error);
    return [];
  }
};

export const getUserAchievements = async (userId: string): Promise<Achievement[]> => {
  try {
    const user = await getUser(userId);
    if (!user) {
      return [];
    }

    const stats = await calculateUserStats(userId);
    const achievements: Achievement[] = [];

    if (stats.totalQuizzes >= 1) {
      achievements.push({
        id: "first_quiz",
        name: "初参加",
        description: "初めてクイズに参加しました",
        icon: "mdi-star",
        unlockedAt: admin.firestore.FieldValue.serverTimestamp(),
        rarity: "common",
      });
    }

    if (stats.totalQuizzes >= 10) {
      achievements.push({
        id: "quiz_veteran",
        name: "クイズベテラン",
        description: "10回のクイズに参加しました",
        icon: "mdi-trophy",
        unlockedAt: admin.firestore.FieldValue.serverTimestamp(),
        rarity: "rare",
      });
    }

    if (stats.totalWins >= 1) {
      achievements.push({
        id: "first_win",
        name: "初勝利",
        description: "初めてクイズに勝利しました",
        icon: "mdi-medal",
        unlockedAt: admin.firestore.FieldValue.serverTimestamp(),
        rarity: "common",
      });
    }

    if (stats.bestStreak >= 3) {
      achievements.push({
        id: "streak_master",
        name: "連勝マスター",
        description: "3連勝を達成しました",
        icon: "mdi-fire",
        unlockedAt: admin.firestore.FieldValue.serverTimestamp(),
        rarity: "epic",
      });
    }

    if (stats.bestScore >= 90) {
      achievements.push({
        id: "perfect_guesser",
        name: "完璧な推理",
        description: "90点以上を獲得しました",
        icon: "mdi-bullseye",
        unlockedAt: admin.firestore.FieldValue.serverTimestamp(),
        rarity: "legendary",
      });
    }

    return achievements;
  } catch (error) {
    console.error("Error getting user achievements:", error);
    return [];
  }
};

const calculateStreaks = (participations: any[]): { currentStreak: number; bestStreak: number } => {
  if (participations.length === 0) {
    return {currentStreak: 0, bestStreak: 0};
  }

  const sortedParticipations = participations
    .sort((a, b) => (b.createdAt?.toDate?.() || new Date(b.createdAt)) - (a.createdAt?.toDate?.() || new Date(a.createdAt)));

  let currentStreak = 0;
  let bestStreak = 0;
  let tempStreak = 0;

  for (let i = 0; i < sortedParticipations.length; i++) {
    const isWin = (sortedParticipations[i].betReturn || 0) > 0;

    if (isWin) {
      tempStreak++;
      if (i === 0) {
        currentStreak = tempStreak;
      }
    } else {
      if (i === 0) {
        currentStreak = 0;
      }
      tempStreak = 0;
    }

    bestStreak = Math.max(bestStreak, tempStreak);
  }

  return {currentStreak, bestStreak};
};
