# 🛠️ 組みTalk (Kumi-Talk)

**家具の“取説”をチャットで解決する AI アシスタント**

多人数でも家族でも、だれでも迷わず組み立てられる“会話型マニュアル体験”を提供します。PDFの取説をアップロードすると、工程や部品の疑問に根拠つきで答えます。

![Kumi-Talk](public/images/kumi-talk.png)

## 🏆 概要 / 位置づけ

* **ハッカソン提出想定のMVP**（2日開発）
* **会話×根拠引用**でDIY初心者にもやさしい操作性
* `furnitures` テーブルは **`documents`** に統一（命名一貫）

## ✨ プロジェクトの特徴

### 💬 コア機能

* **PDFアップロード**: 取説（PDF）とメタ情報を登録
* **自動解析 & RAG**: ページ分割→埋め込み→近傍検索→**根拠引用つき回答**
* **チャットQA**: 途中からでも再開できる履歴ベースの対話
* **横断検索**: 取説（=documents）を跨いだ検索・再開

### 🔧 技術的アピールポイント

#### モダンスタック

* **Next.js 14 (App Router)** + **TypeScript**
* **Supabase**（Auth / Postgres / Storage / RLS）
* **pgvector** によるベクトル検索
* **Tailwind CSS** による迅速なUI開発
* **LLM**: Gemini（Adapterで差し替え可能）

#### アーキテクチャ設計

* **非同期解析ジョブ**: 初回解析はバックグラウンドで進行、UIはプログレス表示
* **RLS/権限制御**: 所有者だけが`documents`と索引（`document_chunks`）へアクセス
* **引用UI**: 回答の根拠ページへジャンプ

## 🏗️ システム構成

```
Frontend (Next.js)
    ↓ API Routes (/app/api/*)
Backend (Upload / Analyze / Chat)
    ↓
Supabase (Auth / Postgres / Storage / pgvector / RLS)
    ↓
LLM Provider (Gemini via Adapter)
```

## 🚀 環境構築

### 必要な環境

* Node.js 20+
* Supabase CLI（ローカルDB / pgvector）

### セットアップ手順

1. **リポジトリのクローン**

```bash
git clone <your-repo-url>
cd kumi-talk
```

2. **依存関係のインストール**

```bash
npm install
```

3. **環境変数の設定**（`.env.local` 例）

```bash
NEXT_PUBLIC_SUPABASE_URL="..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."
LLM_PROVIDER="gemini"
GEMINI_API_KEY="..."
```

4. **データベースの起動/初期化**

```bash
supabase start
supabase db reset  # pgvector有効化 & 初期スキーマ投入
```

5. **開発サーバーの起動**

```bash
npm run dev
```

アプリは [http://localhost:3000](http://localhost:3000) で起動します。

## 🗃️ データベース設計

```sql
-- 必須拡張
create extension if not exists vector;

-- users
(id uuid pk, email text unique, created_at timestamptz)

-- documents  ← 取説メタ + ステータス（furnitures→documentsに統一）
(id uuid pk, owner_id uuid fk users.id, title text, brand text,
 model text, language text, pdf_path text,
 status text check (status in ('uploaded','processing','ready','error')),
 created_at timestamptz)

-- document_chunks  ← RAG用インデックス
(id uuid pk, document_id uuid fk documents.id on delete cascade,
 page_number int, chunk_index int, content text, embedding vector(1536))

-- chats / messages
(chats.id uuid pk, user_id uuid fk, document_id uuid fk nullable, title text, created_at)
(messages.id uuid pk, chat_id uuid fk, role text, content text, citations jsonb, created_at)
```

### RLS（抜粋）

* `documents`: 所有者のみ **select/insert/update/delete**
* `document_chunks`: 紐づく `documents.owner_id = auth.uid()` のみ参照
* `chats` / `messages`: `user_id`一致のみ参照/作成

## 🔌 API ルート（App Router `/app/api/*`）

* `POST /api/upload`

  * 入: `file(pdf)`, `title`, `brand`, `model`, `language`
  * 出: `{ documentId }`
* `POST /api/analyze-manual`

  * 入: `{ documentId }`
  * 振る舞い: PDF抽出→分割→埋め込み→`document_chunks`投入→`documents.status=ready`
* `POST /api/messages`

  * 入: `{ chatId, content }`
  * 振る舞い: 近傍検索→LLM→回答＋`citations`（ページ/抜粋）
* `GET /api/documents?query=...`

  * タイトル/メタ+ベクトルの横断検索

## 🎯 主要機能（画面）

### ルーム/一覧・詳細に相当する導線

* **/documents**: 取説一覧・検索
* **/chat/[id]**: チャット（引用から該当ページへジャンプ）
* **/**: ホーム（最近のチャット / アップロードCTA）

### 解析とチャットの体験

1. PDFをアップロード → `documents.status = processing`
2. 解析完了で`ready` → 「脚の向きが不安」など自然言語質問
3. 回答に**根拠引用**が付与 → クリックでページへスクロール

## 🔧 開発・運用コマンド

```bash
# 開発
npm run dev

# 本番ビルド/起動
npm run build
npm run start

# 品質
npm run lint
npm run format
npm run format:check
```

## 📈 技術的成果指標（想定）

* **初回解析**: 非同期実行、UIで段階プログレス表示
* **チャット応答**: p95 < 3s（近傍検索+LLM）
* **安全性**: RLSで**他人のドキュメント不可視**

## 📁 ディレクトリ構成（例）

```
kumi-talk/
├── public/
│   └── images/
│       └── kumi-talk.png
├── app/
│   └── api/
│       ├── upload/
│       ├── analyze-manual/
│       ├── messages/
│       └── documents/
├── src/
│   ├── components/
│   │   ├── ui/
│   │   ├── ChatWindow.tsx
│   │   ├── CitationCard.tsx
│   │   └── UploadPanel.tsx
│   ├── lib/
│   │   ├── llm/
│   │   │   ├── index.ts    # Adapter経由API
│   │   │   └── gemini.ts
│   │   └── rag/
│   │       ├── chunk.ts
│   │       ├── extract.ts
│   │       └── search.ts
│   └── styles/
├── supabase/               # 初期スキーマ/ポリシー（任意）
├── package.json
└── README.md
```

---

**開発期間**: 2日 (ハッカソン)
**チーム構成**: フルスタック
**デプロイ**: Vercel + Supabase

本READMEは、既存制作物READMEの**トーンと段構成**に揃えています。必要に応じて、バッジ・受賞歴・スクリーンショット差し替え等を追加してください。
