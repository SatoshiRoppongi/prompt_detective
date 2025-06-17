import * as admin from "firebase-admin";

const db = admin.firestore();

export interface SchedulerConfig {
  enabled: boolean;
  interval: string; // cron format: "every day 19:00"
  timezone: string; // "Asia/Tokyo"
  minParticipants: number;
  defaultDuration: number; // hours
  defaultMinBet: number; // lamports
  defaultMaxParticipants: number;
  lastRun?: admin.firestore.Timestamp;
  lastRunStatus?: "success" | "failed" | "skipped";
  lastRunError?: string;
  nextScheduledRun?: admin.firestore.Timestamp;
  autoGeneration: boolean;

  // Cost control settings
  openaiApiEnabled: boolean;
  autoGameGenerationEnabled: boolean;
  manualApprovalRequired: boolean;
  dailyImageGenerationLimit: number;
  currentDailyImageCount: number;
  lastImageGenerationReset?: admin.firestore.Timestamp;

  createdAt: admin.firestore.FieldValue;
  updatedAt: admin.firestore.FieldValue;
}

export interface SchedulerStats {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  skippedRuns: number;
  lastSuccessfulRun?: admin.firestore.Timestamp;
  totalGamesGenerated: number;
  averageParticipantsPerGame: number;
  lastError?: string;
}

