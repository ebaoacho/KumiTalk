# 完成形イメージ表示 実装手順

チャット画面のステップ一覧の末尾に「完成形」の画像を表示する実装を行う際の手順です。Gemini のプロンプトをどう変更するか、データ保管の設計、フロントの表示位置までまとめています。

---

## 1. データモデルの拡張

1. `prisma/schema.prisma` の `Chat` もしくは `AssemblyStep` いずれかに完成イメージを格納できるフィールドを追加します。  
   - 例: `Chat` に `finalImageBase64 String? @db.Text` を追加し、1 チャットに 1 枚保存する。  
   - もしくは `AssemblyStep` に `isFinalPreview Boolean @default(false)` を追加して「擬似ステップ」として扱う案でも OK。
2. `npx prisma migrate dev --name add-final-preview` を実行し、DB を更新します。

> **ポイント:** 既存ステップとの混在を避けたいなら `Chat` 側に `finalImageBase64` / `finalImagePrompt` を持たせる方が扱いやすいです。

---

## 2. 生成パイプラインの更新（Gemini プロンプト）

完成形の画像は既存ステップとは異なる内容なので、Gemini の画像モデルへ以下の追加リクエストを行います。変更ファイルは `src/app/api/chat/route.ts` です。

1. ステップ生成後、全ステップのタイトル＋説明を concat して「最終完成状態」のテキストをまとめる。
2. `buildImagePrompt` に似た新関数 `buildFinalImagePrompt(steps: AssemblyStepPayload[]): string` を作成し、以下を含めます。
   - 家具全体が完成していること
   - 背景は白、線画はライトグレー（既存ルールと揃える）
   - 全パーツが所定のカラーでハイライトされていること
   - 可能なら完成後の利用シーンは写さない（純粋な完成図）
3. `GEMINI_IMAGE_MODEL` に対して `generateImage`（既存ステップ画像と同じ処理）を呼び、Base64 を取得。
4. 取得した Base64 を Prisma の `chat.finalImageBase64`（または擬似ステップ）として保存。

### プロンプト例

```
Create a high-resolution final instruction illustration that shows the furniture in its fully assembled state.
- Show the complete product with all coloured parts merged.
- Keep the background white (#FFFFFF) and use light grey outlines (#D1D5DB) for neutral elements.
- Emphasise correct alignment of panels, screws, and moving parts.
- Do not include people or environments; focus solely on the furniture.

Here is the step summary:
1. Step 1 title - description...
2. ...
```

> 既存の `buildImagePrompt` を流用できるよう、パーツの HEX 情報も含めるとカラー整合性が保てます。

---

## 3. API レスポンスの拡張

`GET /api/assembly/[chatId]`（`src/app/api/assembly/[chatId]/route.ts`）で完成画像を返却できるようにします。

1. Prisma の `findMany` 後に `const chat = await prisma.chat.findUnique({ select: { finalImageBase64: true } })` などで追加フィールドを取得。
2. レスポンスを `{ steps, finalPreview: chat?.finalImageBase64 ?? null }` のような形に変更。
3. `ChatInterface`/`ChatWindow` 側で `AssemblyStep[]` を保持している箇所に `finalPreview` を添付（`assemblyStepStore` は `steps` と `finalPreview` のペアにする等）。

---

## 4. フロントエンドでの表示

変更ファイル: `src/components/chat/chat-window.tsx`

1. `assemblySteps` の後に `const finalPreview = assemblyMeta.finalPreview` などを受け取れるように state を調整。
2. 「カラーガイド付き組立手順」セクションの末尾、またはチャットウィンドウ下部に以下のようなカードを追加。

```tsx
{finalPreview && (
  <article className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6 text-white">
    <header className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.3em] text-white/60">
      <Sparkles className="h-4 w-4" />
      完成イメージ
    </header>
    <Image
      src={`data:image/png;base64,${finalPreview}`}
      alt="完成形のレンダリング"
      width={1200}
      height={900}
      className="w-full rounded-2xl border border-white/10 bg-white/10 object-contain"
    />
  </article>
)}
```

3. 画像クリックでモーダル表示したい場合は既存の `ShowImageDialog` を使い回し、`selectedStep` とは別に `selectedPreview` state を用意します。

---

## 5. データ取得フローの更新

`ChatInterface`（`src/components/chat/chat-interface.tsx`）で `assemblyStepStore` を `Record<string, { steps: AssemblyStep[]; finalPreview?: string | null }>` に変更し、`loadAssemblySteps` が最終画像をまとめてセットするようにします。  
`ChatWindow` には `assemblySteps` と併せて `finalPreview` を渡し、前述のカードで描画します。

---

## 6. テスト手順

1. `npm run dev` を起動し、新しい PDF をアップロードしてチャットを作成。
2. 画像生成ログ（`src/app/api/chat/route.ts` の `console.log`）で完成画像生成リクエストが実行されているか確認。
3. UI でステップ一覧下部に「完成イメージ」が表示され、拡大表示や保存ができるか確認。
4. `finalImageBase64` が存在しない旧チャットでも UI が壊れずボタンが非表示になることを確認。

以上で完成形イメージ表示の実装手順は完了です。Gemini のプロンプトは **既存ステップ用** と **完成形用** の 2 種類を使い分ける点がポイントになります。
