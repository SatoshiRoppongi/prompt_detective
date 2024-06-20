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
        const {score, ...rest} = participant;
        return rest;
      });
    }
    res.status(200).json(retObj);
  } catch (error: any) {
    res.status(500).send({error: error.message});
  }
};
