# CLAUDE.md

このファイルは、このリポジトリでコードを扱う際にClaude Code (claude.ai/code) に対してガイダンスを提供します。

## 開発コマンド

```bash
# Turbopackで開発サーバーを起動
npm run dev

# アプリケーションをビルド
npm run build

# 本番サーバーを起動
npm start

# ESLintを実行
npm run lint

# Prismaコマンドを実行
npx prisma generate     # Prismaクライアントを生成
npx prisma db push      # スキーマ変更をデータベースにプッシュ
npx prisma studio       # Prisma Studioを開く
```

## アーキテクチャ概要

KumiTalkは、PDFマニュアルを解析してインタラクティブなガイダンスを提供することで、ユーザーの家具組み立てを支援するAIを使用したNext.jsアプリケーションです。

### コアアーキテクチャ

- **フレームワーク**: TypeScriptとTailwind CSSを使用したNext.js 15のApp Router
- **データベース**: Prisma ORMを使用したPostgreSQL
- **AI統合**: PDF解析とチャット機能にGoogle Gemini API
- **認証**: bcryptを使用したカスタムクッキーベースのセッション管理
- **UIコンポーネント**: カスタムスタイリングを施したRadix UIプリミティブ

### 主要なデータフロー

1. **マニュアル解析**: PDFがアップロードされ、Geminiによって組み立て手順が解析・抽出される
2. **ステップ生成**: 各ステップで色分けされた部品の視覚化と詳細な指示が生成される
3. **インタラクティブチャット**: ユーザーは特定の組み立てステップについて、文脈に応じたAI応答で質問できる

### データベーススキーマ

- **User**: メール/パスワード認証を使用した基本的なユーザー管理
- **Document**: メタデータ付きでアップロードされたPDFマニュアル
- **Chat**: ドキュメントに紐づけられた会話セッション
- **Message**: ステップコンテキスト付きのチャットメッセージ
- **AssemblyStep**: 画像と部品データを含む生成された組み立て指示

### APIルート構造

- `/api/auth/*` - 認証エンドポイント（ログイン/サインアップ/ログアウト）
- `/api/analyze-manual` - Geminiを使用したPDF解析
- `/api/chat/*` - チャットの作成と取得
- `/api/messages/*` - 会話のメッセージ処理
- `/api/assembly/*` - 組み立てステップの生成と管理
- `/api/gemini` - 直接のGemini APIインタラクション

### コンポーネントアーキテクチャ

- **ページ**: `/chat`、`/analyzer`、認証ページ（`/login`、`/signup`）
- **コアコンポーネント**: 
  - `chat-interface.tsx` - ステップナビゲーション付きのメインチャットUI
  - `manual-analyzer.tsx` - PDFアップロードと解析インターフェース
  - `VoiceMicButton.tsx` - 音声入力機能
- **UIコンポーネント**: `/components/ui/`内のRadixベースの再利用可能コンポーネント

### 必要な環境変数

- `DATABASE_URL` - PostgreSQL接続文字列
- `DIRECT_URL` - Prisma用の直接データベースURL
- `GEMINI_API_KEY` - Google Gemini APIキー

### ファイル構成

- `src/app/` - Next.js app routerページとAPIルート
- `src/components/` - 再利用可能なReactコンポーネント
- `src/lib/` - ユーティリティ関数（認証、Prisma、進捗）
- `src/hooks/` - カスタムReactフック
- `src/types/` - TypeScript型定義
- `prisma/` - データベーススキーマとマイグレーション
- `documents/` - ドキュメントと参考資料
- `images/` - テスト用サンプル組み立て画像

### 主要な技術詳細

- より高速な開発ビルドのためにTurbopackを使用
- 7日間の有効期限を持つクッキーベースセッション
- PDF処理はGemini解析のためにBase64に変換
- 組み立てステップには色割り当て付きの部品データをJSONで保存
- アクセシビリティのために音声機能を統合
- 長時間実行される操作のための進捗追跡システム

### 開発メモ

- ルートページは新規ユーザーオンボーディングのために`/signup`にリダイレクト
- ほとんどの機能には認証が必要
- 組み立てステップ画像は色分けされた部品でGeminiによって生成
- チャット機能は各組み立てステップのコンテキストを維持
- データベース全体でUUID主キーを使用