# 3Dビュー表示ガイド

このメモは `3d_obj/logo.glb` をウェブ上で表示し、チャット画面右上（「組立ステップ n件」バッジの横）に 3D ビューを開くボタンを追加する際の実装手順をまとめたものです。  
ダイアログ表示をベースに説明し、最後に別タブ版のポイントも記載しています。

---

## 1. GLB アセットの配置

1. `public/models/` 配下を作り、`3d_obj/logo.glb` を `public/models/logo.glb` として配置します。  
   Next.js では `public` 配下が自動で静的配信されるため、フロント側からは `/models/logo.glb` で参照できます。
2. Git に含めたい場合はファイルサイズに注意し、必要なら `git lfs` を利用してください。

> **補足**: `3d_obj/` は開発者向けワークスペース扱いのため、Next.js から直接配信されません。`public` 以下へコピーするか、ビルド時にコピーするスクリプトを用意するのが安全です。

---

## 2. ビューワの選定

もっとも手軽なのは Google 製の Web Components である `<model-viewer>` を使う方式です。React 向けにラップ不要で、GLB/GLTF の読込・ライト・操作（ズーム/回転）を一通りサポートします。

```
npm install @google/model-viewer
```

> 既存依存関係に Three.js 系ライブラリは入っていないため、新規導入の影響を最小化できます。もし高度なカスタマイズが必要になった場合は `three` + `@react-three/fiber` へ移行してください。

---

## 3. 3Dビューコンポーネントの実装

1. `src/components/three/ThreeDViewerDialog.tsx` を作成（クライアントコンポーネント）。  
2. 先頭で `import "@google/model-viewer";` を実行し `<model-viewer>` を登録します。`next/dynamic` を使う場合は `ssr: false` を指定してください。
3. 既存の `Dialog` / `DialogContent` / `Button` (`@/components/ui/dialog`, `@/components/ui/button`) を利用して下記のような構造にします。

```tsx
"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";

const ModelViewer = dynamic(() => import("@google/model-viewer"), { ssr: false });

type Props = { open: boolean; onOpenChange: (v: boolean) => void };

export function ThreeDViewerDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-slate-900 text-white">
        <DialogHeader>
          <DialogTitle>3Dビュー</DialogTitle>
        </DialogHeader>
        <div className="aspect-video w-full">
          <model-viewer
            src="/models/logo.glb"
            camera-controls
            auto-rotate
            ar
            shadow-intensity="0.8"
            style={{ width: "100%", height: "100%", background: "transparent" }}
          />
        </div>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          閉じる
        </Button>
      </DialogContent>
    </Dialog>
  );
}
```

4. 影や背景を調整したい場合は `<model-viewer>` の属性（`exposure`, `camera-orbit`, `environment-image` など）を追加します。

---

## 4. チャットヘッダーへのボタン追加

編集ファイル: `src/components/chat/chat-window.tsx`

1. `lucide-react` から `Box` など立体っぽいアイコンを追加インポート。
2. `ChatWindow` 内で `const [show3d, setShow3d] = useState(false);` を宣言。
3. ヘッダー（約 `ChatWindow` 992 行目前後）の「組立ステップ n件」を表示している `span` の右隣に下記ボタンを追加します。

```tsx
<Button
  type="button"
  variant="outline"
  size="sm"
  onClick={() => setShow3d(true)}
  className="inline-flex items-center gap-1.5 rounded-full border-white/30 bg-white/10 text-white hover:bg-white/20"
>
  <Box className="h-4 w-4" />
  3Dビュー
</Button>
```

4. コンポーネント末尾で `<ThreeDViewerDialog open={show3d} onOpenChange={setShow3d} />` をレンダリング。
5. 3Dモードが読み込み中であることを示したい場合、`<model-viewer>` の `load`/`error` イベントを拾ってトーストやローディング表示を出すと UX が向上します。

---

## 5. ダイアログではなく別タブで表示したい場合

1. `src/app/viewer/page.tsx` を追加し、上記 `ThreeDViewerDialog` から `<model-viewer>` 部分を抜き出して全画面レイアウトにします。
2. ボタンの `onClick` で `window.open("/viewer", "_blank", "noopener")` を実行。  
   Next.js サーバコンポーネント側でも `<Link href="/viewer" target="_blank" />` としておき、CSR 時に `window.open` が使えない環境でも遷移できるよう `Button` 内に `<Link>` をラップする手もあります。
3. 別タブ版でも `public/models/logo.glb` を参照するだけで動きます。

---

## 6. 動作確認チェックリスト

1. `npm run dev` を起動し、チャット画面で任意のドキュメントを開く。
2. ヘッダー右上に「3Dビュー」ボタンが表示されていることを確認。
3. ボタン押下でダイアログ（または新タブ）が開き、`logo.glb` が読み込まれて回転・拡大縮小できることを確認。
4. ダイアログの閉じる操作が正常に機能し、チャット状態が維持されることをチェック。
5. ネットワークが遅い環境でも 3D 読込エラーにならないか（`public/models/logo.glb` のパス含め）確認。

以上で 3D ビュー実装の下準備は完了です。必要に応じて複数 GLB を扱う際は、チャットごとに `modelUrl` を渡せる props を `ThreeDViewerDialog` に追加してください。
