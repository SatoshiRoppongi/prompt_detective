import {Request, Response} from "express";
import * as leaderboardService from "../services/leaderboardService";

/**
 * 指定されたクイズのリーダーボードを取得
 */
export const getLeaderboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const {quizId} = req.params;
    const {limit, walletAddress} = req.query;

    if (!quizId) {
      res.status(400).json({
        success: false,
        error: "Quiz ID is required",
      });
      return;
    }

    const leaderboard = await leaderboardService.getLeaderboard(
      quizId,
      limit ? parseInt(limit as string) : 10,
      walletAddress as string
    );

    res.json({
      success: true,
      data: leaderboard,
    });
  } catch (error: any) {
    console.error("Error in getLeaderboard:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get leaderboard",
    });
  }
};

/**
 * ユーザーの現在のランキングを取得
 */
export const getUserRank = async (req: Request, res: Response): Promise<void> => {
  try {
    const {quizId} = req.params;
    const {walletAddress} = req.query;

    if (!quizId || !walletAddress) {
      res.status(400).json({
        success: false,
        error: "Quiz ID and wallet address are required",
      });
      return;
    }

    const rank = await leaderboardService.getUserRank(quizId, walletAddress as string);

    if (rank === null) {
      res.status(404).json({
        success: false,
        error: "User not found in this quiz",
      });
      return;
    }

    res.json({
      success: true,
      data: {
        rank,
        walletAddress,
      },
    });
  } catch (error: any) {
    console.error("Error in getUserRank:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get user rank",
    });
  }
};
