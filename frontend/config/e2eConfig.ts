// E2E Testing Configuration for Frontend
export const E2E_CONFIG = {
  // UI update intervals for E2E testing
  REFRESH_INTERVAL_MS: process.env.NODE_ENV === 'development' ? 5000 : 30000,
  LEADERBOARD_REFRESH_MS: 10000,
  GAME_STATE_REFRESH_MS: 5000,
  
  // Debug settings
  ENABLE_DEBUG_TOOLS: process.env.NUXT_PUBLIC_ENABLE_DEBUG_TOOLS === 'true',
  SHOW_GAME_TIMER: process.env.NUXT_PUBLIC_SHOW_GAME_TIMER === 'true',
  SHOW_DETAILED_LOGS: process.env.NODE_ENV === 'development',
  
  // API settings
  API_TIMEOUT_MS: 10000,
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
  
  // Solana settings
  SOLANA_NETWORK: (process.env.NUXT_PUBLIC_SOLANA_NETWORK as 'devnet' | 'testnet' | 'mainnet-beta') || 'devnet',
  SOLANA_RPC_URL: process.env.NUXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
  
  // Game display settings
  MIN_BET_DISPLAY: 0.001,
  MAX_BET_DISPLAY: 1.0,
  DEFAULT_BET_AMOUNT: 0.01,
  
  // UI feedback timings
  NOTIFICATION_DURATION_MS: 4000,
  LOADING_TIMEOUT_MS: 15000,
  WALLET_CONNECTION_TIMEOUT_MS: 30000,
};

// Production configuration (for reference)
export const PRODUCTION_CONFIG = {
  REFRESH_INTERVAL_MS: 60000,      // 1 minute
  LEADERBOARD_REFRESH_MS: 30000,   // 30 seconds
  GAME_STATE_REFRESH_MS: 30000,    // 30 seconds
  ENABLE_DEBUG_TOOLS: false,
  SHOW_GAME_TIMER: false,
  SHOW_DETAILED_LOGS: false,
};

// Get current configuration based on environment
export const getCurrentFrontendConfig = () => {
  const isE2E = process.env.NODE_ENV === 'development' || 
                process.env.NUXT_PUBLIC_ENABLE_DEBUG_TOOLS === 'true';
  
  return isE2E ? E2E_CONFIG : PRODUCTION_CONFIG;
};

// Format time for display
export const formatTimeRemaining = (seconds: number): string => {
  if (seconds <= 0) return '00:00';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// Calculate percentage of time remaining
export const getTimePercentage = (remaining: number, total: number): number => {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, (remaining / total) * 100));
};

// Get appropriate refresh color based on time remaining
export const getTimerColor = (percentage: number): string => {
  if (percentage > 50) return 'success';
  if (percentage > 20) return 'warning';
  return 'error';
};

// Debug logging helper
export const debugLog = (message: string, data?: any) => {
  if (E2E_CONFIG.SHOW_DETAILED_LOGS) {
    console.log(`[E2E Debug] ${message}`, data || '');
  }
};