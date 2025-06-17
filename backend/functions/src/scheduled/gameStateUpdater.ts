import * as functions from "firebase-functions";
import { updateAllActiveGameStates } from "../services/gameStateService";

/**
 * 定期的にアクティブなゲーム状態を更新する
 * 毎分実行される
 */
export const scheduledGameStateUpdater = functions.pubsub
  .schedule('every 1 minutes')
  .timeZone('Asia/Tokyo')
  .onRun(async () => {
    console.log('🕐 Scheduled game state updater triggered');
    
    try {
      await updateAllActiveGameStates();
      console.log('✅ All active game states updated successfully');
      return null;
    } catch (error) {
      console.error('❌ Error updating game states:', error);
      throw error;
    }
  });