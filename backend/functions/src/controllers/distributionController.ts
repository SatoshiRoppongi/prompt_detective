import { Request, Response } from "express";
import * as distributionService from "../services/distributionService";
import * as resultService from "../services/resultCalculationService";

/**
 * 指定されたクイズの分配履歴を取得
 */
export const getDistributionHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { quizId } = req.params;
    const { limit } = req.query;
    
    const limitNum = limit ? parseInt(limit as string) : 50;
    const { summaries, transactions } = await distributionService.getDistributionHistory(quizId, limitNum);
    
    res.json({
      success: true,
      data: {
        summaries,
        transactions,
        count: {
          summaries: summaries.length,
          transactions: transactions.length
        }
      }
    });
    
  } catch (error: any) {
    console.error('Error in getDistributionHistory:', error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get distribution history"
    });
  }
};

/**
 * 全ての分配履歴を取得
 */
export const getAllDistributionHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit } = req.query;
    
    const limitNum = limit ? parseInt(limit as string) : 50;
    const { summaries, transactions } = await distributionService.getDistributionHistory(undefined, limitNum);
    
    res.json({
      success: true,
      data: {
        summaries,
        transactions,
        count: {
          summaries: summaries.length,
          transactions: transactions.length
        }
      }
    });
    
  } catch (error: any) {
    console.error('Error in getAllDistributionHistory:', error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get distribution history"
    });
  }
};

/**
 * 手動で賞金分配を実行
 */
export const manualDistribution = async (req: Request, res: Response): Promise<void> => {
  try {
    const { quizId } = req.params;
    
    if (!quizId) {
      res.status(400).json({
        success: false,
        error: "Quiz ID is required"
      });
      return;
    }
    
    // Get quiz result
    const quizResult = await resultService.getQuizResult(quizId);
    
    if (!quizResult) {
      res.status(404).json({
        success: false,
        error: "Quiz result not found"
      });
      return;
    }
    
    if (quizResult.status === 'distributed') {
      res.status(400).json({
        success: false,
        error: "Prizes have already been distributed for this quiz"
      });
      return;
    }
    
    // Execute distribution
    const distributionSummary = await distributionService.distributeQuizPrizes(quizResult);
    
    res.json({
      success: true,
      message: "Prize distribution initiated",
      data: distributionSummary
    });
    
  } catch (error: any) {
    console.error('Error in manualDistribution:', error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to execute distribution"
    });
  }
};

/**
 * 財務統計を取得
 */
export const getTreasuryStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = await distributionService.getTreasuryStats();
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error: any) {
    console.error('Error in getTreasuryStats:', error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get treasury statistics"
    });
  }
};

/**
 * 分配システムのヘルスチェック
 */
export const getDistributionHealth = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get recent distribution summaries to check system health
    const { summaries } = await distributionService.getDistributionHistory(undefined, 10);
    
    const recentSummaries = summaries.filter(s => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return s.createdAt > oneDayAgo;
    });
    
    const totalRecent = recentSummaries.length;
    const successfulRecent = recentSummaries.filter(s => s.status === 'completed').length;
    const failedRecent = recentSummaries.filter(s => s.status === 'failed').length;
    const pendingRecent = recentSummaries.filter(s => s.status === 'pending' || s.status === 'partial').length;
    
    const healthStatus = {
      status: failedRecent === 0 && pendingRecent === 0 ? 'healthy' : 
              failedRecent > successfulRecent ? 'unhealthy' : 'warning',
      last24Hours: {
        total: totalRecent,
        successful: successfulRecent,
        failed: failedRecent,
        pending: pendingRecent,
        successRate: totalRecent > 0 ? (successfulRecent / totalRecent) * 100 : 0
      },
      lastDistribution: summaries.length > 0 ? summaries[0] : null
    };
    
    res.json({
      success: true,
      data: healthStatus
    });
    
  } catch (error: any) {
    console.error('Error in getDistributionHealth:', error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get distribution health"
    });
  }
};

/**
 * 未分配の賞金を一括分配
 */
export const distributePendingPrizes = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get quiz results that are calculated but not distributed
    const { results } = await resultService.getQuizResultHistory(50);
    const pendingResults = results.filter(r => r.status === 'calculated' && r.winners.length > 0);
    
    if (pendingResults.length === 0) {
      res.json({
        success: true,
        message: "No pending distributions found",
        data: {
          processed: 0,
          successful: 0,
          failed: 0
        }
      });
      return;
    }
    
    const distributionResults = [];
    let successful = 0;
    let failed = 0;
    
    for (const result of pendingResults) {
      try {
        const distributionSummary = await distributionService.distributeQuizPrizes(result);
        distributionResults.push({
          quizId: result.quizId,
          status: distributionSummary.status,
          summary: distributionSummary
        });
        
        if (distributionSummary.status === 'completed') {
          successful++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error(`Failed to distribute prizes for quiz ${result.quizId}:`, error);
        distributionResults.push({
          quizId: result.quizId,
          status: 'failed',
          error: (error as Error).message
        });
        failed++;
      }
    }
    
    res.json({
      success: true,
      message: `Processed ${pendingResults.length} pending distributions`,
      data: {
        processed: pendingResults.length,
        successful,
        failed,
        results: distributionResults
      }
    });
    
  } catch (error: any) {
    console.error('Error in distributePendingPrizes:', error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to distribute pending prizes"
    });
  }
};