'use client';
import { useEffect, useRef, useState } from 'react';

export default function Footer() {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Escapeキーで閉じる
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // モーダルオープン時にフォーカスを閉じるボタンへ
  useEffect(() => {
    if (open) closeBtnRef.current?.focus();
  }, [open]);

  return (
    <>
      <footer className="mt-16 border-t border-white/10 bg-black/30 backdrop-blur-xl">
        <div className="relative mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-6 lg:px-8">
          {/* 中央を常にセンター */}
          <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-sm text-white/80">
            © {new Date().getFullYear()} Tanaka Strong Hold
          </span>

          {/* 右端リンク */}
          <div className="ml-auto flex items-center gap-4">
            <button
              onClick={() => setOpen(true)}
              className="text-sm text-white/80 underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-white/30 rounded-md px-1"
              aria-haspopup="dialog"
              aria-expanded={open}
              aria-controls="about-dialog"
            >
              このアプリについて
            </button>
          </div>
        </div>
      </footer>

      {/* モーダル（Portal不要のシンプル版） */}
      {open && (
        <div
          id="about-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="about-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={(e) => {
            // 背景クリックで閉じる（中身クリックは止める）
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            ref={dialogRef}
            className="w-full max-w-lg rounded-2xl bg-neutral-900/95 p-6 shadow-2xl ring-1 ring-white/10 backdrop-blur-xl"
          >
            <div className="mb-4 flex items-start justify-between">
              <h2 id="about-title" className="text-lg font-semibold text-white">
                このアプリについて
              </h2>
              <button
                ref={closeBtnRef}
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-1 text-sm text-white/70 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                aria-label="閉じる"
              >
                ✕
              </button>
            </div>

            {/* ---- 概要文（編集して使ってください） ---- */}
            <div className="space-y-3 text-sm leading-6 text-white/85">
              <p>
                「組みTalk」は、家具の組み立てをAIが対話型で支援するアプリです
              </p>
            </div>

            {/* ---- 概要文（編集して使ってください） ---- */}
            <div className="mt-4 space-y-4 text-sm leading-6 text-white/85">
              <h3 className="text-sm font-semibold text-white">キャッチコピー</h3>
              <ul className="list-disc space-y-1 pl-5">
                <li>複雑な家具の組み立ては今日から迷わせない</li>
              </ul>

              <h3 className="text-sm font-semibold text-white">「組みTalk」の由来</h3>
              <div className="mt-2 grid grid-cols-[auto_min-content_1fr] gap-x-1 text-sm text-white/85">
                <div className="py-1 pr-1 text-white">「組み立て」×「Talk」</div>
                <div className="py-1 text-center leading-none">=</div>
                <div className="py-1">組み立てながら話す</div>

                <div className="py-1 pr-1 text-white">「汲み解く」</div>
                <div className="py-1 text-center leading-none">=</div>
                <div className="py-1">説明書の意味を汲み取って会話する</div>
              </div>

              
              <h3 className="text-sm font-semibold text-white">使い方（3ステップ）</h3>
              <ul className="list-disc space-y-1 pl-5">
                <li>取説PDFをアップロード</li>
                <li>回答を見ながら組み立て</li>
                <li>気になる工程・部品については，チャットにて質問！</li>
              </ul>

              <h3 className="text-sm font-semibold text-white">特徴</h3>
              <ul className="list-disc space-y-1 pl-5">
                <li>初心者にもやさしい操作性</li>
                <li>手が止まる「つまずき」をチャットですぐ解消</li>
              </ul>
            </div>



            <div className="mt-6 flex justify-end gap-3">
            </div>
          </div>
        </div>
      )}
    </>
  );
}
