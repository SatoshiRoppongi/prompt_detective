import * as admin from "firebase-admin";
import {getCurrentConfig} from "../config/e2eConfig";

const db = admin.firestore();

export enum GamePhase {
  WAITING = "waiting", // ゲーム開始待ち
  ACTIVE = "active", // アクティブな回答期間
  GRACE_PERIOD = "grace", // 猶予期間（最後の回答受付）
  SCORING = "scoring", // スコア計算中
  RESULTS = "results", // 結果発表
  DISTRIBUTION = "distribution", // 賞金分配中
  COMPLETED = "completed" // 完了
}

export interface GameTimer {
  quizId: string;
  phase: GamePhase;
  startTime: Date;
  endTime: Date;
  remainingTime: number; // seconds
  lastUpdated: Date;
  isActive: boolean;
  autoTransitions: boolean;
}

export interface PhaseTransition {
  from: GamePhase;
  to: GamePhase;
  triggeredAt: Date;
  triggeredBy: "timer" | "manual" | "condition";
  reason?: string;
}

export interface GameStateHistory {
  quizId: string;
  transitions: PhaseTransition[];
  totalDuration: number; // seconds
  activePhaseDuration: number; // seconds
  createdAt: Date;
}

/**
 * ゲーム状態を初期化
 */
export const initializeGameState = async (
  quizId: string,
  durationMinutes?: number,
  autoTransitions = true
): Promise<GameTimer> => {
  try {
    console.log(`🔍 Checking existing game state for quiz: ${quizId}`);

    // Check if game state already exists
    const existingTimer = await getGameTimer(quizId);
    if (existingTimer) {
      console.log(`🎮 Game state already exists for quiz: ${quizId}, returning existing state`);
      return existingTimer;
    }

    console.log(`🆕 Creating new game state for quiz: ${quizId}`);
    const config = getCurrentConfig();
    const gameDuration = durationMinutes || config.GAME_DURATION_MINUTES;

    const now = new Date();
    const endTime = new Date(now.getTime() + gameDuration * 60 * 1000);

    console.log(`⏰ Game duration: ${gameDuration} minutes (E2E: ${(config as any).ENABLE_SHORT_CYCLES})`);

    const gameTimer: GameTimer = {
      quizId,
      phase: GamePhase.WAITING,
      startTime: now,
      endTime,
      remainingTime: gameDuration * 60,
      lastUpdated: now,
      isActive: false,
      autoTransitions,
    };

    console.log("💾 Saving game timer to Firestore...");
    // Save initial state
    await saveGameTimer(gameTimer);
    console.log("✅ Game timer saved successfully");

    // Initialize history only if it doesn't exist
    console.log("🔍 Checking existing game state history...");
    const existingHistory = await getGameStateHistory(quizId);
    if (!existingHistory) {
      console.log("🆕 Creating new game state history...");
      const history: GameStateHistory = {
        quizId,
        transitions: [],
        totalDuration: 0,
        activePhaseDuration: 0,
        createdAt: now,
      };

      await saveGameStateHistory(history);
      console.log("✅ Game state history saved successfully");
    } else {
      console.log("📋 Game state history already exists");
    }

    console.log(`🎮 Game state initialized successfully for quiz: ${quizId}`);
    return gameTimer;
  } catch (error: any) {
    console.error(`❌ Error initializing game state for quiz ${quizId}:`, error);
    console.error("❌ Error details:", error.message);
    console.error("❌ Error stack:", error.stack);
    throw error;
  }
};

/**
 * ゲーム状態を更新
 */
