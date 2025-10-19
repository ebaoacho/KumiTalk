"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Loader2, Send, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import Image from "next/image";
import { useProgress } from "@/lib/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { AssemblyStep, Chat, Message } from "./chat-interface";
import { ShowImageDialog } from "../dialog/show-image-dialog";
import MarkdownRenderer from "./markdown-renderer";

interface ChatWindowProps {
  selectedChatId?: string;
  chatMeta?: Chat;
  onBack?: () => void;
  assemblySteps?: AssemblyStep[];
  isProcessingAssembly?: boolean;
}

type StepFilter = "all" | number;

const formatTimestamp = (value?: string) => {
  if (!value) return "";
  try {
    const date = new Date(value);
    return new Intl.DateTimeFormat("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return "";
  }
};

export function ChatWindow({
  selectedChatId,
  chatMeta,
  onBack,
  assemblySteps = [],
  isProcessingAssembly = false,
}: ChatWindowProps) {
  const { fetchWithProgress } = useProgress();

  const [inputMessage, setInputMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [stepFilter, setStepFilter] = useState<StepFilter>("all");
  const [showImageDialog, setShowImageDialog] = useState(false);

  const endRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScroll = useRef(false);

  useEffect(() => {
      setStepFilter("all");
  }, [assemblySteps]);

  useEffect(() => {
    if (!selectedChatId) {
      setMessages([]);
      setIsLoading(false);
      shouldAutoScroll.current = false;
      listRef.current?.scrollTo({ top: 0 });
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    const fetchMessages = async (chatId: string) => {
      try {
        const response = await fetchWithProgress(`/api/messages/${chatId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch messages: ${response.status}`);
        }
        const data: Message[] = await response.json();
        if (!cancelled) {
          shouldAutoScroll.current = false;
          setMessages(data);
          requestAnimationFrame(() => {
            listRef.current?.scrollTo({ top: 0 });
          });
        }
      } catch (error) {
        console.error("Failed to load messages:", error);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void fetchMessages(selectedChatId);

    return () => {
      cancelled = true;
    };
  }, [fetchWithProgress, selectedChatId]);

  useEffect(() => {
    shouldAutoScroll.current = false;
    listRef.current?.scrollTo({ top: 0 });
  }, [selectedChatId]);

  const title = useMemo(
    () => chatMeta?.title ?? "選択中のチャット",
    [chatMeta?.title]
  );
  const fileName = useMemo(
    () => chatMeta?.fileName ?? "ファイル名未設定",
    [chatMeta?.fileName]
  );

  const selectedStep =
    typeof stepFilter === "number"
      ? assemblySteps.find((step) => step.stepIndex === stepFilter) ?? null
      : null;

  // ステップの並び（インデックス順に揃える）
  const stepIndexes = useMemo(
    () => [...assemblySteps.map(s => s.stepIndex)].sort((a, b) => a - b),
    [assemblySteps]
  );
  const currentIdx = useMemo(
    () => (typeof stepFilter === "number" ? stepIndexes.indexOf(stepFilter) : -1),
    [stepFilter, stepIndexes]
  );
  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx >= 0 && currentIdx < stepIndexes.length - 1;
  const goPrev = () => { if (hasPrev) setStepFilter(stepIndexes[currentIdx - 1]); };
  const goNext = () => { if (hasNext) setStepFilter(stepIndexes[currentIdx + 1]); };

  useEffect(() => {
  if (typeof stepFilter !== "number") return;
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); goPrev(); }
    if (e.key === "ArrowRight") { e.preventDefault(); goNext(); }
  };
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}, [stepFilter, goPrev, goNext]);

  const filteredMessages = useMemo(() => messages, [messages]);

  const handleSend = async (chatId?: string) => {
    const content = inputMessage.trim();
    if (!content) return;
    if (!chatId) {
      alert("チャットが選択されていません。");
      return;
    }

    // 楽観的にユーザーメッセージを先に出す（任意）
    const optimisticUser: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content,
      stepIndex: typeof stepFilter === "number" ? stepFilter : null,
      createdAt: new Date().toISOString(),
    };

    setInputMessage("");
    setIsSending(true);
    setMessages((prev) => [...prev, optimisticUser]);


    try {
      const response = await fetch(`/api/messages/${chatId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          stepIndex: typeof stepFilter === "number" ? stepFilter : null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          (errorData as { error?: string }).error ??
            "メッセージの送信に失敗しました。"
        );
      }

      const data: { userMessage: Message; aiMessage: Message } =
        await response.json();

      // 楽観的メッセージを置き換え（またはそのまま残して AI だけ追加でも可）
      setMessages((prev) => {
        // temp を本物に置き換え、AI を後ろに追加
        const withoutTemp = prev.filter((m) => m.id !== optimisticUser.id);
        return [...withoutTemp, data.userMessage, data.aiMessage];
      });
    } catch (error) {
      console.error("Failed to send message:", error);
      alert(
        error instanceof Error
          ? error.message
          : "メッセージの送信に失敗しました。"
      );
      // 失敗時は楽観的メッセージを取り消す
      setMessages((prev) => prev.filter((m) => m.id !== optimisticUser.id));
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void handleSend(selectedChatId);
  };

  if (!selectedChatId) {
    return (
      <div className="relative flex h-full w-full flex-1 items-center justify-center overflow-hidden rounded-3xl border border-dashed border-white/10 bg-white/5 text-white/70">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(129,140,248,0.2),transparent_55%)]" />
        <div className="flex flex-col items-center gap-6 px-10 text-center">
          <div className="rounded-full border border-white/20 bg-white/10 px-5 py-2 text-xs uppercase tracking-[0.3em] text-white/60">
            Ready to assemble
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-semibold text-white">
              組立マニュアルを選択してください
            </h3>
            <p className="text-sm text-white/70">
              サイドバーでファイルを選ぶと、このエリアにステップ画像とチャットが表示されます。
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full flex-1 min-h-0 flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_30px_80px_rgba(34,197,247,0.25)]">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(129,140,248,0.25),transparent_55%)]" />
      <header className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-indigo-500/40 via-sky-500/30 to-cyan-400/30 px-6 py-4 text-white shadow-lg backdrop-blur-lg">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={onBack}
              className="flex h-9 items-center gap-1.5 rounded-full border border-transparent bg-white px-4 text-xs font-semibold text-slate-900 shadow hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              ドキュメント一覧へ戻る
            </Button>
          )}
          <div>
            <h3 className="text-lg font-semibold leading-tight">{title}</h3>
            <p className="text-xs text-white/80">{fileName}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isProcessingAssembly && (
            <span className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white/80">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              画像を抽出しています…
            </span>
          )}
          {!isProcessingAssembly && assemblySteps.length > 0 && (
            <span className="rounded-full border border-emerald-300/40 bg-emerald-400/25 px-3 py-1 text-xs font-semibold text-emerald-50">
              組立ステップ {assemblySteps.length} 件
            </span>
          )}
        </div>
      </header>

      <div className="flex h-full min-h-0 flex-col">
        {assemblySteps.length > 0 && (
          <section className="border-b border-white/10 bg-white/10 px-6 py-6 backdrop-blur">
            {/* ヘッダー + ステップピル */}
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-white/50">
                  Assembly Steps
                </p>
                <h4 className="text-lg font-semibold text-white">カラーガイド付き組立手順</h4>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-white/70">
                <button
                  type="button"
                  onClick={() => setStepFilter("all")}
                  className={cn(
                    "rounded-full border px-3 py-1 transition",
                    stepFilter === "all"
                      ? "border-sky-300/60 bg-sky-300/25 text-white"
                      : "border-white/15 bg-white/5 hover:border-sky-200/40"
                  )}
                >
                  全ステップ
                </button>
                {assemblySteps.map((step) => (
                  <button
                    key={step.stepIndex}
                    type="button"
                    onClick={() => setStepFilter(step.stepIndex)}
                    className={cn(
                      "rounded-full border px-3 py-1 transition",
                      stepFilter === step.stepIndex
                        ? "border-sky-300/60 bg-sky-300/25 text-white"
                        : "border-white/15 bg-white/5 hover:border-sky-200/40"
                    )}
                  >
                    Step {step.stepIndex}
                  </button>
                ))}
              </div>
            </div>
          {/* 表示切替：全ステップ or 単体表示 */}
          {stepFilter === "all" ? (
            // これまで通り：全ステップのグリッド
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {assemblySteps.map((step) => (
                <article
                  key={step.stepIndex}
                  role="button"
                  tabIndex={0}
                  onClick={() => setStepFilter(step.stepIndex)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setStepFilter(step.stepIndex);
                    }
                  }}
                  className={cn(
                    "flex flex-col overflow-hidden rounded-2xl border border-white/15 bg-white/5 shadow-[0_14px_35px_rgba(56,189,248,0.25)] transition hover:border-sky-200/40 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-sky-200/70"
                  )}
                >
                  <div className="flex items-center justify-between px-5 pt-5 text-xs uppercase tracking-[0.3em] text-white/50">
                    <span>Step {step.stepIndex}</span>
                    <span className="truncate">{step.title}</span>
                  </div>
                  {step.imageBase64 ? (
                    <div className="group relative my-4 h-40 w-full overflow-hidden">
                      <Image
                        src={step.imageBase64}
                        alt={`組立ステップ ${step.stepIndex}`}
                        width={640}
                        height={360}
                        unoptimized
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                      />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
                    </div>
                  ) : (
                    <div className="flex h-40 w-full items-center justify-center bg-white/5 text-xs text-white/50">
                      画像なし
                    </div>
                  )}
                  <div className="px-5 pb-4 text-sm text-white/75 line-clamp-3">
                    {step.description}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            // 単体表示（Featured のみ）＋左右矢印
            selectedStep && (
              <div className="relative">
                {/* 左右の矢印 */}
                <button
                  type="button"
                  onClick={goPrev}
                  disabled={!hasPrev}
                  className={cn(
                    "absolute left-0 top-1/2 -translate-y-1/2 z-10",
                    "rounded-full border border-white/20 bg-black/30 p-2 backdrop-blur",
                    "hover:bg-black/50 disabled:opacity-40 disabled:cursor-not-allowed"
                  )}
                  aria-label="前のステップへ"
                >
                  <ChevronLeft className="h-6 w-6 text-white" />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  disabled={!hasNext}
                  className={cn(
                    "absolute right-0 top-1/2 -translate-y-1/2 z-10",
                    "rounded-full border border-white/20 bg-black/30 p-2 backdrop-blur",
                    "hover:bg-black/50 disabled:opacity-40 disabled:cursor-not-allowed"
                  )}
                  aria-label="次のステップへ"
                >
                  <ChevronRight className="h-6 w-6 text-white" />
                </button>
          
                {/* Featured 本体 */}
                <article className="mb-6 overflow-hidden rounded-3xl border border-sky-300/60 bg-white/10 shadow-[0_25px_60px_rgba(56,189,248,0.25)]">
                  <div className="flex flex-col gap-4 p-5 md:flex-row">
                    <div className="md:w-[46%]">
                     <div className="mb-3 flex items-center gap-2 text-xs">
                       <span className="rounded-full border border-sky-300/60 bg-sky-300/25 px-2 py-0.5 text-white">
                         Featured
                       </span>
                       <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-white/80">
                         Step {selectedStep.stepIndex}
                       </span>
                     </div>
                     {selectedStep.imageBase64 ? (
                       <button
                         type="button"
                         onClick={() => setShowImageDialog(true)}
                         className="group relative block h-64 w-full overflow-hidden rounded-2xl sm:h-80 md:h-96"
                       >
                         <Image
                           src={selectedStep.imageBase64}
                           alt={`組立ステップ ${selectedStep.stepIndex}`}
                           width={960}
                           height={540}
                           unoptimized
                           className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                         />
                         <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                         <span className="pointer-events-none absolute bottom-3 right-3 rounded-full border border-white/40 bg-black/45 px-3 py-1 text-xs text-white/80">
                           クリックで拡大
                         </span>
                       </button>
                     ) : (
                       <div className="flex h-64 w-full items-center justify-center rounded-2xl bg-white/5 text-xs text-white/50 sm:h-80 md:h-96">
                         画像は生成されませんでした
                       </div>
                     )}
                   </div>
                   <div className="md:flex-1">
                     <h5 className="mb-2 text-xl font-semibold text-white">{selectedStep.title}</h5>
                     <p className="mb-3 text-sm text-white/80">{selectedStep.description}</p>
                     {!!selectedStep.parts.length && (
                       <div className="mt-4">
                         <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
                           Parts & Colors
                         </p>
                         <div className="flex flex-wrap gap-2">
                           {selectedStep.parts.map((part) => (
                             <span
                               key={`${selectedStep.stepIndex}-${part.name}`}
                               className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/80"
                             >
                               <span className="block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: part.color }} />
                               {part.name}
                             </span>
                           ))}
                         </div>
                       </div>
                     )}
                     <div className="mt-4 flex flex-wrap gap-2">
                       <Button
                         type="button"
                         className="rounded-full bg-gradient-to-br from-cyan-400 to-emerald-400 text-slate-900 hover:from-cyan-300 hover:to-emerald-300"
                         onClick={() => setShowImageDialog(true)}
                       >
                         画像を拡大表示
                       </Button>
                       <Button
                         variant="outline"
                         type="button"
                         className="rounded-full border-white/20 bg-white/10 text-white hover:bg-white/20"
                         onClick={() => setStepFilter("all")}
                       >
                         全ステップを表示
                       </Button>
                     </div>
                   </div>
                 </div>
               </article>
             </div>
           )
          )}
        </section>
        )}

        <div ref={listRef} className="relative min-h-0 flex-1 overflow-y-auto px-6 py-6">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-white/70">
              メッセージを読み込んでいます…
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-white/60">
              <p className="text-sm">まだメッセージがありません。</p>
              <p className="text-xs">
                下の入力欄から質問すると、AIが組立手順についてサポートします。
              </p>
            </div>
          ) : (
            filteredMessages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "mb-4 flex gap-3",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-xl",
                    message.role === "user" ? "items-end" : "items-start"
                  )}
                >
                  <div
                    className={cn(
                      "rounded-3xl px-5 py-3 text-sm leading-relaxed shadow-lg transition",
                      message.role === "user"
                        ? "bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-400 text-white shadow-indigo-500/30"
                        : "border border-white/10 bg-white/10 text-white shadow-cyan-500/10 backdrop-blur"
                    )}
                  >
                    <MarkdownRenderer
                      content={message.content}
                      className={cn(
                        // prose で見やすく（Tailwind Typography を入れてないなら下行は削ってOK）
                        "prose prose-invert max-w-none",
                        // 微調整：気泡内の余白・色のバランス
                        "[&_.hljs-title]:font-semibold [&_.hljs-attr]:font-normal [&_code]:font-mono"
                      )}
                    />
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-white/45">
                    {typeof message.stepIndex === "number" && (
                      <span className="rounded-full border border-white/15 bg-white/5 px-2 py-1">
                        Step {message.stepIndex}
                      </span>
                    )}
                    {(() => {
                      const timestampText = formatTimestamp(
                        message.timestamp ?? message.createdAt
                      );
                      return timestampText ? <span>{timestampText}</span> : null;
                    })()}
                  </div>
                </div>
              </div>
            ))
          )}

          {/* 送信中だけ表示する“AI入力中”バブル（チャット領域限定のローディング） */}
          {isSending && (
            <div className="mb-4 flex justify-start gap-3">
              <div className="max-w-xl items-start">
                <div className="flex items-center gap-2 rounded-3xl border border-white/10 bg-white/10 px-5 py-3 text-sm leading-relaxed text-white shadow-cyan-500/10 backdrop-blur">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>AIが入力しています…</span>
                </div>
                <div className="mt-2 flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-white/45">
                  {typeof stepFilter === "number" && (
                    <span className="rounded-full border border-white/15 bg-white/5 px-2 py-1">
                      Step {stepFilter}
                    </span>
                  )}
                  <span>
                    {new Intl.DateTimeFormat("ja-JP", {
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date())}
                  </span>
                </div>
              </div>
            </div>
          )}      
          <div ref={endRef} />
        </div>

        <footer className="shrink-0 border-t border-white/10 bg-white/5 px-6 py-4 backdrop-blur-xl">
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 shadow-[0_18px_45px_rgba(14,165,233,0.22)]"
          >
            <Input
              value={inputMessage}
              onChange={(event) => setInputMessage(event.target.value)}
              placeholder={
                selectedStep
                  ? `Step ${selectedStep.stepIndex} について質問する...`
                  : "組立に関する質問を入力..."
              }
              className="h-12 flex-1 border-none bg-transparent text-white placeholder:text-white/50 focus-visible:ring-0"
              autoComplete="off"
            />
            <Button
              type="submit"
              disabled={!inputMessage.trim() || isSending}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-emerald-400 text-slate-950 hover:from-cyan-300 hover:to-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              aria-disabled={!inputMessage.trim() || isSending}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </footer>
      </div>
      <ShowImageDialog
        open={showImageDialog}
        onOpenChange={setShowImageDialog}
        imageBase64={selectedStep?.imageBase64 ?? ""}
        stepIndex={selectedStep?.stepIndex ?? 0}
      />
    </div>
  );
}
