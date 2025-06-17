# 🧪 End-to-End Testing Configuration

## 🎮 Short Game Cycle Configuration

### Game Duration Settings
```typescript
// For E2E testing - Short cycles
export const E2E_GAME_CONFIG = {
  GAME_DURATION_MINUTES: 5,        // Instead of 24 hours
  GRACE_PERIOD_SECONDS: 30,        // Instead of 5 minutes
  SCORING_TIMEOUT_SECONDS: 60,     // Quick scoring
  DISTRIBUTION_TIMEOUT_SECONDS: 30, // Quick distribution
  AUTO_START_INTERVAL_MINUTES: 10,  // New game every 10 minutes
};

// Production settings (for reference)
export const PRODUCTION_GAME_CONFIG = {
  GAME_DURATION_MINUTES: 1440,     // 24 hours
  GRACE_PERIOD_SECONDS: 300,       // 5 minutes
  SCORING_TIMEOUT_SECONDS: 300,    // 5 minutes
  DISTRIBUTION_TIMEOUT_SECONDS: 120, // 2 minutes
  AUTO_START_INTERVAL_MINUTES: 1440, // 24 hours
};
```

## 🔧 Required Environment Variables

### Backend Functions (.env)
```env
# Test Environment Flag
NODE_ENV=e2e-testing

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Solana Configuration (Devnet)
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com

# Firebase Configuration
FIREBASE_PROJECT_ID=prompt-detective-backend

# Game Configuration
GAME_DURATION_MINUTES=5
GRACE_PERIOD_SECONDS=30
AUTO_START_INTERVAL_MINUTES=10

# Testing Flags
ENABLE_SHORT_CYCLES=true
ENABLE_AUTO_START=true
ENABLE_REAL_IMAGE_GENERATION=true
```

### Frontend (.env)
```env
# API Configuration
NUXT_PUBLIC_API_BASE=https://us-central1-prompt-detective-backend.cloudfunctions.net/api

# Solana Configuration (Devnet)
NUXT_PUBLIC_SOLANA_NETWORK=devnet
NUXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com

# UI Configuration for testing
NUXT_PUBLIC_ENABLE_DEBUG_TOOLS=true
NUXT_PUBLIC_SHOW_GAME_TIMER=true
NUXT_PUBLIC_REFRESH_INTERVAL=5000
```

## 📝 GitHub Secrets Configuration

Add these secrets to your GitHub repository:

```
FIREBASE_SERVICE_ACCOUNT_KEY=<base64 encoded service account JSON>
OPENAI_API_KEY=<your openai api key>
SOLANA_DEVNET_PRIVATE_KEY=<base64 encoded keypair for devnet>
```

## 🚀 CI/CD Pipeline Configuration

### Required Actions
1. **Build and Test**
2. **Deploy Backend Functions**
3. **Deploy Frontend**
4. **Run E2E Tests**
5. **Notification**

### Deployment Triggers
- **Main Branch**: Full deployment to production
- **Develop Branch**: Deploy to staging environment
- **Pull Requests**: Build and test only
- **Manual**: Deploy specific components

## 🔗 Deployment URLs

### Cloud Environment
- **Frontend**: https://prompt-detective-backend.web.app
- **API**: https://us-central1-prompt-detective-backend.cloudfunctions.net/api
- **Admin Panel**: https://prompt-detective-backend.web.app/admin

### Testing URLs
- **Health Check**: `/health`
- **Game State**: `/gamestate`
- **Active Quiz**: `/activeQuiz`
- **Leaderboard**: `/leaderboard/{quizId}`

## 🧪 E2E Testing Flow

### 1. Pre-test Setup
- Clean Firestore collections
- Reset game state
- Ensure Devnet SOL balance

### 2. Test Sequence
1. **Admin**: Generate random prompt
2. **System**: Create DALL-E image
3. **Admin**: Start game (5-minute cycle)
4. **Users**: Connect wallets
5. **Users**: Place bets and submit guesses
6. **System**: Auto-end game after 5 minutes
7. **System**: Calculate scores
8. **System**: Distribute SOL prizes
9. **System**: Start new game cycle

### 3. Verification Points
- ✅ Image generation successful
- ✅ Game state transitions correct
- ✅ User participation recorded
- ✅ Scoring calculation accurate
- ✅ SOL distribution completed
- ✅ New game cycle started

## 📊 Monitoring and Logging

### Firebase Console Monitoring
- **Functions Logs**: Real-time execution logs
- **Firestore Data**: Game state and user data
- **Performance**: Function execution times
- **Usage**: API call counts

### Custom Monitoring
- Game cycle completion rate
- Image generation success rate
- SOL distribution accuracy
- User engagement metrics

## 🛠️ Development Commands

### Local Testing
```bash
# Start local emulators
firebase emulators:start

# Run with actual OpenAI API
export OPENAI_API_KEY=your_key
npm run dev:cloud

# Test specific endpoints
curl https://your-api/health
curl https://your-api/activeQuiz
```

### Deployment
```bash
# Deploy functions only
firebase deploy --only functions

# Deploy hosting only
firebase deploy --only hosting

# Full deployment
firebase deploy

# Deploy with environment
firebase use production && firebase deploy
```

## 🚨 Troubleshooting

### Common Issues
1. **OpenAI API Quota**: Monitor usage limits
2. **Firebase Cold Starts**: First request may be slow
3. **Solana RPC Limits**: Use private RPC if needed
4. **Firestore Indexes**: Create required indexes
5. **CORS Issues**: Configure proper origins

### Debug Tools
- Firebase Functions logs
- Firestore data inspector
- Solana Explorer (devnet)
- Browser developer tools
- OpenAI API usage dashboard