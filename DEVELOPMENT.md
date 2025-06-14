# Development Setup Guide

## Environment Configuration

### Frontend Environment Variables (.env)

The frontend requires the following environment variables in `frontend/.env`:

```bash
# Backend API Configuration
API_BASE_URL=http://localhost:5001

# Solana Configuration
PROGRAM_ID="CEbjWJ1jmh5VfpPFJdvwk8HrLFFZEW1f1YQDZ2SfZCVC"

# Solana Network (choose one)
# For devnet (recommended for testing)
CLUSTER_URL="https://api.devnet.solana.com"
# For local validator (requires solana-test-validator running)
# CLUSTER_URL="http://127.0.0.1:8899"

# Mock Mode (for development without Solana dependencies)
MOCK_SOLANA=true
```

### Mock Mode Benefits

When `MOCK_SOLANA=true`:
- ✅ No Phantom wallet required
- ✅ No Solana network connection needed
- ✅ Simulated wallet address and balance
- ✅ Full UI testing with backend API integration
- ✅ Automated fallback for failed Solana operations

### Development Workflow

1. **Start Backend Server**:
   ```bash
   cd backend/functions
   npm run dev
   ```

2. **Start Frontend Server**:
   ```bash
   cd frontend
   npm run dev
   ```

3. **Test Data Setup** (optional):
   ```bash
   cd backend/functions
   node setup_firestore_test.js
   ```

### Available Test Features

- **Wallet Connection**: Mock wallet with address `GLcDQyrP9LurDBnf7rFjS9N9tXWraDb3Djsmns3MJoeD`
- **Balance Display**: 1.5 SOL dummy balance
- **Quiz Participation**: Simulated transaction with 1-second delay
- **Backend Integration**: Real Firestore database operations
- **Image Display**: Placeholder images from Unsplash

### Switching to Production Mode

To test with real Solana transactions:
1. Set `MOCK_SOLANA=false` or remove the variable
2. Install Phantom wallet browser extension
3. Ensure devnet connectivity
4. Have test SOL in your wallet

### Troubleshooting

**Connection Refused Errors**: 
- Ensure backend server is running on port 5001
- Check that Firestore service account credentials are configured

**Solana Transaction Failures**:
- Enable mock mode for development
- Verify program is deployed to the specified network
- Check wallet has sufficient SOL balance

**Image Loading Issues**:
- Placeholder images are used for demo data
- Real images require Firebase Storage configuration