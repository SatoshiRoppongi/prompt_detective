# Deployment Guide

## Prerequisites
- Firebase CLI installed and configured
- Solana CLI installed and configured
- Docker installed (for blockchain program building)

## Deployment Steps

### 1. Frontend (Nuxt 3)
```bash
cd frontend
npm run build
npm run generate
# Deploy to hosting service (Vercel, Netlify, Firebase Hosting)
```

### 2. Backend (Firebase Functions)
```bash
cd backend
firebase deploy --only functions
```

### 3. Blockchain (Solana Program)
```bash
cd blockchain/prompt_detective
anchor build  # or use Docker
anchor deploy --provider.cluster devnet
# Update PROGRAM_ID in environment variables
```

## Environment Variables

### Frontend (.env.production)
- API_BASE_URL: Production Firebase Functions URL
- PROGRAM_ID: Deployed Solana program ID
- CLUSTER_URL: Solana cluster URL (mainnet/devnet)
- MOCK_SOLANA: false

### Backend (Firebase Functions environment)
- OPENAI_API_KEY: OpenAI API key
- PROGRAM_ID: Deployed Solana program ID
- SECRET_KEY: Solana wallet private key
- CLUSTER_URL: Solana cluster URL

## Security Checklist
- [ ] Remove all test/debug console.log statements
- [ ] Update secret keys in production environment
- [ ] Enable CORS restrictions
- [ ] Set up monitoring and error tracking
- [ ] Test wallet connection on target network
- [ ] Verify Solana program deployment
- [ ] Test end-to-end quiz flow