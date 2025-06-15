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
import {
  getSchedulerConfig,
  recordSchedulerRun
} from "../services/schedulerService";

import OpenAI from "openai";
// import {createQuizStateAccount, distributes} from "../services/sendTransaction";
import {distributes, initializeGame as initializeSolanaGame, endGame as endSolanaGame, distributeWinnings} from "../services/solanaService";
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

  // End the Solana game
  try {
    await endSolanaGame(activeQuiz.id);
    console.log(`✅ Solana game ended for ID: ${activeQuiz.id}`);
  } catch (error) {
    console.error(`❌ Failed to end Solana game: ${error}`);
  }

  if (!skipDistribute && activeQuiz.participants.length > 0) {
    // Find the winner (highest score)
    const winner = activeQuiz.participants.reduce((prev, current) => {
      return (prev.score > current.score) ? prev : current;
    });

    // Calculate winner's prize (total pot minus platform fee)
    const totalPot = activeQuiz.pot * 1000000000; // Convert SOL to lamports
    const platformFee = Math.floor(totalPot * 0.05); // 5% platform fee
    const winnerAmount = totalPot - platformFee;

    // Distribute winnings via Solana smart contract
    try {
      await distributeWinnings(activeQuiz.id, winner.walletAddress, winnerAmount);
      console.log(`✅ Winnings distributed to ${winner.walletAddress}: ${winnerAmount} lamports`);
    } catch (error) {
      console.error(`❌ Failed to distribute winnings: ${error}`);
      // Fallback to legacy system if Solana distribution fails
      const scores: [string, number][] = activeQuiz.participants.map((participant) => {
        return [participant.walletAddress, participant.score];
      });
      await distributes(scores);
    }

    // Mark game as completed with winner info
    await completeGame(activeQuiz.id, winner.walletAddress, winner.score);
  }
};

// Extracted logic for reuse by both scheduled and manual runs
export const runQuizGeneration = async (): Promise<{ success: boolean; error?: string; gamesGenerated?: number }> => {
  try {
    console.log("🎮 Starting quiz generation process");
    
    // Check scheduler configuration
    const config = await getSchedulerConfig();
    if (!config) {
      const error = "Failed to get scheduler configuration";
      console.error(error);
      return { success: false, error };
    }
    
    if (!config.enabled) {
      const message = "Scheduler is disabled, skipping quiz generation";
      console.log(message);
      await recordSchedulerRun("skipped", message);
      return { success: true, error: message, gamesGenerated: 0 };
    }
    
    // Get current active quiz instead of latest
    const activeQuiz = await getActiveQuiz();

    // Check minimum participants threshold
    const minParticipants = config.minParticipants || 2;
    if (activeQuiz && activeQuiz.participants.length < minParticipants) {
      const message = `Active quiz has ${activeQuiz.participants.length} participants (minimum: ${minParticipants}), skipping finalization`;
      console.log(message);
      await recordSchedulerRun("skipped", message);
      return { success: true, error: message, gamesGenerated: 0 };
    }
    
    // クイズの締め処理を行う
    await fixQuizResult(activeQuiz);

    // Skip generation if auto generation is disabled
    if (!config.autoGeneration) {
      const message = "Auto generation is disabled, only finalizing existing quiz";
      console.log(message);
      await recordSchedulerRun("success", message, 0);
      return { success: true, error: message, gamesGenerated: 0 };
    }

    // 画像生成のお題となるプロンプトを生成する
    const geneartedPrompt = await geneartePrompt();
    console.log("generatedPrompt:", geneartedPrompt.choices[0].message.content);

    const secretPrompt = geneartedPrompt.choices[0].message.content;

    if (!secretPrompt) {
      const error = "Failed to generate secret prompt";
      console.error(error);
      return { success: false, error };
    }

    const generatedImage = await generateImage(secretPrompt);
    const imageUrl = generatedImage.data[0].url;

    if (!imageUrl) {
      const error = "Failed to generate image";
      console.error(error);
      return { success: false, error };
    }

    // 画像にランダムな名前をつける
    const gameId = uuidv4();

    try {
      await uploadImageFromUrl(imageUrl, gameId);
      console.log("Image generated and uploaded successfully");

      // Use configuration values for game creation
      await createGameFromGeneration(
        secretPrompt,
        `${gameId}.jpg`,
        gameId,
        config.defaultMinBet,
        config.defaultMaxParticipants,
        config.defaultDuration
      );

      // Initialize Solana smart contract game
      try {
        await initializeSolanaGame(
          gameId, 
          config.defaultMinBet, 
          config.defaultMaxParticipants, 
          config.defaultDuration
        );
        console.log(`✅ Solana game initialized for ID: ${gameId}`);
      } catch (error) {
        console.error(`❌ Failed to initialize Solana game: ${error}`);
      }

      console.log(`✅ New game created with ID: ${gameId}`);
      await recordSchedulerRun("success", undefined, 1);
      return { success: true, gamesGenerated: 1 };
      
    } catch (error: any) {
      console.error("Error generating image or creating game:", error);
      return { success: false, error: error.message };
    }
  } catch (error: any) {
    console.error("Error in quiz generation:", error);
    return { success: false, error: error.message };
  }
};

// Firebase Function
export const scheduledQuizRoundHandler =
  functions.pubsub.schedule("every day 19:00").
    timeZone("Asia/Tokyo").
    onRun(async () => {
      console.log("📅 Scheduled quiz round handler triggered");
      
      const result = await runQuizGeneration();
      
      if (!result.success && result.error && !result.error.includes("skipping") && !result.error.includes("disabled")) {
        await recordSchedulerRun("failed", result.error);
        console.error(`❌ Scheduled run failed: ${result.error}`);
      }
      
      return null;
    });
