// E2E Testing Configuration
export const E2E_CONFIG = {
  // Game timing for fast testing cycles
  GAME_DURATION_MINUTES: process.env.GAME_DURATION_MINUTES ?
    parseInt(process.env.GAME_DURATION_MINUTES) : 5,

  GRACE_PERIOD_SECONDS: process.env.GRACE_PERIOD_SECONDS ?
    parseInt(process.env.GRACE_PERIOD_SECONDS) : 30,

  SCORING_TIMEOUT_SECONDS: process.env.SCORING_TIMEOUT_SECONDS ?
    parseInt(process.env.SCORING_TIMEOUT_SECONDS) : 60,

  DISTRIBUTION_TIMEOUT_SECONDS: process.env.DISTRIBUTION_TIMEOUT_SECONDS ?
    parseInt(process.env.DISTRIBUTION_TIMEOUT_SECONDS) : 30,

  AUTO_START_INTERVAL_MINUTES: process.env.AUTO_START_INTERVAL_MINUTES ?
    parseInt(process.env.AUTO_START_INTERVAL_MINUTES) : 10,

  // Feature flags
  ENABLE_SHORT_CYCLES: process.env.ENABLE_SHORT_CYCLES === "true",
  ENABLE_AUTO_START: process.env.ENABLE_AUTO_START === "true",
  ENABLE_REAL_IMAGE_GENERATION: process.env.ENABLE_REAL_IMAGE_GENERATION === "true",

  // Cost control flags
  OPENAI_API_ENABLED: process.env.OPENAI_API_ENABLED !== "false", // Default: enabled
  AUTO_GAME_GENERATION_ENABLED: process.env.AUTO_GAME_GENERATION_ENABLED !== "false", // Default: enabled
  MANUAL_APPROVAL_REQUIRED: process.env.MANUAL_APPROVAL_REQUIRED === "true", // Default: disabled

  // Testing settings
  MIN_BET_AMOUNT: 0.001, // Minimal SOL for testing
  MAX_BET_AMOUNT: 1.0, // Reasonable max for testing
  DEFAULT_QUIZ_PROMPT: "A cute robot playing in a garden",

  // OpenAI settings for testing
  IMAGE_SIZE: "1024x1024" as const,
  IMAGE_QUALITY: "standard" as const,
  IMAGE_STYLE: "vivid" as const,

  // Solana settings
  SOLANA_NETWORK: process.env.SOLANA_NETWORK || "devnet",
  SOLANA_RPC_URL: process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",

  // Scheduler settings for E2E
  SCHEDULER_ENABLED: process.env.ENABLE_AUTO_START === "true",
  SCHEDULER_CRON: "*/10 * * * *", // Every 10 minutes
  SCHEDULER_TIMEZONE: "Asia/Tokyo",
};

// Production configuration (for reference)
export const PRODUCTION_CONFIG = {
  GAME_DURATION_MINUTES: 1440, // 24 hours
  GRACE_PERIOD_SECONDS: 300, // 5 minutes
  SCORING_TIMEOUT_SECONDS: 300, // 5 minutes
  DISTRIBUTION_TIMEOUT_SECONDS: 120, // 2 minutes
  AUTO_START_INTERVAL_MINUTES: 1440, // 24 hours
  SCHEDULER_CRON: "0 19 * * *", // 7 PM JST daily
};

// Get current configuration based on environment
export const getCurrentConfig = () => {
  const isE2E = process.env.NODE_ENV === "e2e-testing" ||
                process.env.ENABLE_SHORT_CYCLES === "true";

  return isE2E ? E2E_CONFIG : PRODUCTION_CONFIG;
};

// Configuration validation
export const validateConfig = (config: any) => {
  const errors: string[] = [];

  if (config.GAME_DURATION_MINUTES < 1) {
    errors.push("GAME_DURATION_MINUTES must be at least 1");
  }

  if (config.GRACE_PERIOD_SECONDS < 10) {
    errors.push("GRACE_PERIOD_SECONDS must be at least 10");
  }

  if (config.MIN_BET_AMOUNT <= 0) {
    errors.push("MIN_BET_AMOUNT must be positive");
  }

  if (config.MAX_BET_AMOUNT < config.MIN_BET_AMOUNT) {
    errors.push("MAX_BET_AMOUNT must be greater than MIN_BET_AMOUNT");
  }

  if (!config.SOLANA_RPC_URL) {
    errors.push("SOLANA_RPC_URL is required");
  }

  return errors;
};

// Log current configuration
export const logCurrentConfig = () => {
  const config = getCurrentConfig();
  const isE2E = process.env.NODE_ENV === "e2e-testing" ||
                process.env.ENABLE_SHORT_CYCLES === "true";

  console.log("🎮 Game Configuration:", {
    mode: isE2E ? "E2E Testing" : "Production",
    gameDurationMinutes: config.GAME_DURATION_MINUTES,
    gracePeriodSeconds: config.GRACE_PERIOD_SECONDS,
    autoStartInterval: config.AUTO_START_INTERVAL_MINUTES,
    enableShortCycles: E2E_CONFIG.ENABLE_SHORT_CYCLES,
    enableAutoStart: E2E_CONFIG.ENABLE_AUTO_START,
    enableRealImageGeneration: E2E_CONFIG.ENABLE_REAL_IMAGE_GENERATION,
    solanaNetwork: E2E_CONFIG.SOLANA_NETWORK,
  });

  // Validate configuration
  const errors = validateConfig(isE2E ? E2E_CONFIG : config);
  if (errors.length > 0) {
    console.error("❌ Configuration errors:", errors);
    throw new Error(`Configuration validation failed: ${errors.join(", ")}`);
  }

  console.log("✅ Configuration validated successfully");
};
