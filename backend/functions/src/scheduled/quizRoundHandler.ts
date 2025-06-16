/* eslint-disable max-len */
// TODO: Open AIのAPIを使ってsecret promptを生成する
//  「50文字程度で意味のない文章を1つ作成してください」
// secret promptを利用して画像を生成する(dall-e3)
// 生成された画像をCloud Storageに格納する

import * as functions from "firebase-functions";
import * as dotenv from "dotenv";
import {v4 as uuidv4} from "uuid";

dotenv.config();

import {QuizWithParticipant, getActiveQuiz, endGame, completeGame, createGameFromGeneration} from "../services/quizService";
import {
  getSchedulerConfig,
  recordSchedulerRun
} from "../services/schedulerService";
import {calculateQuizResults, updateDistributionStatus} from "../services/resultCalculationService";
import {distributeQuizPrizes} from "../services/distributionService";
import {initializeGameState, transitionPhase, getGameTimer, GamePhase} from "../services/gameStateService";
import {generateRandomQuizPrompt, generateAndUploadImage, ImageSize, ImageStyle, ImageQuality} from "../services/imageGenerationService";

// import {createQuizStateAccount, distributes} from "../services/sendTransaction";
import {distributes, initializeGame as initializeSolanaGame, endGame as endSolanaGame, distributeWinnings} from "../services/solanaService";
// import {Participant} from "../services/participationService";

const fixQuizResult = async (activeQuiz: QuizWithParticipant | null) => {
  // デバック作業等で distributeトランザクションを作成する必要がある場合trueにする
  const skipDistribute = false;

  if (!activeQuiz || !activeQuiz.id) {
    console.log("No active quiz to finalize");
    return;
  }

  console.log(`🔄 Starting quiz finalization for ID: ${activeQuiz.id}`);

  try {
    // Transition to scoring phase
    const gameTimer = await getGameTimer(activeQuiz.id);
    if (gameTimer && gameTimer.phase !== GamePhase.SCORING) {
      await transitionPhase(gameTimer, GamePhase.SCORING, 'condition', 'Quiz finalization started');
    }

    // Calculate comprehensive quiz results
    const quizResult = await calculateQuizResults(activeQuiz);
    console.log(`✅ Quiz results calculated: ${quizResult.winners.length} winners`);

    // Transition to results phase
    if (gameTimer) {
      const updatedTimer = await getGameTimer(activeQuiz.id);
      if (updatedTimer) {
        await transitionPhase(updatedTimer, GamePhase.RESULTS, 'condition', 'Results calculated');
      }
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

    if (!skipDistribute && quizResult.winners.length > 0) {
      try {
        // Transition to distribution phase
        const updatedTimer = await getGameTimer(activeQuiz.id);
        if (updatedTimer) {
          await transitionPhase(updatedTimer, GamePhase.DISTRIBUTION, 'condition', 'Starting prize distribution');
        }

        // Use new comprehensive distribution service
        const distributionSummary = await distributeQuizPrizes(quizResult);
        
        if (distributionSummary.status === 'completed') {
          console.log(`🎉 All prizes distributed successfully for quiz ${activeQuiz.id}`);
          await updateDistributionStatus(activeQuiz.id, 'distributed');
        } else if (distributionSummary.status === 'partial') {
          console.log(`⚠️ Partial distribution for quiz ${activeQuiz.id}: ${distributionSummary.successfulTransactions}/${distributionSummary.successfulTransactions + distributionSummary.failedTransactions} successful`);
          await updateDistributionStatus(activeQuiz.id, 'failed', 
            `Partial distribution: ${distributionSummary.failedTransactions} transactions failed`);
        } else {
          console.log(`❌ Distribution failed for quiz ${activeQuiz.id}`);
          await updateDistributionStatus(activeQuiz.id, 'failed', 'All distribution transactions failed');
          
          // Fallback to legacy system if new distribution fails completely
          console.log('🔄 Attempting fallback distribution...');
          const scores: [string, number][] = activeQuiz.participants.map((participant) => {
            return [participant.walletAddress, participant.score];
          });
          await distributes(scores);
        }

        // Mark game as completed with winner info
        const primaryWinner = quizResult.winners[0];
        await completeGame(activeQuiz.id, primaryWinner.walletAddress, primaryWinner.score);
        
        // Transition to completed phase
        const finalTimer = await getGameTimer(activeQuiz.id);
        if (finalTimer) {
          await transitionPhase(finalTimer, GamePhase.COMPLETED, 'condition', 'Quiz fully completed');
        }
        
        console.log(`✅ Quiz ${activeQuiz.id} finalization completed`);
        
      } catch (distributionError) {
        console.error(`❌ Distribution service error for quiz ${activeQuiz.id}:`, distributionError);
        
        // Fallback to old distribution method
        console.log('🔄 Falling back to legacy distribution system...');
        try {
          for (const winner of quizResult.winners) {
            await distributeWinnings(activeQuiz.id, winner.walletAddress, winner.prize);
            console.log(`✅ Legacy distribution to ${winner.walletAddress}: ${winner.prize} lamports`);
          }
          
          await updateDistributionStatus(activeQuiz.id, 'distributed');
          const primaryWinner = quizResult.winners[0];
          await completeGame(activeQuiz.id, primaryWinner.walletAddress, primaryWinner.score);
          
        } catch (legacyError) {
          console.error(`❌ Legacy distribution also failed:`, legacyError);
          await updateDistributionStatus(activeQuiz.id, 'failed', `Both new and legacy distribution failed: ${legacyError}`);
        }
      }
    } else {
      console.log(`ℹ️ No distribution needed for quiz ${activeQuiz.id}`);
      await completeGame(activeQuiz.id, "", 0);
    }

  } catch (error) {
    console.error(`❌ Error in quiz finalization: ${error}`);
    // Update distribution status as failed
    if (activeQuiz.id) {
      await updateDistributionStatus(activeQuiz.id, 'failed', `Finalization error: ${error}`);
    }
    throw error;
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
    const secretPrompt = await generateRandomQuizPrompt();
    console.log("Generated secret prompt:", secretPrompt);

    if (!secretPrompt) {
      const error = "Failed to generate secret prompt";
      console.error(error);
      return { success: false, error };
    }

    // 画像にランダムな名前をつける
    const gameId = uuidv4();

    try {
      // 新しい画像生成サービスを使用
      const generatedImage = await generateAndUploadImage({
        prompt: secretPrompt,
        style: ImageStyle.VIVID,
        size: ImageSize.SQUARE,
        quality: ImageQuality.STANDARD,
        purpose: 'quiz',
        quizId: gameId
      });

      console.log("Image generated and uploaded successfully with new service");
      console.log(`Image ID: ${generatedImage.id}, Status: ${generatedImage.status}`);

      // Use configuration values for game creation
      await createGameFromGeneration(
        secretPrompt,
        generatedImage.fileName, // Use the generated image filename
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

      // Initialize game state management
      try {
        const gameTimer = await initializeGameState(gameId, config.defaultDuration / 60, true); // Convert minutes to hours
        await transitionPhase(gameTimer, GamePhase.ACTIVE, 'condition', 'New quiz created and activated');
        console.log(`🎮 Game state initialized and activated for ID: ${gameId}`);
      } catch (error) {
        console.error(`❌ Failed to initialize game state: ${error}`);
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
