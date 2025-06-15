import {Request, Response} from "express";
import * as participantionService from "../services/participationService";
import {broadcastNewParticipation} from "../services/realtimeService";
export const createParticipant = async (req: Request, res: Response) => {
  try {
    await participantionService.createParticipant(
      req.body.quizId,
      req.body.walletAddress,
      req.body.guessPrompt,
      req.body.bet
    );
    
    // Create response data for broadcasting and API response
    const participantData = {
      quizId: req.body.quizId,
      walletAddress: req.body.walletAddress,
      guessPrompt: req.body.guessPrompt,
      bet: req.body.bet,
      createdAt: new Date().toISOString()
    };
    
    // Broadcast new participation to connected clients
    broadcastNewParticipation(req.body.quizId, participantData);
    
    res.status(201).json({
      success: true,
      message: "Participation created successfully",
      data: participantData
    });
  } catch (error: any) {
    res.status(500).send(error.message);
  }
};
