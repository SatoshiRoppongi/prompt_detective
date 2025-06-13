# CLAUDE.md

README.mdにも指示の記載があるのでそちらを必ず読んで従ってください。
指示の中に矛盾があったら聞いてください。

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Prompt Detective is a web3 quiz game where users guess the text prompt used to generate AI images. Players connect Solana wallets, place bets in SOL, and compete for a shared pot.

## Architecture

The project consists of three main components:

- **Frontend**: Nuxt 3 (Vue.js) with Vuetify UI, handles user interface and Solana wallet integration
- **Backend**: Firebase Functions with Firestore database, manages quiz logic and OpenAI image generation
- **Blockchain**: Solana program written in Rust using Anchor framework, handles betting and pot distribution

## Development Commands

### Frontend (Nuxt 3)
```bash
cd frontend
npm run dev          # Start development server
npm run build        # Build for production
npm run generate     # Generate static site
```

### Backend (Firebase Functions)
```bash
cd backend/functions
npm run build        # Compile TypeScript
npm run serve        # Run Firebase emulator
npm run deploy       # Deploy to Firebase
npm run lint         # Run ESLint
```

### Blockchain (Solana/Anchor)
```bash
cd blockchain/prompt_detective
anchor build         # Build Solana program
anchor test          # Run tests
anchor deploy        # Deploy program
npm run lint         # Run Prettier
```

### Docker Development
```bash
docker-compose up    # Start full development environment
```

## Key Technical Details

### Environment Setup
- Copy `.env.sample` to `.env` in frontend directory for local development
- Frontend runs on port 3000, blockchain validator on port 7878
- Backend uses Firebase emulator for local development

### Database Structure
- Firestore collections: `users`, `quizzes`, `participants`
- Images stored in Firebase Cloud Storage
- Quiz state managed through scheduled functions

### Solana Integration
- Phantom wallet connection required for gameplay
- Program handles bet placement and pot distribution
- Supports devnet, localnet, and mainnet clusters

### Development Workflow
- Use Docker for consistent development environment
- Frontend hot-reloads during development
- Backend functions can be tested locally with Firebase emulator
- Blockchain program can be tested against local Solana validator