# プロジェクト技術知識

## アーキテクチャパターン

### フロントエンド (Nuxt 3)
- **状態管理**: Composablesベースの状態管理
  - `useAdmin.ts`: 管理者機能
  - `useApi.ts`: API通信
  - `useErrorHandler.ts`: エラーハンドリング
  - `useRealtime.ts`: リアルタイム機能
  - `useWallets.ts`: ウォレット統合

- **コンポーネント設計**:
  - `ConnectWalletButton.vue`: ウォレット接続UI
  - `ErrorAlert.vue`: エラー表示
  - `Identicon.vue`: ユーザーアイデンティティ表示

### バックエンド (Firebase Functions)
- **コントローラー層**:
  - `adminController.ts`: 管理者API
  - `imageController.ts`: 画像生成API
  - `participationController.ts`: 参加管理API
  - `quizController.ts`: クイズロジックAPI
  - `userController.ts`: ユーザー管理API

- **サービス層**:
  - `quizService.ts`: クイズビジネスロジック
  - `participationService.ts`: 参加処理
  - `schedulerService.ts`: スケジューラー管理
  - `solanaService.ts`: ブロックチェーン統合
  - `realtimeService.ts`: リアルタイム通信

- **ミドルウェア**:
  - `auth.ts`: 認証処理
  - `errorHandler.ts`: エラーハンドリング
  - `rateLimit.ts`: レート制限
  - `validation.ts`: バリデーション

### ブロックチェーン (Solana/Anchor)
- **プログラム構造**: `programs/prompt_detective/src/lib.rs`
- **テスト**: `tests/prompt_detective.ts`
- **デプロイメント**: `migrations/deploy.ts`

## 重要な設計判断

### 1. 三層アーキテクチャ
- **理由**: 関心の分離、スケーラビリティ、保守性
- **メリット**: 各層独立開発、テスト容易性

### 2. Firebase Functions + Firestore
- **理由**: サーバーレス、スケーラビリティ、リアルタイム対応
- **制約**: コールドスタート、実行時間制限

### 3. Solana選択
- **理由**: 低手数料、高速トランザクション
- **課題**: 開発者学習コスト、エコシステム成熟度

## パフォーマンス最適化

### フロントエンド
- Nuxt 3のSSR/SSG活用
- コンポーネントの遅延読み込み
- 画像最適化

### バックエンド
- Firestore複合インデックス最適化
- 関数のコールドスタート対策
- バッチ処理による効率化

### ブロックチェーン
- トランザクション費用最適化
- アカウント構造の効率化

## セキュリティ考慮事項

### 認証・認可
- ウォレット署名による認証
- 管理者権限の適切な分離
- レート制限による DoS 防止

### データ保護
- Firestore セキュリティルール
- 機密情報の適切な管理
- クライアントサイドでの検証制限

## 運用・監視

### ログ戦略
- 構造化ログ出力
- エラートラッキング
- パフォーマンス監視

### デプロイメント
- Docker を使用した一貫性確保
- 段階的デプロイメント
- ロールバック戦略

## 既知の技術的制約

1. **Firebase Functions実行時間制限**: 最大9分
2. **Firestore クエリ制限**: 複合インデックス必須
3. **Solana RPC制限**: レート制限対応必要
4. **OpenAI API制限**: 使用量制限とコスト管理

## 推奨される開発プラクティス

1. **型安全性**: TypeScript の厳格モード使用
2. **テスト**: 単体テスト、統合テストの実装
3. **リンティング**: ESLint, Prettier の使用
4. **コミット**: 意味のあるコミットメッセージ
5. **ドキュメント**: コード内コメント、API文書