# Firebase Token Setup Guide

## FIREBASE_TOKENの取得方法

CI/CDパイプラインでFirebase CLIを使用するために、認証トークンが必要です。

### 1. Firebase CLIでトークン生成

```bash
# Firebase CLIをインストール (まだの場合)
npm install -g firebase-tools

# Firebase にログイン
firebase login

# CI用トークンを生成
firebase login:ci
```

### 2. トークンをGitHub Secretsに設定

上記コマンドで出力されたトークンを以下の名前でGitHub Secretsに追加：

```
Name: FIREBASE_TOKEN
Value: [firebase login:ci で出力されたトークン文字列]
```

### 3. 必要なGitHub Secrets一覧

```bash
# 認証関連
FIREBASE_TOKEN=[firebase login:ci で取得したトークン]
FIREBASE_SERVICE_ACCOUNT=[Firebase Service Account JSON]
FIREBASE_PROJECT_ID=prompt-detective-backend

# API関連
OPENAI_API_KEY=[OpenAI API Key]

# Solana関連
SOLANA_PRIVATE_KEY=[Solana秘密鍵]
SOLANA_PROGRAM_ID=[Solana Program ID]

# E2E設定 (オプション)
ENABLE_SHORT_CYCLES=true
ENABLE_AUTO_START=true
ENABLE_REAL_IMAGE_GENERATION=true
```

### トラブルシューティング

**エラー: "User must be authenticated"**
→ `firebase login:ci` を再実行してください

**エラー: "Project access denied"**
→ Firebase プロジェクトの権限を確認してください

**代替方法：環境変数での認証**
```bash
# Service Accountを直接使用する場合
export GOOGLE_APPLICATION_CREDENTIALS="path/to/service-account.json"
firebase deploy --token $(gcloud auth print-access-token)
```

### セキュリティ注意事項

1. **トークンの機密性**: Firebase Tokenは機密情報です
2. **有効期限**: トークンには有効期限があります
3. **権限確認**: 必要最小限の権限のみ付与してください
4. **定期更新**: セキュリティのため定期的にトークンを更新してください

### トークンの確認

設定後、以下のコマンドでトークンが正常に動作することを確認できます：

```bash
firebase projects:list --token YOUR_TOKEN
```