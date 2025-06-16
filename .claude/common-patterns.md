# よく使用するコマンドパターン

## 開発環境起動

### フルスタック開発環境
```bash
# Docker環境での一括起動
docker-compose up

# 個別起動の場合
cd frontend && npm run dev &
cd backend/functions && npm run serve &
cd blockchain/prompt_detective && anchor test
```

### フロントエンド開発
```bash
cd frontend
npm install
npm run dev          # 開発サーバー起動
npm run build        # プロダクションビルド
npm run generate     # 静的サイト生成
```

### バックエンド開発
```bash
cd backend/functions
npm install
npm run build        # TypeScript コンパイル
npm run serve        # Firebase エミュレーター起動
npm run deploy       # Firebase にデプロイ
npm run lint         # ESLint実行
```

### ブロックチェーン開発
```bash
cd blockchain/prompt_detective
anchor build         # Solana プログラムビルド
anchor test          # テスト実行
anchor deploy        # プログラムデプロイ
npm run lint         # Prettier実行
```

## 問題解決パターン

### 依存関係の問題
```bash
# package-lock.json削除して再インストール
rm package-lock.json
rm -rf node_modules
npm install

# Cargoキャッシュクリア
cargo clean
```

### 開発環境リセット
```bash
# Docker環境完全リセット
docker-compose down
docker system prune -f
docker-compose up --build

# Firebase エミュレーターリセット
npx firebase emulators:start --clear-data
```

### ログ確認
```bash
# バックエンドログ確認
cd backend/functions
tail -f backend.log

# Docker ログ確認
docker-compose logs -f [service-name]
```

## テスト実行パターン

### ユニットテスト
```bash
# フロントエンドテスト
cd frontend
npm test

# バックエンドテスト
cd backend/functions
npm test

# ブロックチェーンテスト
cd blockchain/prompt_detective
anchor test
```

### 統合テスト
```bash
# テスト用Firebaseプロジェクト設定
cd backend/functions
npm run test:integration

# テスト用Solanaプログラム
cd blockchain/prompt_detective
anchor test --skip-build
```

## デプロイメントパターン

### 開発環境デプロイ
```bash
# Firebase 開発環境
cd backend/functions
npm run deploy:dev

# Solana devnet
cd blockchain/prompt_detective
anchor deploy --provider.cluster devnet
```

### 本番環境デプロイ
```bash
# Firebase 本番環境
cd backend/functions
npm run deploy:prod

# Solana mainnet
cd blockchain/prompt_detective
anchor deploy --provider.cluster mainnet
```

## 監視・デバッグパターン

### リアルタイムログ監視
```bash
# Firebase Functions ログ
npx firebase functions:log --only [function-name]

# Solana トランザクション監視
solana logs --url [cluster-url]
```

### パフォーマンス分析
```bash
# フロントエンドバンドル分析
cd frontend
npm run analyze

# バックエンド関数分析
cd backend/functions
npm run profile
```

## 便利なワンライナー

### 環境変数設定
```bash
# 開発環境変数コピー
cp frontend/.env.sample frontend/.env
```

### 設定ファイル確認
```bash
# 全設定ファイル一覧
find . -name "*.config.*" -o -name "*.json" | grep -E "(package|tsconfig|anchor)" | head -10
```

### 依存関係確認
```bash
# 全プロジェクトの依存関係確認
find . -name "package.json" -exec echo "=== {} ===" \; -exec cat {} \; | grep -A 5 -B 1 "dependencies"
```

## トラブルシューティングチェックリスト

### 共通問題
- [ ] Node.jsバージョン確認 (`node --version`)
- [ ] 依存関係インストール (`npm install`)
- [ ] 環境変数設定確認 (`.env`ファイル)
- [ ] ポート競合確認 (`lsof -i :3000`)

### Firebase関連
- [ ] Firebase CLI ログイン (`firebase login`)
- [ ] プロジェクト設定確認 (`firebase projects:list`)
- [ ] エミュレーター起動確認 (`firebase emulators:start`)

### Solana関連
- [ ] Solana CLI インストール確認 (`solana --version`)
- [ ] Anchor CLI インストール確認 (`anchor --version`)
- [ ] ウォレット設定確認 (`solana config get`)
- [ ] クラスター設定確認 (`solana config set --url`)

## 自動化スクリプト例

### 開発環境一括セットアップ
```bash
#!/bin/bash
# setup-dev.sh
echo "Setting up development environment..."
cp frontend/.env.sample frontend/.env
cd frontend && npm install
cd ../backend/functions && npm install
cd ../../blockchain/prompt_detective && npm install
echo "Setup complete!"
```

### 全テスト実行
```bash
#!/bin/bash
# run-all-tests.sh
echo "Running all tests..."
cd frontend && npm test
cd ../backend/functions && npm test
cd ../../blockchain/prompt_detective && anchor test
echo "All tests completed!"
```