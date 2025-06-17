# GitHub Secrets Setup Guide

CI/CDパイプラインを動作させるために、以下のGitHub Secretsを設定してください。

## GitHub Secretsの設定方法

1. GitHubリポジトリのページに移動
2. `Settings` タブをクリック
3. 左側メニューの `Secrets and variables` → `Actions` をクリック
4. `New repository secret` をクリックして以下のシークレットを追加

## 設定が必要なGitHub Secrets

### 1. OPENAI_API_KEY
```
Name: OPENAI_API_KEY
Value: [提供されたOpenAI APIキーを入力]
```

### 2. FIREBASE_SERVICE_ACCOUNT
```
Name: FIREBASE_SERVICE_ACCOUNT
Value: [提供されたFirebase Service Account JSONを入力]
```

### 3. FIREBASE_PROJECT_ID
```
Name: FIREBASE_PROJECT_ID
Value: prompt-detective-backend
```

### 4. SOLANA_PRIVATE_KEY
```
Name: SOLANA_PRIVATE_KEY
Value: [提供されたSolana秘密鍵を入力]
```

### 5. SOLANA_PROGRAM_ID
```
Name: SOLANA_PROGRAM_ID
Value: [提供されたSolana Program IDを入力]
```

### 6. FIREBASE_TOKEN
```
Name: FIREBASE_TOKEN
Value: [Firebase CLI login:ci で取得したトークンを入力]
```

### 7. E2E Testing Configuration (Optional)
```
Name: ENABLE_SHORT_CYCLES
Value: true

Name: ENABLE_AUTO_START
Value: true

Name: ENABLE_REAL_IMAGE_GENERATION
Value: true
```

## 実際の値について

**セキュリティ上の理由で、この公開ファイルには実際のクレデンシャル値は記載していません。**

実際の値は開発者が直接GitHub Secretsに設定してください：
- 既に提供されたOpenAI API Key
- 既に提供されたFirebase Service Account JSON
- 既に提供されたSolana秘密鍵とProgram ID

## 注意事項

1. **セキュリティ**: これらのシークレットは機密情報です。GitHub Secretsは暗号化されて保存されます。
2. **改行に注意**: FIREBASE_SERVICE_ACCOUNTの値は1行で入力してください（改行を含まない）。
3. **JSON形式**: Firebase Service Accountは完全なJSON形式で入力してください。
4. **バックアップ**: これらのキーは安全な場所にバックアップを保存してください。
5. **共有禁止**: これらの値を公開リポジトリやドキュメントに直接記載しないでください。

## 設定後の確認

GitHub Secretsを設定した後、以下のコマンドでCI/CDパイプラインをテストできます：

```bash
# GitHubにプッシュしてCI/CDを実行
git push origin main
```

CI/CDパイプラインが正常に動作することを確認してください。