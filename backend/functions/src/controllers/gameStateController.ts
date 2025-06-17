import {Request, Response} from "express";
import * as gameStateService from "../services/gameStateService";

/**
 * 指定されたクイズのゲーム状態を取得
 */
export const getGameState = async (req: Request, res: Response): Promise<void> => {
  try {
    const {quizId} = req.params;

    if (!quizId) {
      res.status(400).json({
        success: false,
        error: "Quiz ID is required",
      });
      return;
    }

    const gameTimer = await gameStateService.getGameTimer(quizId);

    if (!gameTimer) {
      res.status(404).json({
        success: false,
        error: "Game state not found",
      });
      return;
    }

    res.json({
      success: true,
      data: gameTimer,
    });
  } catch (error: any) {
    console.error("Error in getGameState:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get game state",
    });
  }
};

/**
 * ゲーム状態を初期化
 */
export const initializeGameState = async (req: Request, res: Response): Promise<void> => {
  try {
    const {quizId} = req.params;
    const {durationMinutes, autoTransitions = true} = req.body;

    if (!quizId) {
      res.status(400).json({
        success: false,
        error: "Quiz ID is required",
      });
      return;
    }

    console.log(`🎮 Initializing game state for quiz: ${quizId}`);
    console.log(`📋 Parameters: durationMinutes=${durationMinutes}, autoTransitions=${autoTransitions}`);

    const gameTimer = await gameStateService.initializeGameState(
      quizId,
      durationMinutes,
      autoTransitions
    );

    console.log(`✅ Game state initialized successfully for quiz: ${quizId}`);

    res.json({
      success: true,
      message: "Game state initialized successfully",
      data: gameTimer,
    });
  } catch (error: any) {
    console.error("❌ Error in initializeGameState controller:", error);
    console.error("❌ Error stack:", error.stack);

    res.status(500).json({
      success: false,
      error: error.message || "Failed to initialize game state",
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

/**
 * ゲーム状態を更新
 */
export const updateGameState = async (req: Request, res: Response): Promise<void> => {
  try {
    const {quizId} = req.params;

    if (!quizId) {
      res.status(400).json({
        success: false,
        error: "Quiz ID is required",
      });
      return;
    }

    const gameTimer = await gameStateService.updateGameState(quizId);

    if (!gameTimer) {
      res.status(404).json({
        success: false,
        error: "Game state not found",
      });
      return;
    }

    res.json({
      success: true,
      data: gameTimer,
    });
  } catch (error: any) {
    console.error("Error in updateGameState:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to update game state",
    });
  }
};

/**
 * フェーズを手動で遷移
 */
export const transitionPhase = async (req: Request, res: Response): Promise<void> => {
  try {
    const {quizId} = req.params;
    const {phase, reason} = req.body;

    if (!quizId) {
      res.status(400).json({
        success: false,
        error: "Quiz ID is required",
      });
      return;
    }

    if (!phase) {
      res.status(400).json({
        success: false,
        error: "Phase is required",
      });
      return;
    }

    const gameTimer = await gameStateService.getGameTimer(quizId);
    if (!gameTimer) {
      res.status(404).json({
        success: false,
        error: "Game state not found",
      });
      return;
    }

    const updatedTimer = await gameStateService.transitionPhase(
      gameTimer,
      phase,
      "manual",
      reason
    );

    res.json({
      success: true,
      message: `Phase transitioned to ${phase}`,
      data: updatedTimer,
    });
  } catch (error: any) {
    console.error("Error in transitionPhase:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to transition phase",
    });
  }
};

/**
 * アクティブなゲーム状態を全て取得
 */
export const getActiveGameStates = async (req: Request, res: Response): Promise<void> => {
  try {
    const activeTimers = await gameStateService.getActiveGameTimers();

    res.json({
      success: true,
      data: {
        timers: activeTimers,
        count: activeTimers.length,
      },
    });
  } catch (error: any) {
    console.error("Error in getActiveGameStates:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get active game states",
    });
  }
};

/**
 * 全てのアクティブゲーム状態を更新
 */
export const updateAllGameStates = async (req: Request, res: Response): Promise<void> => {
  try {
    await gameStateService.updateAllActiveGameStates();

    res.json({
      success: true,
      message: "All active game states updated successfully",
    });
  } catch (error: any) {
    console.error("Error in updateAllGameStates:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to update all game states",
    });
  }
};

/**
 * ゲーム状態履歴を取得
 */
export const getGameStateHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const {quizId} = req.params;

    if (!quizId) {
      res.status(400).json({
        success: false,
        error: "Quiz ID is required",
      });
      return;
    }

    const history = await gameStateService.getGameStateHistory(quizId);

    if (!history) {
      res.status(404).json({
        success: false,
        error: "Game state history not found",
      });
      return;
    }

    res.json({
      success: true,
      data: history,
    });
  } catch (error: any) {
    console.error("Error in getGameStateHistory:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get game state history",
    });
  }
};
