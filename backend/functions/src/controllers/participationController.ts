import {Request, Response} from "express";
import * as participantionService from "../services/participationService";
import {broadcastNewParticipation} from "../services/realtimeService";
import * as leaderboardService from "../services/leaderboardService";
export const createParticipant = async (req: Request, res: Response) => {
  try {
    const submissionTime = new Date();
    
    await participantionService.createParticipant(
      req.body.quizId,
      req.body.walletAddress,
      req.body.guessPrompt,
      req.body.bet,
      submissionTime
    );
    
    // Create response data for broadcasting and API response
    const participantData = {
      quizId: req.body.quizId,
      walletAddress: req.body.walletAddress,
      guessPrompt: req.body.guessPrompt,
      bet: req.body.bet,
      submissionTime: submissionTime.toISOString(),
      createdAt: new Date().toISOString()
    };
    
    // Broadcast new participation to connected clients
    broadcastNewParticipation(req.body.quizId, participantData);
    
    // Get updated leaderboard and include in response
    const leaderboard = await leaderboardService.getLeaderboard(req.body.quizId, 10);
    
    res.status(201).json({
      success: true,
      message: "Participation created successfully",
      data: {
        ...participantData,
        leaderboard
      }
    });
  } catch (error: any) {
    res.status(500).send(error.message);
  }
};
