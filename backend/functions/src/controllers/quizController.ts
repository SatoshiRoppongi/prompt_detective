/* eslint-disable max-len */
import {Request, Response} from "express";
import * as participationService from "../services/participationService";
import * as quizService from "../services/quizService";

export const getLatestQuiz = async (req: Request, res: Response) => {
  // 最新の問題の情報を取得する
  console.log("getLatestQuiz");
  try {
    const quiz = await quizService.getLatestQuiz();
    console.log("quiz from controller:", quiz);
    // 以下は秘密の情報なので返却情報から除外する
    // 複数回の試行でaverageScoreがどう変動するかでプロンプトの予想ができてしまうため
    // averageScoreも秘密にする(TODO:過去分は見れるようにする)
    const excludeKeys = ["secretPrompt", "averageScore"];
    if (!quiz) {
      throw new Error("問題情報の取得ができませんでした");
    }
    const retObj = Object.fromEntries(
      Object.entries(quiz).filter(([key]) => !excludeKeys.includes(key))
    );
    // Participantのscoreを除外する.
    // TODO:過去分は見れるようにする
    if (retObj.participants) {
      retObj.participants = retObj.participants.map((participant: participationService.Participant) => {
        const {score, guessPrompt, ...rest} = participant;
        return rest;
      });
    }
    console.log("retObj", retObj);
    res.status(200).json(retObj);
  } catch (error: any) {
    res.status(500).send({error: error.message});
  }
};

export const getActiveQuiz = async (req: Request, res: Response) => {
  console.log("getActiveQuiz");
  try {
    const quiz = await quizService.getActiveQuiz();
    
    if (!quiz) {
      res.status(404).json({error: "No active game found"});
      return;
    }

    // Filter out secret information for active games
    const excludeKeys = ["secretPrompt", "averageScore"];
    const retObj = Object.fromEntries(
      Object.entries(quiz).filter(([key]) => !excludeKeys.includes(key))
    );
    
    // Filter participant scores and guesses for active games
    if (retObj.participants) {
      retObj.participants = retObj.participants.map((participant: participationService.Participant) => {
        const {score, guessPrompt, ...rest} = participant;
        return rest;
      });
    }
    
    res.status(200).json(retObj);
  } catch (error: any) {
    res.status(500).send({error: error.message});
  }
};

export const getQuizById = async (req: Request, res: Response) => {
  const {gameId} = req.params;
  console.log("getQuizById:", gameId);
  
  try {
    const quiz = await quizService.getQuizById(gameId);
    
    if (!quiz) {
      res.status(404).json({error: "Game not found"});
      return;
    }

    // For completed games, show all information including results
    if (quiz.status === quizService.GameStatus.COMPLETED || quiz.status === quizService.GameStatus.ENDED) {
      res.status(200).json(quiz);
    } else {
      // For active games, filter out secret information
      const excludeKeys = ["secretPrompt", "averageScore"];
      const retObj = Object.fromEntries(
        Object.entries(quiz).filter(([key]) => !excludeKeys.includes(key))
      );
      
      if (retObj.participants) {
        retObj.participants = retObj.participants.map((participant: participationService.Participant) => {
          const {score, guessPrompt, ...rest} = participant;
          return rest;
        });
      }
      
      res.status(200).json(retObj);
    }
  } catch (error: any) {
    res.status(500).send({error: error.message});
  }
};

export const createGame = async (req: Request, res: Response) => {
  const {secretPrompt, imageName, gameId, minBet, maxParticipants, durationHours} = req.body;
  console.log("createGame:", {gameId, minBet, maxParticipants, durationHours});
  
  try {
    await quizService.createGameFromGeneration(
      secretPrompt,
      imageName,
      gameId,
      minBet,
      maxParticipants,
      durationHours
    );
    
    res.status(201).json({message: "Game created successfully", gameId});
  } catch (error: any) {
    res.status(500).send({error: error.message});
  }
};

export const endGame = async (req: Request, res: Response) => {
  const {gameId} = req.params;
  console.log("endGame:", gameId);
  
  try {
    await quizService.endGame(gameId);
    res.status(200).json({message: "Game ended successfully"});
  } catch (error: any) {
    res.status(500).send({error: error.message});
  }
};