export const updateGameState = async (quizId: string): Promise<GameTimer | null> => {
  try {
    const gameTimer = await getGameTimer(quizId);
    if (!gameTimer) {
      console.log(`No game timer found for quiz: ${quizId}`);
      return null;
    }

    const now = new Date();
    const remainingTime = Math.max(0, Math.floor((gameTimer.endTime.getTime() - now.getTime()) / 1000));

    // Update remaining time
    gameTimer.remainingTime = remainingTime;
    gameTimer.lastUpdated = now;

    // Check for phase transitions if auto transitions are enabled
    if (gameTimer.autoTransitions) {
      await checkAndExecuteTransitions(gameTimer);
    }

    // Save updated state
    await saveGameTimer(gameTimer);

    return gameTimer;
  } catch (error) {
    console.error("Error updating game state:", error);
    return null;
  }
};

/**
 * フェーズ遷移をチェックして実行
 */
const checkAndExecuteTransitions = async (gameTimer: GameTimer): Promise<void> => {
  let shouldTransition = false;
  let newPhase = gameTimer.phase;
  let reason = "";

  switch (gameTimer.phase) {
  case GamePhase.WAITING:
    // クイズが開始されている場合、ACTIVEに遷移
    if (gameTimer.isActive) {
      newPhase = GamePhase.ACTIVE;
      reason = "Quiz started";
      shouldTransition = true;
    }
    break;

  case GamePhase.ACTIVE: {
    // 残り時間が少なくなったら猶予期間に遷移
    const config = getCurrentConfig();
    const graceThreshold = config.GRACE_PERIOD_SECONDS;
    if (gameTimer.remainingTime <= graceThreshold) {
      newPhase = GamePhase.GRACE_PERIOD;
      reason = `Entering grace period (${graceThreshold} seconds remaining)`;
      shouldTransition = true;
    }
    break;
  }

  case GamePhase.GRACE_PERIOD: {
    // 時間切れでスコア計算に遷移
    if (gameTimer.remainingTime <= 0) {
      newPhase = GamePhase.SCORING;
      reason = "Time expired, starting scoring";
      shouldTransition = true;
    }
    break;
  }

  case GamePhase.SCORING:
    // スコア計算完了後、結果発表に遷移（外部トリガー待ち）
    // This will be triggered externally when scoring is complete
    break;

  case GamePhase.RESULTS:
    // 結果発表後、分配に遷移（外部トリガー待ち）
    // This will be triggered externally when results are ready
    break;

  case GamePhase.DISTRIBUTION:
    // 分配完了後、完了に遷移（外部トリガー待ち）
    // This will be triggered externally when distribution is complete
    break;

  default:
    break;
  }

  if (shouldTransition) {
    await transitionPhase(gameTimer, newPhase, "timer", reason);
  }
};

/**
 * フェーズを手動で遷移
 */
export const transitionPhase = async (
  gameTimer: GameTimer,
  newPhase: GamePhase,
  triggeredBy: "timer" | "manual" | "condition" = "manual",
  reason?: string
): Promise<GameTimer> => {
  const oldPhase = gameTimer.phase;

  if (oldPhase === newPhase) {
    console.log(`Phase already is ${newPhase} for quiz: ${gameTimer.quizId}`);
    return gameTimer;
  }

  // Validate transition
  if (!isValidTransition(oldPhase, newPhase)) {
    throw new Error(`Invalid transition from ${oldPhase} to ${newPhase}`);
  }

  // Update game timer
  gameTimer.phase = newPhase;
  gameTimer.lastUpdated = new Date();

  // Special handling for certain phases
  switch (newPhase) {
  case GamePhase.ACTIVE:
    gameTimer.isActive = true;
    break;
  case GamePhase.COMPLETED:
    gameTimer.isActive = false;
    break;
  }

  // Save updated timer
  await saveGameTimer(gameTimer);

  // Record transition
  const transition: PhaseTransition = {
    from: oldPhase,
    to: newPhase,
    triggeredAt: new Date(),
    triggeredBy,
    reason,
  };

  await recordPhaseTransition(gameTimer.quizId, transition);

  console.log(`🔄 Phase transition: ${oldPhase} → ${newPhase} for quiz ${gameTimer.quizId}`);

  // Emit events for phase changes
  await emitPhaseChangeEvent(gameTimer.quizId, oldPhase, newPhase);

  return gameTimer;
};

