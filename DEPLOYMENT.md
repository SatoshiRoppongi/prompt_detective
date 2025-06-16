# Deployment Guide - Prompt Detective

## Prerequisites

- Node.js 18+ and npm/yarn
- Rust and Cargo
- Solana CLI tools
- Anchor framework
- Firebase CLI
- Git

## Environment Setup

### 1. Solana Development Environment

```bash
# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/v1.16.0/install)"

# Install Anchor
npm install -g @coral-xyz/anchor-cli

# Configure Solana for development
solana config set --url devnet
solana-keygen new  # Generate keypair if needed
```

### 2. Firebase Setup

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize project (if needed)
firebase init
```

## Solana Program Deployment

### 1. Build and Deploy Smart Contract

```bash
cd blockchain/prompt_detective

# Install dependencies
yarn install

# Build the program
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Note the deployed program ID and update Anchor.toml and environment variables
```

### 2. Program Configuration

Update the following files with your deployed program ID:

- `blockchain/prompt_detective/Anchor.toml`
- `backend/functions/.env` (PROGRAM_ID)
- `frontend/.env` (NUXT_PUBLIC_PROGRAM_ID)

### 3. Initialize Program State

```bash
# Run program tests to verify deployment
anchor test --provider.cluster devnet

# Initialize any required program state accounts
anchor run initialize-state --provider.cluster devnet
```

## Backend Deployment

### 1. Environment Variables

Create `.env` file in `backend/functions/`:

```env
# Solana Configuration
CLUSTER_URL=https://api.devnet.solana.com
PROGRAM_ID=your_deployed_program_id_here
SECRET_KEY=your_solana_keypair_private_key_array

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Firebase Configuration
FIREBASE_PROJECT_ID=your_firebase_project_id
```

### 2. Firebase Functions Deployment

```bash
cd backend

# Install dependencies
cd functions && npm install

# Build TypeScript
npm run build

# Deploy functions
firebase deploy --only functions

# Deploy Firestore rules and indexes
firebase deploy --only firestore
```

### 3. Initialize Scheduler Configuration

```bash
# Run the scheduler setup script
node functions/lib/services/schedulerService.js
```

## Frontend Deployment

### 1. Environment Configuration

Create `.env` file in `frontend/`:

```env
# API Endpoints
NUXT_PUBLIC_API_BASE_URL=https://your-firebase-region-your-project.cloudfunctions.net/api
NUXT_PUBLIC_WS_URL=wss://your-firebase-region-your-project.cloudfunctions.net

# Solana Configuration
NUXT_PUBLIC_CLUSTER_URL=https://api.devnet.solana.com
NUXT_PUBLIC_PROGRAM_ID=your_deployed_program_id_here
```

### 2. Build and Deploy

```bash
cd frontend

# Install dependencies
npm install

# Build for production
npm run build

# Deploy to Firebase Hosting (if configured)
firebase deploy --only hosting

# Or deploy to your preferred hosting platform
```

## Database Initialization

### 1. Firestore Setup

```bash
# Initialize Firestore collections with proper indexes
firebase firestore:delete --all-collections  # Only if starting fresh!

# Import initial data structure
firebase firestore:import initial-data/

# Set up Firestore security rules
firebase deploy --only firestore:rules
```

### 2. Cloud Storage Setup

```bash
# Create storage buckets for game images
gsutil mb gs://your-project-game-images
gsutil cors set cors.json gs://your-project-game-images
```

## Production Deployment Checklist

### Security
- [ ] Update Firestore security rules for production
- [ ] Configure proper CORS settings
- [ ] Set up rate limiting
- [ ] Rotate all API keys and secrets
- [ ] Enable Firebase App Check
- [ ] Configure proper authentication

### Performance
- [ ] Enable Firebase Performance Monitoring
- [ ] Set up CDN for static assets
- [ ] Configure caching strategies
- [ ] Optimize bundle sizes

### Monitoring
- [ ] Set up Firebase Analytics
- [ ] Configure error tracking (Sentry, etc.)
- [ ] Set up uptime monitoring
- [ ] Configure log aggregation
- [ ] Set up alerts for critical errors

### Solana Program
- [ ] Audit smart contract code
- [ ] Test on devnet thoroughly
- [ ] Deploy to mainnet-beta
- [ ] Verify program deployment
- [ ] Set up program monitoring

## Maintenance Commands

### Scheduler Management
```bash
# Check scheduler status
curl https://your-api-url/admin/scheduler/status

# Update scheduler settings
curl -X PUT https://your-api-url/admin/scheduler/settings \
  -H "Content-Type: application/json" \
  -d '{"enabled": true, "interval": "0 19 * * *"}'

# Manual quiz generation
curl -X POST https://your-api-url/admin/scheduler/run
```

### Database Maintenance
```bash
# Backup Firestore
gcloud firestore export gs://your-backup-bucket/$(date +%Y%m%d)

# Clean up old data
firebase functions:shell
> cleanup.cleanupOldGames()
```

### Program Updates
```bash
# Upgrade program (if needed)
cd blockchain/prompt_detective
anchor upgrade --provider.cluster mainnet-beta --program-id YOUR_PROGRAM_ID
```

## Troubleshooting

### Common Issues

1. **Program ID Mismatch**: Ensure all configuration files use the same program ID
2. **Network Issues**: Verify RPC endpoints are correct for your target network
3. **Permission Errors**: Check Firebase IAM roles and Firestore rules
4. **Transaction Failures**: Verify account has sufficient SOL for transactions

### Debugging Commands

```bash
# Check Solana program logs
solana logs YOUR_PROGRAM_ID

# Verify Firebase function logs
firebase functions:log

# Test API endpoints
curl -X GET https://your-api-url/health

# Check Firestore connection
firebase firestore:delete --dry-run
```

## Rollback Procedures

### In case of deployment issues:

1. **Frontend**: Revert to previous build or deploy from stable branch
2. **Backend**: Use Firebase Functions version management to rollback
3. **Database**: Restore from backup if schema changes were made
4. **Solana Program**: Programs are immutable, plan upgrades carefully

## Support

For deployment issues:
- Check logs in Firebase Console
- Review Solana Explorer for transaction details
- Verify environment variables are set correctly
- Ensure all services are properly configured and running