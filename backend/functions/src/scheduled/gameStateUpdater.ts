import * as functions from "firebase-functions";
import {updateAllActiveGameStates} from "../services/gameStateService";
import {getCurrentConfig} from "../config/e2eConfig";

/**
 * 定期的にアクティブなゲーム状態を更新する
 * E2Eテスト時は30秒毎、通常は1分毎
 */
export const scheduledGameStateUpdater = functions.pubsub
  .schedule("every 30 seconds")
  .timeZone("Asia/Tokyo")
  .onRun(async () => {
    console.log("🕐 Scheduled game state updater triggered");
    const config = getCurrentConfig();
    console.log(`⚙️  Running in ${(config as any).ENABLE_SHORT_CYCLES ? "E2E" : "production"} mode`);

    try {
      await updateAllActiveGameStates();
      console.log("✅ All active game states updated successfully");
      return null;
    } catch (error) {
      console.error("❌ Error updating game states:", error);
      throw error;
    }
  });