export const getSchedulerConfig = async (): Promise<SchedulerConfig | null> => {
  try {
    const configDoc = await db.collection("system").doc("scheduler").get();

    if (!configDoc.exists) {
      // Create default config if it doesn't exist
      const defaultConfig: SchedulerConfig = {
        enabled: true,
        interval: "every day 19:00",
        timezone: "Asia/Tokyo",
        minParticipants: 2,
        defaultDuration: 24,
        defaultMinBet: 100000000, // 0.1 SOL
        defaultMaxParticipants: 100,
        autoGeneration: true,

        // Cost control defaults
        openaiApiEnabled: true,
        autoGameGenerationEnabled: true,
        manualApprovalRequired: false,
        dailyImageGenerationLimit: 10, // Conservative default
        currentDailyImageCount: 0,

        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await db.collection("system").doc("scheduler").set(defaultConfig);
      return {...defaultConfig, createdAt: new Date() as any, updatedAt: new Date() as any};
    }

    return configDoc.data() as SchedulerConfig;
  } catch (error) {
    console.error("Error getting scheduler config:", error);
    return null;
  }
};

export const updateSchedulerConfig = async (updates: Partial<SchedulerConfig>): Promise<boolean> => {
  try {
    await db.collection("system").doc("scheduler").update({
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log("Scheduler config updated:", updates);
    return true;
  } catch (error) {
    console.error("Error updating scheduler config:", error);
    return false;
  }
};

export const recordSchedulerRun = async (
  status: "success" | "failed" | "skipped",
  error?: string,
  gamesGenerated?: number
): Promise<void> => {
  try {
    const runRecord = {
      status,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      error: error || null,
      gamesGenerated: gamesGenerated || 0,
    };

    // Add to run history
    await db.collection("system").doc("scheduler").collection("runs").add(runRecord);

    // Update scheduler config with last run info
    const updates: any = {
      lastRun: admin.firestore.FieldValue.serverTimestamp(),
      lastRunStatus: status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (error) {
      updates.lastRunError = error;
    }

    // Calculate next scheduled run (24 hours from now for daily schedule)
    const nextRun = new Date();
    nextRun.setHours(nextRun.getHours() + 24);
    updates.nextScheduledRun = admin.firestore.Timestamp.fromDate(nextRun);

    await db.collection("system").doc("scheduler").update(updates);

    // Update stats
    await updateSchedulerStats(status, gamesGenerated || 0);
  } catch (error) {
    console.error("Error recording scheduler run:", error);
  }
};

export const updateSchedulerStats = async (
  status: "success" | "failed" | "skipped",
  gamesGenerated = 0
): Promise<void> => {
  try {
    const statsRef = db.collection("system").doc("schedulerStats");
    const statsDoc = await statsRef.get();

    if (!statsDoc.exists) {
      // Create initial stats
      const initialStats: SchedulerStats = {
        totalRuns: 1,
        successfulRuns: status === "success" ? 1 : 0,
        failedRuns: status === "failed" ? 1 : 0,
        skippedRuns: status === "skipped" ? 1 : 0,
        totalGamesGenerated: gamesGenerated,
        averageParticipantsPerGame: 0,
      };

      if (status === "success") {
        initialStats.lastSuccessfulRun = admin.firestore.FieldValue.serverTimestamp() as any;
      }

      await statsRef.set(initialStats);
    } else {
      // Update existing stats
      const updates: any = {
        totalRuns: admin.firestore.FieldValue.increment(1),
        totalGamesGenerated: admin.firestore.FieldValue.increment(gamesGenerated),
      };

      if (status === "success") {
        updates.successfulRuns = admin.firestore.FieldValue.increment(1);
        updates.lastSuccessfulRun = admin.firestore.FieldValue.serverTimestamp();
      } else if (status === "failed") {
        updates.failedRuns = admin.firestore.FieldValue.increment(1);
      } else if (status === "skipped") {
        updates.skippedRuns = admin.firestore.FieldValue.increment(1);
      }

      await statsRef.update(updates);
    }
  } catch (error) {
    console.error("Error updating scheduler stats:", error);
  }
};

export const getSchedulerStats = async (): Promise<SchedulerStats | null> => {
  try {
    const statsDoc = await db.collection("system").doc("schedulerStats").get();

    if (!statsDoc.exists) {
      return {
        totalRuns: 0,
        successfulRuns: 0,
        failedRuns: 0,
        skippedRuns: 0,
        totalGamesGenerated: 0,
        averageParticipantsPerGame: 0,
      };
    }

    return statsDoc.data() as SchedulerStats;
  } catch (error) {
    console.error("Error getting scheduler stats:", error);
    return null;
  }
};

export const getSchedulerRunHistory = async (limit = 50): Promise<any[]> => {
  try {
    const runsSnapshot = await db.collection("system")
      .doc("scheduler")
      .collection("runs")
      .orderBy("timestamp", "desc")
      .limit(limit)
      .get();

    return runsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error getting scheduler run history:", error);
    return [];
  }
};

export const enableScheduler = async (): Promise<boolean> => {
  return await updateSchedulerConfig({enabled: true});
};

export const disableScheduler = async (): Promise<boolean> => {
  return await updateSchedulerConfig({enabled: false});
};

export const updateSchedulerInterval = async (interval: string, timezone = "Asia/Tokyo"): Promise<boolean> => {
  return await updateSchedulerConfig({interval, timezone});
};

// Cost control functions
export const enableOpenAIAPI = async (): Promise<boolean> => {
  return await updateSchedulerConfig({openaiApiEnabled: true});
};

export const disableOpenAIAPI = async (): Promise<boolean> => {
  return await updateSchedulerConfig({openaiApiEnabled: false});
};

export const enableAutoGameGeneration = async (): Promise<boolean> => {
  return await updateSchedulerConfig({autoGameGenerationEnabled: true});
};

export const disableAutoGameGeneration = async (): Promise<boolean> => {
  return await updateSchedulerConfig({autoGameGenerationEnabled: false});
};

export const setDailyImageLimit = async (limit: number): Promise<boolean> => {
  return await updateSchedulerConfig({dailyImageGenerationLimit: limit});
};

export const resetDailyImageCount = async (): Promise<boolean> => {
  return await updateSchedulerConfig({
    currentDailyImageCount: 0,
    lastImageGenerationReset: admin.firestore.FieldValue.serverTimestamp() as any,
  });
};

export const checkDailyImageLimit = async (): Promise<{ canGenerate: boolean; remaining: number; limit: number }> => {
  try {
    const config = await getSchedulerConfig();
    if (!config) {
      return {canGenerate: false, remaining: 0, limit: 0};
    }

    // Check if we need to reset daily count (new day)
    if (config.lastImageGenerationReset) {
      const lastReset = config.lastImageGenerationReset.toDate();
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff >= 1) {
        await resetDailyImageCount();
        return {
          canGenerate: true,
          remaining: config.dailyImageGenerationLimit,
          limit: config.dailyImageGenerationLimit,
        };
      }
    }

    const remaining = Math.max(0, config.dailyImageGenerationLimit - config.currentDailyImageCount);
    return {
      canGenerate: remaining > 0 && config.openaiApiEnabled,
      remaining,
      limit: config.dailyImageGenerationLimit,
    };
  } catch (error) {
    console.error("Error checking daily image limit:", error);
    return {canGenerate: false, remaining: 0, limit: 0};
  }
};

export const incrementDailyImageCount = async (): Promise<boolean> => {
  try {
    const configRef = db.collection("system").doc("scheduler");
    await configRef.update({
      currentDailyImageCount: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error("Error incrementing daily image count:", error);
    return false;
  }
};

export const forceSchedulerRun = async (): Promise<{ success: boolean; message: string }> => {
  try {
    console.log("🔄 Manual scheduler run triggered");

    // Import the actual scheduler function
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const {runQuizGeneration} = require("../scheduled/quizRoundHandler");

    const result = await runQuizGeneration();

    if (result.success) {
      await recordSchedulerRun("success", undefined, result.gamesGenerated);
      return {
        success: true,
        message: `Scheduler run completed successfully. ${result.gamesGenerated || 0} games generated.`,
      };
    } else {
      await recordSchedulerRun("failed", result.error);
      return {
        success: false,
        message: `Scheduler run failed: ${result.error}`,
      };
    }
  } catch (error: any) {
    console.error("Error in force scheduler run:", error);
    await recordSchedulerRun("failed", error.message);
    return {
      success: false,
      message: `Scheduler run failed: ${error.message}`,
    };
  }
};
