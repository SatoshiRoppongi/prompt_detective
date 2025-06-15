import {Response} from "express";
import * as admin from "firebase-admin";
import {AuthenticatedRequest} from "../middleware/auth";
import {broadcastQuizUpdate, broadcastGameEnd} from "../services/realtimeService";
import {
  getSchedulerConfig,
  updateSchedulerConfig,
  getSchedulerStats,
  getSchedulerRunHistory,
  enableScheduler,
  disableScheduler,
  forceSchedulerRun
} from "../services/schedulerService";

const db = admin.firestore();

export const getSystemStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Get active quiz count
    const activeQuizzesSnapshot = await db.collection("quiz")
      .where("status", "==", "active")
      .get();
    
    // Get total participants in last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentParticipationsSnapshot = await db.collectionGroup("participants")
      .where("createdAt", ">=", oneDayAgo)
      .get();
    
    // Get completed games in last 24 hours
    const completedGamesSnapshot = await db.collection("quiz")
      .where("status", "==", "completed")
      .where("endTime", ">=", oneDayAgo)
      .get();
    
    const systemStatus = {
      activeGames: activeQuizzesSnapshot.size,
      recentParticipants: recentParticipationsSnapshot.size,
      completedGamesLast24h: completedGamesSnapshot.size,
      timestamp: new Date().toISOString(),
      serverStatus: "healthy"
    };
    
    res.json(systemStatus);
  } catch (error: any) {
    console.error("Error getting system status:", error);
    res.status(500).json({error: "Failed to get system status", details: error.message});
  }
};

export const getActiveGames = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const activeGamesSnapshot = await db.collection("quiz")
      .where("status", "==", "active")
      .orderBy("createdAt", "desc")
      .get();
    
    const activeGames = [];
    for (const doc of activeGamesSnapshot.docs) {
      const gameData: any = {id: doc.id, ...doc.data()};
      
      // Get participant count for each game
      const participantsSnapshot = await db.collection("quiz")
        .doc(doc.id)
        .collection("participants")
        .get();
      
      gameData.participantCount = participantsSnapshot.size;
      activeGames.push(gameData);
    }
    
    res.json(activeGames);
  } catch (error: any) {
    console.error("Error getting active games:", error);
    res.status(500).json({error: "Failed to get active games", details: error.message});
  }
};

export const forceEndGame = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {gameId, reason} = req.body;
    
    if (!gameId) {
      res.status(400).json({error: "Game ID is required"});
      return;
    }
    
    const gameRef = db.collection("quiz").doc(gameId);
    const gameDoc = await gameRef.get();
    
    if (!gameDoc.exists) {
      res.status(404).json({error: "Game not found"});
      return;
    }
    
    const gameData = gameDoc.data();
    
    if (gameData?.status !== "active") {
      res.status(400).json({error: "Game is not active"});
      return;
    }
    
    // Update game status to force-ended
    await gameRef.update({
      status: "force-ended",
      endTime: admin.firestore.FieldValue.serverTimestamp(),
      endReason: reason || "Manually ended by admin",
      endedBy: req.user?.email || "admin"
    });
    
    // Broadcast game end to connected clients
    broadcastGameEnd(gameId, {
      status: "force-ended",
      reason: reason || "Game ended by administrator"
    });
    
    res.json({
      success: true,
      message: "Game ended successfully",
      gameId: gameId
    });
    
  } catch (error: any) {
    console.error("Error ending game:", error);
    res.status(500).json({error: "Failed to end game", details: error.message});
  }
};

export const extendGame = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {gameId, extensionMinutes} = req.body;
    
    if (!gameId || !extensionMinutes) {
      res.status(400).json({error: "Game ID and extension time are required"});
      return;
    }
    
    const gameRef = db.collection("quiz").doc(gameId);
    const gameDoc = await gameRef.get();
    
    if (!gameDoc.exists) {
      res.status(404).json({error: "Game not found"});
      return;
    }
    
    const gameData = gameDoc.data();
    
    if (gameData?.status !== "active") {
      res.status(400).json({error: "Game is not active"});
      return;
    }
    
    // Calculate new end time
    const currentEndTime = gameData.endTime.toDate();
    const newEndTime = new Date(currentEndTime.getTime() + extensionMinutes * 60 * 1000);
    
    await gameRef.update({
      endTime: admin.firestore.Timestamp.fromDate(newEndTime),
      extendedBy: req.user?.email || "admin",
      extensionReason: `Extended by ${extensionMinutes} minutes`
    });
    
    // Broadcast update to connected clients
    broadcastQuizUpdate(gameId, {
      id: gameId,
      ...gameData,
      endTime: admin.firestore.Timestamp.fromDate(newEndTime)
    });
    
    res.json({
      success: true,
      message: `Game extended by ${extensionMinutes} minutes`,
      newEndTime: newEndTime.toISOString()
    });
    
  } catch (error: any) {
    console.error("Error extending game:", error);
    res.status(500).json({error: "Failed to extend game", details: error.message});
  }
};