/**
 * 有効な遷移かチェック
 */
const isValidTransition = (from: GamePhase, to: GamePhase): boolean => {
  const validTransitions: Record<GamePhase, GamePhase[]> = {
    [GamePhase.WAITING]: [GamePhase.ACTIVE, GamePhase.COMPLETED],
    [GamePhase.ACTIVE]: [GamePhase.GRACE_PERIOD, GamePhase.SCORING, GamePhase.COMPLETED],
    [GamePhase.GRACE_PERIOD]: [GamePhase.SCORING, GamePhase.COMPLETED],
    [GamePhase.SCORING]: [GamePhase.RESULTS, GamePhase.COMPLETED],
    [GamePhase.RESULTS]: [GamePhase.DISTRIBUTION, GamePhase.COMPLETED],
    [GamePhase.DISTRIBUTION]: [GamePhase.COMPLETED],
    [GamePhase.COMPLETED]: [], // No transitions from completed
  };

  return validTransitions[from]?.includes(to) ?? false;
};

/**
 * フェーズ変更イベントを発行
 */
const emitPhaseChangeEvent = async (quizId: string, from: GamePhase, to: GamePhase): Promise<void> => {
  try {
    // Save phase change event for real-time listeners
    const eventRef = db.collection("game_events").doc();
    await eventRef.set({
      type: "phase_change",
      quizId,
      data: {
        from,
        to,
        timestamp: new Date().toISOString(),
      },
      createdAt: new Date().toISOString(),
    });

    console.log(`📢 Phase change event emitted: ${from} → ${to} for quiz ${quizId}`);
  } catch (error) {
    console.error("Error emitting phase change event:", error);
  }
};

/**
 * ゲームタイマーを保存
 */
const saveGameTimer = async (gameTimer: GameTimer): Promise<void> => {
  try {
    const timerRef = db.collection("game_timers").doc(gameTimer.quizId);

    console.log("💾 Saving game timer with ISO dates...");
    console.log("startTime:", gameTimer.startTime.toISOString());
    console.log("endTime:", gameTimer.endTime.toISOString());

    // Use ISO strings instead of Firestore Timestamps for compatibility
    await timerRef.set({
      ...gameTimer,
      startTime: gameTimer.startTime.toISOString(),
      endTime: gameTimer.endTime.toISOString(),
      lastUpdated: new Date().toISOString(),
    });

    console.log("✅ Game timer saved successfully with ISO dates");
  } catch (error) {
    console.error("Error saving game timer:", error);
    throw error;
  }
};

/**
 * ゲームタイマーを取得
 */
export const getGameTimer = async (quizId: string): Promise<GameTimer | null> => {
  try {
    const timerRef = db.collection("game_timers").doc(quizId);
    const doc = await timerRef.get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data()!;

    // Handle both ISO string dates and Firestore Timestamps for compatibility
    const parseDate = (dateValue: any): Date => {
      if (typeof dateValue === "string") {
        return new Date(dateValue);
      } else if (dateValue && typeof dateValue.toDate === "function") {
        return dateValue.toDate();
      } else {
        return new Date(dateValue);
      }
    };

    return {
      quizId: data.quizId,
      phase: data.phase,
      startTime: parseDate(data.startTime),
      endTime: parseDate(data.endTime),
      remainingTime: data.remainingTime,
      lastUpdated: parseDate(data.lastUpdated) || new Date(),
      isActive: data.isActive,
      autoTransitions: data.autoTransitions,
    };
  } catch (error) {
    console.error("Error getting game timer:", error);
    return null;
  }
};

/**
 * フェーズ遷移を記録
 */
