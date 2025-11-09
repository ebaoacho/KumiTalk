# 完成形イメージ → 3D モデル化 実装手順

完成イメージ（`finalImageBase64`）を外部 API に送信し、返却される GLB をチャット画面で可視化するまでの流れをまとめます。

---

## 1. 既存 API の仕様

```
curl -X POST http://34.146.37.44:7860/infer -F "image=@./images/shelf.png"
```

レスポンス例:

```json
{
  "glb_url": "http://34.146.37.44/assets/shelf_1762636641.glb",
  "obj_path": "outputs/1762636604/instant-mesh-base/meshes/shelf.obj",
  "status": "success"
}
```

- `image` は PNG/JPEG ファイルとして送信する必要がある。
- 成功時は公開 URL (`glb_url`) と内部パス (`obj_path`) が返る。
- この API サーバーとの通信は HTTP のみなので、Next.js サーバ側で `fetch` + `FormData` を利用する。

---

## 2. バックエンド実装方針

1. **API ルートの追加**: `src/app/api/final-model/[chatId]/route.ts` を作成し、以下を行う。
   - `chatId` から `finalImageBase64` を取得。
   - Base64 をバイナリにデコードし、一時ファイル（`tmp/3d-source.png` など）に出力。
   - 外部 API へ `FormData` で POST。`fetch` で `multipart/form-data` を構築する。
   - 返却された `glb_url` をダウンロードし、`public/generated-models/<chatId>.glb` へ保存。  
     - 将来的に S3 等へ置き換える場合は、この層を抽象化する。
   - `chat.finalModelUrl`（新規カラム）や別テーブルに GLB パスを保存し、レスポンスで返す。
2. **Prisma スキーマ更新**:
   - `Chat` に `finalModelGlbUrl String?` を追加。
   - 生成日時やステータスを管理したい場合は `finalModelStatus`（`enum`）も用意する。
3. **リトライ/エラー処理**:
   - 外部 API が落ちる可能性があるため、再試行は 1〜2 回までに制限。
   - 失敗時は `status` を `failed` にし、UI にエラーを返す。
4. **セキュリティ**:
   - 外部 API は HTTP なので、最終的にダウンロードした GLB のみを顧客に配信する（`glb_url` を直接公開しない）。
   - 大きなファイルを扱うので `fetch` の `timeout` や `Content-Length` チェックを検討。

---

## 3. フロントエンドの流れ

1. `ChatWindow` の完成イメージカードに「3Dモデル生成」ボタンを追加。
   - 状態管理: `finalModelStatus` (`idle` | `processing` | `ready` | `failed`) と `finalModelGlbUrl` を `assemblyStepStore` に保持。
   - 生成中はスピナー／キャンセル不可にする。
2. ボタン押下で `/api/final-model/${chatId}` に `POST`。  
   - 成功時: GLB の URL を受け取り、`ThreeDViewerDialog` へ渡す。
   - 失敗時: トーストやエラーバナーで通知。
3. モデル準備ができたら、既存の 3D ビュー（`ThreeDViewerDialog`）の `modelSrc` を `finalModelGlbUrl` に切り替える。  
   - 従来の `logo.glb` はフォールバックとして残す。
   - 完成ステップに「3Dで確認」ボタンを表示し、クリックでダイアログを開く。

### カメラ映像を背景に使う場合

1. ブラウザのカメラアクセス (`navigator.mediaDevices.getUserMedia`) で取得したストリームを `<video>` 要素に描画。  
2. `ThreeDViewerDialog` 内で `position: relative` なラッパーを用意し、背景に `<video autoPlay muted playsInline>`、前面に `<model-viewer>` を重ねる。  
3. カメラ開始/停止はダイアログの `open` 状態に合わせて制御し、クリーンアップ (`stream.getTracks().forEach(track => track.stop())`) を忘れない。  
4. カメラ未許可や失敗時は単色背景にフォールバックする。

--- 

## 4. データの同期

1. `ChatInterface` の `assemblyStepStore` を `{ steps, finalPreview, finalModel }` に拡張。
2. `/api/assembly/[chatId]` を更新し、`finalModelGlbUrl`, `finalModelStatus` を一緒に返却。
3. チャット作成直後は完成画像だけ存在するため、GLB は `null`。  
   `3Dモデル生成` を実行したチャットは次回ロード時に URL が復元される。

---

## 5. テスト手順

1. `npm run dev` を起動し、新規チャットで完成イメージを確認。
2. 完成イメージカードの「3Dモデル生成」を押下。
3. API が `success` を返し、`public/generated-models/<chatId>.glb` が作成されることを確認。
4. 同ボタンが「3Dで表示」に変わり、クリックすると `<model-viewer>` が GLB を読み込むことを確認。
5. 失敗ケース（API サーバ停止など）で UI が落ちず、再試行できることを確認。

以上で完成形イメージから 3D モデルを生成し、アプリ内で閲覧するための実装方針が整います。実装時は GLB の保存先やアクセス権限（S3 署名 URL など）を環境に合わせて調整してください。
