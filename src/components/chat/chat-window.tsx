"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { useProgress } from "@/lib/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Chat, Message } from "./chat-interface";

interface ChatWindowProps {
  selectedChatId?: string;
  chatMeta?: Chat;
  onBack?: () => void;
}

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
}: ChatWindowProps) {
  const { fetchWithProgress } = useProgress();

  const [inputMessage, setInputMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScroll = useRef(false);

  useEffect(() => {
    if (!selectedChatId) {
      setMessages([]);
      setIsLoading(false);
      shouldAutoScroll.current = false;
      if (listRef.current) {
        listRef.current.scrollTo({ top: 0 });
      }
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
            if (listRef.current) {
              listRef.current.scrollTo({ top: 0 });
            }
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
    if (listRef.current) {
      listRef.current.scrollTo({ top: 0 });
    }
  }, [selectedChatId]);

  useEffect(() => {
    if (!shouldAutoScroll.current) {
      return;
    }
    shouldAutoScroll.current = false;
    requestAnimationFrame(() => {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }, [messages]);

  const title = useMemo(
    () => chatMeta?.title ?? "選択中のチャット",
    [chatMeta?.title],
  );

  const fileName = useMemo(
    () => chatMeta?.fileName ?? "ファイル名未設定",
    [chatMeta?.fileName],
  );

  const handleSend = async (chatId?: string) => {
    const content = inputMessage.trim();
    if (!content) return;
    if (!chatId) {
      alert("チャットが選択されていません。");
      return;
    }

    setInputMessage("");
    setIsSending(true);

    try {
      const response = await fetchWithProgress(`/api/messages/${chatId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          (errorData as { error?: string }).error ??
            "メッセージの送信に失敗しました。",
        );
      }

      const data: { userMessage: Message; aiMessage: Message } =
        await response.json();

      shouldAutoScroll.current = true;
      setMessages((prev) => [...prev, data.userMessage, data.aiMessage]);
    } catch (error) {
      console.error("Failed to send message:", error);
      alert(
        error instanceof Error
          ? error.message
          : "メッセージの送信に失敗しました。",
      );
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
            Ready to chat
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-semibold text-white">
              チャットを選択してください
            </h3>
            <p className="text-sm text-white/70">
              ファイル一覧からチャットを選ぶと、ここに会話が表示されます。
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
      </header>

      <div className="flex h-full min-h-0 flex-col">
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto px-6 py-6 min-h-0"
        >
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-white/70">
              メッセージを読み込んでいます…
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-white/60">
              <p className="text-sm">まだメッセージがありません。</p>
              <p className="text-xs">
                下の入力欄から最初のメッセージを送ってみましょう。
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "mb-4 flex gap-3",
                  message.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-xl",
                    message.role === "user" ? "items-end" : "items-start",
                  )}
                >
                  <div
                    className={cn(
                      "rounded-3xl px-5 py-3 text-sm leading-relaxed shadow-lg transition",
                      message.role === "user"
                        ? "bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-400 text-white shadow-indigo-500/30"
                        : "border border-white/10 bg-white/10 text-white shadow-cyan-500/10 backdrop-blur",
                    )}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                  {message.timestamp && (
                    <span className="mt-2 block text-xs text-white/60">
                      {formatTimestamp(message.timestamp)}
                    </span>
                  )}
                </div>
              </div>
            ))
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
              placeholder="メッセージを入力…"
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
    </div>
  );
}
