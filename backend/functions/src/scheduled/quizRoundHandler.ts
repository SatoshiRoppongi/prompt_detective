/* eslint-disable max-len */
// TODO: Open AIのAPIを使ってsecret promptを生成する
//  「50文字程度で意味のない文章を1つ作成してください」
// secret promptを利用して画像を生成する(dall-e3)
// 生成された画像をCloud Storageに格納する

import * as functions from "firebase-functions";
import * as dotenv from "dotenv";
import {v4 as uuidv4} from "uuid";

dotenv.config();

import {uploadImageFromUrl} from "../services/storageService";
import {QuizWithParticipant, getActiveQuiz, endGame, completeGame, createGameFromGeneration} from "../services/quizService";

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

const fixQuizResult = async (activeQuiz: QuizWithParticipant | null) => {
  // デバック作業等で distributeトランザクションを作成する必要がある場合trueにする
  const skipDistribute = false;

  if (!activeQuiz || !activeQuiz.id) {
    console.log("No active quiz to finalize");
    return;
  }

  // End the game first
  await endGame(activeQuiz.id);

  if (!skipDistribute && activeQuiz.participants.length > 0) {
    // Find the winner (highest score)
    const winner = activeQuiz.participants.reduce((prev, current) => {
      return (prev.score > current.score) ? prev : current;
    });

    // 最新のクイズ情報から、ウォレットアドレスとスコアの組みを抽出する
    const scores: [string, number][] = activeQuiz.participants.map((participant) => {
      return [
        participant.walletAddress,
        participant.score,
      ];
    });
    console.log("Distributing to scores:", scores);
    await distributes(scores);

    // Mark game as completed with winner info
    await completeGame(activeQuiz.id, winner.walletAddress, winner.score);
  }
};

// Firebase Function
export const scheduledQuizRoundHandler =
  functions.pubsub.schedule("every day 19:00").
    timeZone("Asia/Tokyo").
    onRun(async () => {
      // Get current active quiz instead of latest
      const activeQuiz = await getActiveQuiz();

      // 締め対象のクイズの参加者が1人以下だったらsol分配、新規画像生成を行わない
      if (activeQuiz && activeQuiz.participants.length <= 1) {
        console.log("Active quiz has 1 or fewer participants, skipping finalization");
        return;
      }
      // クイズの締め処理を行う
      await fixQuizResult(activeQuiz);

      // 画像生成のお題となるプロンプトを生成する
      const geneartedPrompt = await geneartePrompt();
      console.log("generatedPrompt:", geneartedPrompt.choices[0].message.content);

      const secretPrompt = geneartedPrompt.choices[0].message.content;

      if (!secretPrompt) {
        console.error("Failed to generate secret prompt");
        return null;
      }

      const generatedImage = await generateImage(secretPrompt);
      const imageUrl = generatedImage.data[0].url;

      if (!imageUrl) {
        console.error("Failed to generate image");
        return null;
      }

      // 画像にランダムな名前をつける
      const gameId = uuidv4();

      try {
        await uploadImageFromUrl(imageUrl, gameId);
        console.log("Image generated and uploaded successfully");

        // Use the new game creation method with proper lifecycle management
        await createGameFromGeneration(
          secretPrompt,
          `${gameId}.jpg`,
          gameId,
          100000000, // 0.1 SOL minimum bet
          100, // max participants
          24 // 24 hour duration
        );

        console.log(`New game created with ID: ${gameId}`);
      } catch (error) {
        console.error("Error generating image or creating game:", error);
      }
      return null;
    });
