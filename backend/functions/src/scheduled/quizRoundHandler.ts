/* eslint-disable max-len */
// TODO: Open AIのAPIを使ってsecret promptを生成する
//  「50文字程度で意味のない文章を1つ作成してください」
// secret promptを利用して画像を生成する(dall-e3)
// 生成された画像をCloud Storageに格納する

import * as functions from "firebase-functions";
import * as dotenv from "dotenv";
import {v4 as uuidv4} from "uuid";

import {FieldValue} from "firebase-admin/firestore";


dotenv.config();

import {uploadImageFromUrl} from "../services/storageService";
import {Quiz, QuizWithParticipant, createQuiz, getLatestQuiz} from "../services/quizService";

import OpenAI from "openai";
// import {createQuizStateAccount, distributes} from "../services/sendTransaction";
import {distributes} from "../services/sendTransaction";
// import {Participant} from "../services/participationService";

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

const generateImage = async (promptString: string) => {
  const prompt = promptString;

  const imageGeneration = await openai.images.generate({
    model: "dall-e-3",
    prompt: prompt,
    n: 1,
    size: "1024x1024",
  });

  return imageGeneration;
};

const fixQuizResult = async (latestQuiz: QuizWithParticipant | null) => {
  // デバック作業等で distributeトランザクションを作成する必要がある場合trueにする
  const skipDistribute = false;

  if (!skipDistribute && latestQuiz) {
    // 最新のクイズ情報から、ウォレットアドレスとスコアの組みを抽出する
    const scores: [string, number][] = latestQuiz.participants.map((participant) => {
      return [
        participant.walletAddress,
        participant.score,
      ];
    });
    console.log(scores);
    await distributes(scores);
  }
};

// Firebase Function
export const scheduledQuizRoundHandler =
  functions.pubsub.schedule("every day 19:00").
    timeZone("Asia/Tokyo").
    onRun(async (context) => {
      const latestQuiz = await getLatestQuiz();

      // 締め対象のクイズの参加者が1人以下だったらsol分配、新規画像生成を行わない
      if (latestQuiz && latestQuiz.participants.length <= 1) {
        return;
      }
      // クイズの締め処理を行う
      await fixQuizResult(latestQuiz);

      // 画像生成のお題となるプロンプトを生成する
      const geneartedPrompt = await geneartePrompt();
      console.log("generatedPrompt:", geneartedPrompt.choices[0].message.content);

      const secretPrompt = geneartedPrompt.choices[0].message.content;

      if (!secretPrompt) {
        // is it proper handling?
        return null;
      }

      const generatedImage = await generateImage(secretPrompt);
      const imageUrl = generatedImage.data[0].url;

      if (!imageUrl) {
        // is it proper handling?
        return null;
      }

      // 画像にランダムな名前をつける
      const randomName = uuidv4();

      try {
        await uploadImageFromUrl(imageUrl, randomName);
        console.log("Image generated and uploaded successfully");

        const quiz: Quiz = {
          id: randomName,
          imageName: `${randomName}.jpg`,
          secretPrompt: secretPrompt,
          totalParticipants: 0,
          averageScore: 0,
          pot: 0,
          createdAt: FieldValue.serverTimestamp(),
        };

        // Firestoreにメタデータを保存
        await createQuiz(quiz);
      } catch (error) {
        console.error("Error generating image:", error);
      }
      return null;
    });
