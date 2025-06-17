import * as admin from "firebase-admin";
import { QuizWithParticipant } from "./quizService";
import { Participant } from "./participationService";

const db = admin.firestore();

export interface QuizResult {
  quizId: string;
  winners: Winner[];
  totalParticipants: number;
  totalPot: number;
  averageScore: number;
  topScore: number;
  distributionDetails: DistributionDetail[];
  calculatedAt: Date;
  status: 'calculated' | 'distributed' | 'failed';
}

export interface Winner {
  walletAddress: string;
  rank: number;
  score: number;
  prize: number;
  percentage: number;
}

export interface DistributionDetail {
  walletAddress: string;
  amount: number;
  type: 'prize' | 'platform_fee' | 'runner_up';
  rank?: number;
}

/**
 * クイズの最終結果を自動計算する
 */
export const calculateQuizResults = async (
  quiz: QuizWithParticipant
): Promise<QuizResult> => {
  try {
    console.log(`📊 Calculating results for quiz: ${quiz.id}`);
    
    if (!quiz.participants || quiz.participants.length === 0) {
      throw new Error('No participants found for quiz');
    }

    // 参加者をスコア順でソート（降順）
    const sortedParticipants = [...quiz.participants].sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      // 同じスコアの場合は投稿時間順（早い順）
      const aTime = a.createdAt && typeof a.createdAt === 'object' && 'toDate' in a.createdAt 
        ? (a.createdAt as any).toDate().getTime() 
        : new Date(a.createdAt as any).getTime() || 0;
      const bTime = b.createdAt && typeof b.createdAt === 'object' && 'toDate' in b.createdAt 
        ? (b.createdAt as any).toDate().getTime() 
        : new Date(b.createdAt as any).getTime() || 0;
      return aTime - bTime;
    });

    // 統計情報を計算
    const totalParticipants = sortedParticipants.length;
    const totalPot = quiz.pot;
    const totalScores = sortedParticipants.reduce((sum, p) => sum + p.score, 0);
    const averageScore = totalScores / totalParticipants;
    const topScore = sortedParticipants[0].score;

    // 勝者を決定（同率1位の場合は複数勝者）
    const winners = determineWinners(sortedParticipants, totalPot);
    
    // 分配詳細を計算
    const distributionDetails = calculateDistribution(winners, totalPot);

    const result: QuizResult = {
      quizId: quiz.id || '',
      winners,
      totalParticipants,
      totalPot,
      averageScore: Math.round(averageScore * 100) / 100,
      topScore,
      distributionDetails,
      calculatedAt: new Date(),
      status: 'calculated'
    };

    // 結果をFirestoreに保存
    await saveQuizResult(result);
    
    console.log(`✅ Quiz results calculated successfully for ${quiz.id}`);
    console.log(`🏆 Winners: ${winners.length}, Total prize: ${totalPot} SOL`);
    
    return result;

  } catch (error) {
    console.error('Error calculating quiz results:', error);
    throw new Error(`Failed to calculate quiz results: ${error}`);
  }
};

/**
 * 勝者を決定する（同率1位の場合は賞金を分割）
 */
const determineWinners = (sortedParticipants: Participant[], totalPot: number): Winner[] => {
  if (sortedParticipants.length === 0) {
    return [];
  }

  const topScore = sortedParticipants[0].score;
  const topScorers = sortedParticipants.filter(p => p.score === topScore);
  
  // 同率1位の場合は賞金を分割
  const platformFeeRate = 0.05; // 5%のプラットフォーム手数料
  const prizePool = totalPot * (1 - platformFeeRate);
  const prizePerWinner = prizePool / topScorers.length;
  const percentagePerWinner = (prizePerWinner / totalPot) * 100;

  return topScorers.map((participant, index) => ({
    walletAddress: participant.walletAddress,
    rank: 1,
    score: participant.score,
    prize: Math.round(prizePerWinner * 1000000000), // Convert to lamports
    percentage: Math.round(percentagePerWinner * 100) / 100
  }));
};

/**
 * 賞金分配の詳細を計算する
 */
const calculateDistribution = (winners: Winner[], totalPot: number): DistributionDetail[] => {
  const details: DistributionDetail[] = [];
  
  // 勝者への賞金
  winners.forEach(winner => {
    details.push({
      walletAddress: winner.walletAddress,
      amount: winner.prize,
      type: 'prize',
      rank: winner.rank
    });
  });

  // プラットフォーム手数料
  const totalPrizeAmount = winners.reduce((sum, w) => sum + w.prize, 0);
  const platformFee = (totalPot * 1000000000) - totalPrizeAmount; // Convert to lamports
  
  if (platformFee > 0) {
    details.push({
      walletAddress: 'platform',
      amount: platformFee,
      type: 'platform_fee'
    });
  }

  return details;
};

/**
 * クイズ結果をFirestoreに保存
 */
const saveQuizResult = async (result: QuizResult): Promise<void> => {
  try {
    const resultRef = db.collection('quiz_results').doc(result.quizId);
    
    await resultRef.set({
      ...result,
      calculatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // クイズドキュメントにも結果の参照を追加
    const quizRef = db.collection('quizzes').doc(result.quizId);
    await quizRef.update({
      resultCalculated: true,
      resultId: result.quizId,
      winners: result.winners.map(w => w.walletAddress),
      finalStatus: 'calculated'
    });

    console.log(`📊 Quiz result saved to Firestore for quiz: ${result.quizId}`);
    
  } catch (error) {
    console.error('Error saving quiz result:', error);
    throw new Error(`Failed to save quiz result: ${error}`);
  }
};

/**
 * 保存されたクイズ結果を取得
 */
export const getQuizResult = async (quizId: string): Promise<QuizResult | null> => {
  try {
    const resultRef = db.collection('quiz_results').doc(quizId);
    const doc = await resultRef.get();
    
    if (!doc.exists) {
      return null;
    }

    return doc.data() as QuizResult;
    
  } catch (error) {
    console.error('Error getting quiz result:', error);
    return null;
  }
};

/**
 * 結果分配のステータスを更新
 */
export const updateDistributionStatus = async (
  quizId: string, 
  status: 'distributed' | 'failed',
  error?: string
): Promise<void> => {
  try {
    const resultRef = db.collection('quiz_results').doc(quizId);
    
    const updateData: any = {
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    if (error) {
      updateData.distributionError = error;
    }

    await resultRef.update(updateData);
    
    console.log(`📊 Distribution status updated for quiz ${quizId}: ${status}`);
    
  } catch (error) {
    console.error('Error updating distribution status:', error);
    throw new Error(`Failed to update distribution status: ${error}`);
  }
};

/**
 * 過去のクイズ結果を取得（ページネーション対応）
 */
export const getQuizResultHistory = async (
  limit: number = 10,
  lastResultId?: string
): Promise<{ results: QuizResult[], hasMore: boolean }> => {
  try {
    let query = db.collection('quiz_results')
      .orderBy('calculatedAt', 'desc')
      .limit(limit + 1); // +1 to check if there are more results

    if (lastResultId) {
      const lastDoc = await db.collection('quiz_results').doc(lastResultId).get();
      if (lastDoc.exists) {
        query = query.startAfter(lastDoc);
      }
    }

    const snapshot = await query.get();
    const results = snapshot.docs.slice(0, limit).map(doc => ({
      ...doc.data(),
      quizId: doc.id
    } as QuizResult));

    const hasMore = snapshot.docs.length > limit;

    return { results, hasMore };
    
  } catch (error) {
    console.error('Error getting quiz result history:', error);
    return { results: [], hasMore: false };
  }
};