export const getGameDetails = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {gameId} = req.params;
    
    const gameRef = db.collection("quiz").doc(gameId);
    const gameDoc = await gameRef.get();
    
    if (!gameDoc.exists) {
      res.status(404).json({error: "Game not found"});
      return;
    }
    
    const gameData: any = {id: gameDoc.id, ...gameDoc.data()};
    
    // Get participants
    const participantsSnapshot = await gameRef.collection("participants").get();
    const participants = participantsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    gameData.participants = participants;
    gameData.participantCount = participants.length;
    
    res.json(gameData);
    
  } catch (error: any) {
    console.error("Error getting game details:", error);
    res.status(500).json({error: "Failed to get game details", details: error.message});
  }
};

export const createEmergencyGame = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {secretPrompt, imageName, duration = 60} = req.body;
    
    if (!secretPrompt || !imageName) {
      res.status(400).json({error: "Secret prompt and image name are required"});
      return;
    }
    
    const gameId = `emergency-${Date.now()}`;
    const endTime = new Date(Date.now() + duration * 60 * 1000);
    
    const gameData = {
      id: gameId,
      secretPrompt,
      imageName,
      status: "active",
      minBet: 0.01,
      maxParticipants: 50,
      endTime: admin.firestore.Timestamp.fromDate(endTime),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: req.user?.email || "admin",
      type: "emergency",
      pot: 0,
      totalParticipants: 0,
      averageScore: 0
    };
    
    await db.collection("quiz").doc(gameId).set(gameData);
    
    res.json({
      success: true,
      message: "Emergency game created successfully",
      gameId: gameId,
      gameData: gameData
    });
    
  } catch (error: any) {
    console.error("Error creating emergency game:", error);
    res.status(500).json({error: "Failed to create emergency game", details: error.message});
  }
};

// Scheduler Management Endpoints

export const getSchedulerStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const config = await getSchedulerConfig();
    const stats = await getSchedulerStats();
    
    if (!config || !stats) {
      res.status(500).json({error: "Failed to get scheduler status"});
      return;
    }
    
    res.json({
      config,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("Error getting scheduler status:", error);
    res.status(500).json({error: "Failed to get scheduler status", details: error.message});
  }
};

export const updateSchedulerSettings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const updates = req.body;
    
    const success = await updateSchedulerConfig(updates);
    
    if (success) {
      res.json({
        success: true,
        message: "Scheduler settings updated successfully"
      });
    } else {
      res.status(500).json({error: "Failed to update scheduler settings"});
    }
  } catch (error: any) {
    console.error("Error updating scheduler settings:", error);
    res.status(500).json({error: "Failed to update scheduler settings", details: error.message});
  }
};

export const toggleScheduler = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {enabled} = req.body;
    
    let success;
    if (enabled) {
      success = await enableScheduler();
    } else {
      success = await disableScheduler();
    }
    
    if (success) {
      res.json({
        success: true,
        message: `Scheduler ${enabled ? 'enabled' : 'disabled'} successfully`,
        enabled
      });
    } else {
      res.status(500).json({error: "Failed to toggle scheduler"});
    }
  } catch (error: any) {
    console.error("Error toggling scheduler:", error);
    res.status(500).json({error: "Failed to toggle scheduler", details: error.message});
  }
};

export const getSchedulerHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    
    const history = await getSchedulerRunHistory(limit);
    
    res.json({
      history,
      total: history.length
    });
  } catch (error: any) {
    console.error("Error getting scheduler history:", error);
    res.status(500).json({error: "Failed to get scheduler history", details: error.message});
  }
};

export const runSchedulerManually = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = await forceSchedulerRun();
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.message
      });
    }
  } catch (error: any) {
    console.error("Error running scheduler manually:", error);
    res.status(500).json({error: "Failed to run scheduler manually", details: error.message});
  }
};