import { Request, Response } from "express";
import * as resultService from "../services/resultCalculationService";
import * as quizService from "../services/quizService";

/**
 * 指定されたクイズの結果を取得
 */
export const getQuizResult = async (req: Request, res: Response): Promise<void> => {
  try {
    const { quizId } = req.params;
    
    if (!quizId) {
      res.status(400).json({
        success: false,
        error: "Quiz ID is required"
      });
      return;
    }
    
    const result = await resultService.getQuizResult(quizId);
    
    if (!result) {
      res.status(404).json({
        success: false,
        error: "Quiz result not found"
      });
      return;
    }
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error: any) {
    console.error('Error in getQuizResult:', error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get quiz result"
    });
  }
};

/**
 * クイズ結果の履歴を取得（ページネーション対応）
 */
export const getQuizResultHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit, lastResultId } = req.query;
    
    const limitNum = limit ? parseInt(limit as string) : 10;
    const lastId = lastResultId as string;
    
    const { results, hasMore } = await resultService.getQuizResultHistory(limitNum, lastId);
    
    res.json({
      success: true,
      data: {
        results,
        hasMore,
        count: results.length
      }
    });
    
  } catch (error: any) {
    console.error('Error in getQuizResultHistory:', error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get quiz result history"
    });
  }
};

/**
 * 手動でクイズ結果を計算・再計算
 */
export const calculateQuizResult = async (req: Request, res: Response): Promise<void> => {
  try {
    const { quizId } = req.params;
    
    if (!quizId) {
      res.status(400).json({
        success: false,
        error: "Quiz ID is required"
      });
      return;
    }
    
    // クイズデータを取得
    const quizData = await quizService.getQuizWithParticipants(quizId);
    
    if (!quizData) {
      res.status(404).json({
        success: false,
        error: "Quiz not found"
      });
      return;
    }
    
    // 結果を計算
    const result = await resultService.calculateQuizResults(quizData);
    
    res.json({
      success: true,
      message: "Quiz result calculated successfully",
      data: result
    });
    
  } catch (error: any) {
    console.error('Error in calculateQuizResult:', error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to calculate quiz result"
    });
  }
};

/**
 * 分配ステータスを更新
 */
export const updateDistributionStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { quizId } = req.params;
    const { status, error } = req.body;
    
    if (!quizId) {
      res.status(400).json({
        success: false,
        error: "Quiz ID is required"
      });
      return;
    }
    
    if (!status || !['distributed', 'failed'].includes(status)) {
      res.status(400).json({
        success: false,
        error: "Valid status is required (distributed or failed)"
      });
      return;
    }
    
    await resultService.updateDistributionStatus(quizId, status, error);
    
    res.json({
      success: true,
      message: `Distribution status updated to ${status}`
    });
    
  } catch (error: any) {
    console.error('Error in updateDistributionStatus:', error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to update distribution status"
    });
  }
};

/**
 * 統計情報を取得
 */
export const getQuizStatistics = async (req: Request, res: Response): Promise<void> => {
  try {
    // const { period } = req.query; // 'week', 'month', 'all' - TODO: Implement period filtering
    
    // 基本的な統計情報を計算
    const { results } = await resultService.getQuizResultHistory(100); // 最新100件を取得
    
    if (results.length === 0) {
      res.json({
        success: true,
        data: {
          totalQuizzes: 0,
          totalParticipants: 0,
          totalPayout: 0,
          averageParticipants: 0,
          averageScore: 0
        }
      });
      return;
    }
    
    const statistics = {
      totalQuizzes: results.length,
      totalParticipants: results.reduce((sum, r) => sum + r.totalParticipants, 0),
      totalPayout: results.reduce((sum, r) => sum + r.totalPot, 0),
      averageParticipants: Math.round(
        (results.reduce((sum, r) => sum + r.totalParticipants, 0) / results.length) * 100
      ) / 100,
      averageScore: Math.round(
        (results.reduce((sum, r) => sum + r.averageScore, 0) / results.length) * 100
      ) / 100,
      topScore: Math.max(...results.map(r => r.topScore)),
      distributionSuccess: results.filter(r => r.status === 'distributed').length,
      distributionFailed: results.filter(r => r.status === 'failed').length
    };
    
    res.json({
      success: true,
      data: statistics
    });
    
  } catch (error: any) {
    console.error('Error in getQuizStatistics:', error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get quiz statistics"
    });
  }
};