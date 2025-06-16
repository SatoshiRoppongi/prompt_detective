# デバッグログ

## 重要なデバッグ記録

### 解決済み問題

#### 問題ID: DEBUG-001
- **日付**: 記録開始日
- **問題**: 知識管理システム構築
- **症状**: プロジェクト情報の散在
- **原因**: 構造化されたドキュメント体系の不在
- **解決策**: .claude/ ディレクトリ構造の導入
- **ステータス**: ✅ 解決済み
- **学んだ教訓**: 継続的なドキュメント更新の重要性

### 進行中の問題

*現在進行中のデバッグセッションをここに記録*

### 未解決の問題

*特定されているが未解決の問題をここに記録*

## カテゴリ別デバッグログ

### 🖥️ フロントエンド (Nuxt 3)

#### パフォーマンス関連
*今後のデバッグ記録をここに追加*

#### ウォレット統合関連
*今後のデバッグ記録をここに追加*

#### UI/UX関連
*今後のデバッグ記録をここに追加*

### 🔥 バックエンド (Firebase)

#### Firebase Functions関連
*今後のデバッグ記録をここに追加*

#### Firestore関連
*今後のデバッグ記録をここに追加*

#### 認証関連
*今後のデバッグ記録をここに追加*

### ⛓️ ブロックチェーン (Solana)

#### Anchor関連
*今後のデバッグ記録をここに追加*

#### トランザクション関連
*今後のデバッグ記録をここに追加*

#### ウォレット統合関連
*今後のデバッグ記録をここに追加*

### 🐳 Docker/開発環境

#### コンテナ関連
*今後のデバッグ記録をここに追加*

#### 環境変数関連
*今後のデバッグ記録をここに追加*

## デバッグテンプレート

### 問題報告テンプレート
```markdown
#### 問題ID: DEBUG-XXX
- **日付**: YYYY-MM-DD
- **カテゴリ**: [フロントエンド/バックエンド/ブロックチェーン/開発環境]
- **優先度**: [高/中/低]
- **問題**: 簡潔な問題の説明
- **症状**: 具体的な症状やエラー
- **再現手順**: 
  1. 
  2. 
  3. 
- **期待される動作**: 
- **実際の動作**: 
- **環境情報**: 
  - OS: 
  - Node.js: 
  - ブラウザ: 
- **エラーメッセージ**: 
```

### 解決報告テンプレート
```markdown
- **原因**: 根本原因の特定
- **解決策**: 実装した解決策
- **テスト**: 動作確認方法
- **ステータス**: ✅ 解決済み / 🔄 部分解決 / ❌ 未解決
- **学んだ教訓**: 今後の予防策
- **関連ファイル**: 
  - file1.ts:123
  - file2.vue:456
```

## よくある問題と解決策

### 依存関係の問題
- **症状**: `npm install` でエラー
- **解決策**: `rm -rf node_modules package-lock.json && npm install`

### ポート競合
- **症状**: EADDRINUSE エラー
- **解決策**: `lsof -ti:PORT | xargs kill -9`

### Docker関連
- **症状**: コンテナが起動しない
- **解決策**: `docker system prune -f && docker-compose up --build`

### Firebase エミュレーター
- **症状**: エミュレーターに接続できない
- **解決策**: `firebase emulators:start --clear-data`

### Solana関連
- **症状**: Anchor ビルドが失敗
- **解決策**: `anchor clean && anchor build`

## デバッグ支援ツール

### ログ収集コマンド
```bash
# システム情報収集
node --version > debug-info.txt
npm --version >> debug-info.txt
anchor --version >> debug-info.txt
docker --version >> debug-info.txt

# エラーログ収集
cat backend/functions/backend.log | tail -100 > recent-errors.log
```

### 環境診断スクリプト
```bash
#!/bin/bash
# diagnose.sh
echo "=== 環境診断 ==="
echo "Node.js: $(node --version)"
echo "NPM: $(npm --version)"
echo "Docker: $(docker --version)"
echo "Firebase CLI: $(firebase --version)"
echo "Anchor CLI: $(anchor --version)"
echo "Solana CLI: $(solana --version)"
echo "=== ポート確認 ==="
lsof -i :3000 2>/dev/null || echo "Port 3000: Available"
lsof -i :7878 2>/dev/null || echo "Port 7878: Available"
```

## デバッグセッション管理

### アクティブセッション
*現在のデバッグセッションをここに記録*

### セッション履歴
*過去のデバッグセッションの要約をここに記録*

## 定期メンテナンス

### 週次タスク
- [ ] ログファイルのローテーション
- [ ] 解決済み問題のアーカイブ
- [ ] 新しい問題パターンの特定

### 月次タスク
- [ ] デバッグ統計の分析
- [ ] よくある問題の更新
- [ ] デバッグツールの見直し