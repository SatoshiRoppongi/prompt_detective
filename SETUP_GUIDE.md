# 🚀 E2E Testing Setup Guide

## 📝 Step-by-Step Setup Instructions

### 1. 🔑 Required Secrets & API Keys

#### GitHub Repository Secrets
GitHub Settings > Secrets and variables > Actions > Repository secrets で以下を追加:

```
FIREBASE_TOKEN=<Firebase CLI Token>
FIREBASE_SERVICE_ACCOUNT_KEY=<Base64 encoded service account JSON>
OPENAI_API_KEY=<Your OpenAI API Key>
```

#### Firebase Service Account Key の取得方法:
```bash
# Firebase Console > Project Settings > Service Accounts > Generate new private key
# JSON ファイルをダウンロードし、Base64エンコード
cat service-account-key.json | base64 | tr -d '\n'
```

#### Firebase CLI Token の取得方法:
```bash
firebase login:ci
# 出力されたトークンをコピー
```

### 2. 🔧 Firebase プロジェクト設定

#### Firebase Console での設定:
1. **Firestore Database**: Production mode で作成
2. **Firebase Storage**: デフォルト設定で作成  
3. **Firebase Functions**: Blaze plan に升级 (外部API呼び出しのため)
4. **Firebase Hosting**: 有効化

#### 必要なFirestore Indexes:
Firebase Console > Firestore > Indexes で以下を作成:

```javascript
// security_logs collection
{
  "collectionGroup": "security_logs",
  "queryScope": "COLLECTION",
  "fields": [
    {"fieldPath": "timestamp", "order": "ASCENDING"}
  ]
}

// game_timers collection  
{
  "collectionGroup": "game_timers",
  "queryScope": "COLLECTION", 
  "fields": [
    {"fieldPath": "isActive", "order": "ASCENDING"},
    {"fieldPath": "phase", "order": "ASCENDING"}
  ]
}

// participants collection (composite index)
{
  "collectionGroup": "participants",
  "queryScope": "COLLECTION_GROUP",
  "fields": [
    {"fieldPath": "quizId", "order": "ASCENDING"},
    {"fieldPath": "score", "order": "DESCENDING"}
  ]
}
```

### 3. 🎮 OpenAI API 設定

#### OpenAI プラットフォームでの設定:
1. https://platform.openai.com/ にログイン
2. API Keys > Create new secret key
3. Usage limits を適切に設定 (テスト用に制限設定推奨)

#### 推奨設定:
- **Monthly usage limit**: $10-20 (テスト用)
- **Model access**: DALL-E 3 を有効化
- **Rate limits**: Default のまま

### 4. 💰 Solana Devnet 設定

#### Wallet & Devnet SOL の準備:
```bash
# Solana CLI をインストール
sh -c "$(curl -sSfL https://release.solana.com/v1.16.0/install)"

# Devnet に接続
solana config set --url devnet

# 新しいキーペアを生成 (テスト用)
solana-keygen new --outfile ~/solana-devnet-keypair.json

# Devnet SOL をエアドロップ
solana airdrop 2 ~/solana-devnet-keypair.json

# 残高確認
solana balance ~/solana-devnet-keypair.json
```

### 5. 🌐 環境変数の設定

#### Backend (`backend/functions/.env`):
```env
# 本番用設定
NODE_ENV=production
FIREBASE_PROJECT_ID=prompt-detective-backend

# OpenAI設定
OPENAI_API_KEY=your_openai_api_key_here

# Solana設定 (Devnet)
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com

# E2Eテスト設定
GAME_DURATION_MINUTES=5
GRACE_PERIOD_SECONDS=30
AUTO_START_INTERVAL_MINUTES=10
ENABLE_SHORT_CYCLES=true
ENABLE_AUTO_START=true
ENABLE_REAL_IMAGE_GENERATION=true
```

#### Frontend (`frontend/.env`):
```env
# API設定
NUXT_PUBLIC_API_BASE=https://us-central1-prompt-detective-backend.cloudfunctions.net/api

# Solana設定 (Devnet)
NUXT_PUBLIC_SOLANA_NETWORK=devnet
NUXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com

# E2Eテスト設定
NUXT_PUBLIC_ENABLE_DEBUG_TOOLS=true
NUXT_PUBLIC_SHOW_GAME_TIMER=true
NUXT_PUBLIC_REFRESH_INTERVAL=5000
```

### 6. 🚀 デプロイメント手順

#### 自動デプロイ (推奨):
```bash
# main ブランチにプッシュすると自動デプロイ
git push origin main

# GitHub Actions でデプロイ状況を確認
# Actions タブで進行状況をモニタリング
```

#### 手動デプロイ:
```bash
# Backend Functions
cd backend/functions
npm run build
firebase deploy --only functions

# Frontend Hosting  
cd frontend
npm run build
firebase deploy --only hosting

# Firestore Rules & Indexes
cd backend
firebase deploy --only firestore
```

### 7. 🧪 動作確認手順

#### 1. API Health Check:
```bash
curl https://us-central1-prompt-detective-backend.cloudfunctions.net/api/health
```

#### 2. フロントエンドアクセス:
```
https://prompt-detective-backend.web.app
```

#### 3. E2E テストフロー:
1. **Admin Panel**: `/admin` でプロンプト生成
2. **Image Generation**: OpenAI API で画像生成確認
3. **Game Start**: 5分サイクルでゲーム開始
4. **User Participation**: ウォレット接続とベット
5. **Auto End**: 5分後の自動終了
6. **Result Distribution**: スコア計算とSOL分配
7. **New Cycle**: 10分後の新ゲーム開始

### 8. 📊 監視・ログ確認

#### Firebase Console:
- **Functions Logs**: リアルタイム実行ログ
- **Firestore Data**: ゲーム状態とユーザーデータ
- **Storage**: 生成された画像ファイル
- **Performance**: 関数実行時間と成功率

#### 確認すべきログ:
```bash
# Functions ログ
firebase functions:log --only api

# 特定の関数のログ
firebase functions:log --only quizRoundHandler

# リアルタイムログ監視
firebase functions:log --follow
```

### 9. 🚨 トラブルシューティング

#### よくある問題:

1. **OpenAI API Quota**: 使用量制限に達した
   - API Usage ダッシュボードで確認
   - 必要に応じて制限を調整

2. **Firestore Index Error**: 必要なインデックスが未作成
   - エラーメッセージ内のリンクからインデックス作成

3. **Functions Cold Start**: 初回リクエストが遅い
   - 通常動作、しばらく待機

4. **Solana RPC Limits**: レート制限に達した
   - 少し待ってから再試行
   - 必要に応じてプライベートRPCを使用

### 10. 🎯 成功確認チェックリスト

- [ ] GitHub Actions でビルド・デプロイが成功
- [ ] API Health Check が200を返す
- [ ] フロントエンドが正常にロード
- [ ] Admin Panel でプロンプト生成可能
- [ ] OpenAI API で画像生成成功
- [ ] ゲームが5分サイクルで動作
- [ ] ウォレット接続が可能
- [ ] ベット・回答送信が可能
- [ ] 自動的にゲーム終了・結果表示
- [ ] SOL 分配が正常実行
- [ ] 新しいゲームサイクルが自動開始

## 📞 サポート

設定中に問題が発生した場合:
1. Firebase Console のログを確認
2. GitHub Actions の実行ログを確認  
3. OpenAI API の使用状況を確認
4. Solana Devnet の状況を確認

すべての設定が完了すると、完全に自動化されたE2Eテスト環境が利用できます！