const recordPhaseTransition = async (quizId: string, transition: PhaseTransition): Promise<void> => {
  try {
    const historyRef = db.collection("game_state_history").doc(quizId);
    // Get current document and append transition
    const doc = await historyRef.get();
    const currentTransitions = doc.exists ? (doc.data()?.transitions || []) : [];

    await historyRef.set({
      quizId,
      transitions: [...currentTransitions, {
        ...transition,
        triggeredAt: transition.triggeredAt.toISOString(),
      }],
      totalDuration: 0,
      activePhaseDuration: 0,
      createdAt: doc.exists ? doc.data()?.createdAt : new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error recording phase transition:", error);
  }
};

/**
 * ゲーム状態履歴を保存
 */
const saveGameStateHistory = async (history: GameStateHistory): Promise<void> => {
  try {
    const historyRef = db.collection("game_state_history").doc(history.quizId);
    await historyRef.set({
      ...history,
      createdAt: new Date().toISOString(),
      transitions: [],
    });
  } catch (error) {
    console.error("Error saving game state history:", error);
    throw error;
  }
};

/**
 * アクティブなゲームタイマーを取得
 */
export const getActiveGameTimers = async (): Promise<GameTimer[]> => {
  try {
    const snapshot = await db.collection("game_timers")
      .where("isActive", "==", true)
      .get();

    const timers: GameTimer[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      timers.push({
        quizId: data.quizId,
        phase: data.phase,
        startTime: data.startTime.toDate(),
        endTime: data.endTime.toDate(),
        remainingTime: data.remainingTime,
        lastUpdated: data.lastUpdated?.toDate() || new Date(),
        isActive: data.isActive,
        autoTransitions: data.autoTransitions,
      });
    });

    return timers;
  } catch (error) {
    console.error("Error getting active game timers:", error);
    return [];
  }
};

/**
 * 全てのアクティブゲームの状態を更新
 */
export const updateAllActiveGameStates = async (): Promise<void> => {
  const activeTimers = await getActiveGameTimers();

  console.log(`📊 Updating ${activeTimers.length} active game states`);

  for (const timer of activeTimers) {
    try {
      await updateGameState(timer.quizId);
    } catch (error) {
      console.error(`Error updating game state for ${timer.quizId}:`, error);
    }
  }
};

/**
 * ゲーム状態履歴を取得
 */
export const getGameStateHistory = async (quizId: string): Promise<GameStateHistory | null> => {
  try {
    const historyRef = db.collection("game_state_history").doc(quizId);
    const doc = await historyRef.get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data()!;
    return {
      quizId: data.quizId,
      transitions: data.transitions.map((t: any) => ({
        ...t,
        triggeredAt: t.triggeredAt.toDate(),
      })),
      totalDuration: data.totalDuration,
      activePhaseDuration: data.activePhaseDuration,
      createdAt: data.createdAt.toDate(),
    };
  } catch (error) {
    console.error("Error getting game state history:", error);
    return null;
  }
};

/**
 * フェーズ名の日本語変換
 */
export const getPhaseDisplayName = (phase: GamePhase): string => {
  const phaseNames: Record<GamePhase, string> = {
    [GamePhase.WAITING]: "開始待ち",
    [GamePhase.ACTIVE]: "アクティブ",
    [GamePhase.GRACE_PERIOD]: "猶予期間",
    [GamePhase.SCORING]: "スコア計算中",
    [GamePhase.RESULTS]: "結果発表",
    [GamePhase.DISTRIBUTION]: "賞金分配中",
    [GamePhase.COMPLETED]: "完了",
  };

  return phaseNames[phase] || phase;
};

/**
 * フェーズの色を取得
 */
export const getPhaseColor = (phase: GamePhase): string => {
  const phaseColors: Record<GamePhase, string> = {
    [GamePhase.WAITING]: "grey",
    [GamePhase.ACTIVE]: "green",
    [GamePhase.GRACE_PERIOD]: "orange",
    [GamePhase.SCORING]: "blue",
    [GamePhase.RESULTS]: "purple",
    [GamePhase.DISTRIBUTION]: "indigo",
    [GamePhase.COMPLETED]: "teal",
  };

  return phaseColors[phase] || "grey";
};
