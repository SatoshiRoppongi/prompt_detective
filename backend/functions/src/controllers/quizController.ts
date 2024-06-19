import {Request, Response} from "express";
import * as quizService from "../services/quizService";

export const getLatestQuiz = async (req: Request, res: Response) => {
  // 最新の問題の情報を取得する
  console.log("getLatestQuiz");
  try {
    const quiz = await quizService.getLatestQuiz();
    console.log("quiz from controller:", quiz);
    // 以下は秘密の情報なので返却情報から除外する
    const excludeKeys = ["secretPrompt"];
    if (!quiz) {
      throw new Error("問題情報の取得ができませんでした");
    }
    const retObj = Object.fromEntries(
      Object.entries(quiz).filter(([key]) => !excludeKeys.includes(key))
    );
    res.status(200).json(retObj);
  } catch (error: any) {
    res.status(500).send({error: error.message});
  }
};
