// TODO: Open AIのAPIを使ってsecret promptを生成する
//  「50文字程度で意味のない文章を1つ作成してください」
// secret promptを利用して画像を生成する(dall-e3)
// 生成された画像をCloud Storageに格納する

import * as functions from "firebase-functions";
import * as dotenv from "dotenv";
console.log("test:", dotenv.config);
dotenv.config();

import OpenAI from "openai";

console.log("processnev:", process.env.OPENAI_API_KEY);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const geneartePrompt = async () => {
  // 問題文となる文章のみを生成することを保証するプロンプトにする
  const prompt = "50文字程度のランダムで意味のない文章を1つ作成してください";

  // TODO: 問題文となるプロンプト以外が含まないかのバリデーションと、含む場合は正規化を行う
  console.log("processnev:", process.env["OPENAI_API_KEY"]);

  const chatCompletion = await openai.chat.completions.create({
    messages: [{role: "user", content: prompt}],
    model: "gpt-3.5-turbo",
  });
  return chatCompletion;
};

// Firebase Function
export const scheduledGenerateImage =
    functions.pubsub.schedule("every day 19:00").
      timeZone("Asia/Tokyo").
      onRun(async (context) => {
        // 画像生成のお題となるプロンプトを生成する
        const geneartedPrompt = await geneartePrompt();
        console.log("generatedPrompt:", geneartedPrompt.choices[0].message);
        return null;
      });
