import {Request, Response} from "express";
import * as problemService from "../services/problemService";

export const getLatestProblem = async (req: Request, res: Response) => {
  // 最新の問題の情報を取得する
  console.log("getLatestProblem");
  try {
    const problem = await problemService.getLatestProblem();
    console.log("problem from controller:", problem);
    // 以下は秘密の情報なので返却情報から除外する
    const excludeKeys = ["secretPrompt"];
    if (!problem) {
      throw new Error("問題情報の取得ができませんでした");
    }
    const retObj = Object.fromEntries(
      Object.entries(problem).filter(([key]) => !excludeKeys.includes(key))
    );
    res.status(200).json(retObj);
  } catch (error: any) {
    res.status(500).send({error: error.message});
  }
};
