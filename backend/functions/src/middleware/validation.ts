import {Request, Response, NextFunction} from "express";
import {ValidationError} from "./errorHandler";

export const validateCreateGame = (req: Request, res: Response, next: NextFunction) => {
  const {gameId, secretPrompt, imageName, minBet, maxParticipants, durationHours} = req.body;
  
  if (!gameId || typeof gameId !== "string" || gameId.trim().length === 0) {
    throw new ValidationError("gameId is required and must be a non-empty string");
  }
  
  if (!secretPrompt || typeof secretPrompt !== "string" || secretPrompt.trim().length < 5) {
    throw new ValidationError("secretPrompt is required and must be at least 5 characters");
  }
  
  if (!imageName || typeof imageName !== "string" || imageName.trim().length === 0) {
    throw new ValidationError("imageName is required and must be a non-empty string");
  }
  
  if (minBet !== undefined) {
    const betValue = Number(minBet);
    if (isNaN(betValue) || betValue < 0) {
      throw new ValidationError("minBet must be a non-negative number");
    }
  }
  
  if (maxParticipants !== undefined) {
    const maxValue = Number(maxParticipants);
    if (isNaN(maxValue) || maxValue < 1 || maxValue > 1000) {
      throw new ValidationError("maxParticipants must be between 1 and 1000");
    }
  }
  
  if (durationHours !== undefined) {
    const durationValue = Number(durationHours);
    if (isNaN(durationValue) || durationValue < 0.1 || durationValue > 168) {
      throw new ValidationError("durationHours must be between 0.1 and 168 (1 week)");
    }
  }
  
  next();
};

export const validateParticipation = (req: Request, res: Response, next: NextFunction) => {
  const {quizId, walletAddress, guessPrompt, bet} = req.body;
  
  if (!quizId || typeof quizId !== "string" || quizId.trim().length === 0) {
    throw new ValidationError("quizId is required and must be a non-empty string");
  }
  
  if (!walletAddress || typeof walletAddress !== "string" || walletAddress.length < 32) {
    throw new ValidationError("walletAddress is required and must be a valid Solana address");
  }
  
  if (!guessPrompt || typeof guessPrompt !== "string" || guessPrompt.trim().length < 3) {
    throw new ValidationError("guessPrompt is required and must be at least 3 characters");
  }
  
  if (guessPrompt.length > 500) {
    throw new ValidationError("guessPrompt must be less than 500 characters");
  }
  
  if (bet !== undefined) {
    const betValue = Number(bet);
    if (isNaN(betValue) || betValue < 0) {
      throw new ValidationError("bet must be a non-negative number");
    }
  }
  
  next();
};

export const validateGameId = (req: Request, res: Response, next: NextFunction) => {
  const {gameId} = req.params;
  
  if (!gameId || typeof gameId !== "string" || gameId.trim().length === 0) {
    throw new ValidationError("gameId parameter is required and must be a non-empty string");
  }

  next();
};
