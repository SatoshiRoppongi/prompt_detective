import {Request, Response} from "express";
import * as participantionService from "../services/participationService";
export const createParticipant = async (req: Request, res: Response) => {
  try {
    const participant = await participantionService.createParticipant(
      req.body.walletAddress,
      req.body.guessPrompt,
      req.body.score,
      req.body.bet
    );
    res.status(201).json(participant);
  } catch (error: any) {
    res.status(500).send(error.message);
  }
};
