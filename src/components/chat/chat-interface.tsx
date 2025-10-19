"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useProgress } from "@/lib/progress";
import { Role } from "@prisma/client";
import { ChatSidebar } from "./chat-sidebar";
import { ChatWindow } from "./chat-window";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface User {
  id: string;
  email: string;
  password?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Document {
  id: string;
  userId: string;
  name: string;
  manufacturer?: string | null;
  modelNumber?: string | null;
  summary?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Chat {
  id: string;
  title: string;
  fileName: string;
  createdAt: string;
  updatedAt: string;
  assemblyStepCount?: number;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  createdAt?: string;
  updatedAt?: string;
  timestamp?: string;
  stepIndex?: number | null;
}

export interface AssemblyPart {
  name: string;
  description?: string;
  color: string;
}

export interface AssemblyStep {
  id?: string;
  chatId?: string;
  stepIndex: number;
  title: string;
  description: string;
  imageBase64?: string;
  parts: AssemblyPart[];
}

type ChatView = "library" | "chat";

export function ChatInterface({ userId }: { userId: string }) {
  const { fetchWithProgress } = useProgress();

  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [view, setView] = useState<ChatView>("library");
  const [assemblyStepStore, setAssemblyStepStore] = useState<
    Record<string, AssemblyStep[]>
  >({});
  const [assemblyLoadingChatId, setAssemblyLoadingChatId] = useState<
    string | null
  >(null);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null);
  const [errorOpen, setErrorOpen] = useState(false);
  const [pendingDeleteChatId, setPendingDeleteChatId] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    const loadChats = async () => {
      try {
        const response = await fetchWithProgress(`/api/chat/user/${userId}`);
        if (!response.ok) {
          throw new Error(`Failed to load chats (status ${response.status})`);
        }
        const data: Chat[] = await response.json();
        if (!cancelled) {
          setChats(data);
          setSelectedChatId(null);
          setView("library");
          setAssemblyStepStore({});
          setAssemblyLoadingChatId(null);
        }
      } catch (error) {
        console.error("Failed to load chats:", error);
      }
    };

    void loadChats();

    return () => {
      cancelled = true;
    };
  }, [fetchWithProgress, userId]);

  const handleCreateChat = useCallback(
    async (title: string, file: File) => {
      if (!userId) {
        alert(
          "userId が未設定です。ログイン後にもう一度お試しください。"
        );
        return;
      }

      const allowedTypes = ["application/pdf"];
      if (!allowedTypes.includes(file.type)) {
        alert("PDF ファイルのみアップロード可能です。");
        return;
      }

      setIsCreatingChat(true);
      setAssemblyLoadingChatId(null);

      try {
        const formData = new FormData();
        formData.append("userId", userId);
        formData.append("title", title);
        formData.append("file", file);

        const response = await fetchWithProgress("/api/chat", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            (errorData as { error?: string }).error ??
              "チャットの作成に失敗しました。"
          );
        }

        const created = (await response.json()) as Chat & {
          assemblySteps?: AssemblyStep[];
        };

        setChats((prev) => [...prev, created]);
        setSelectedChatId(created.id);
        setView("chat");

        if (Array.isArray(created.assemblySteps)) {
          setAssemblyStepStore((prev) => ({
            ...prev,
            [created.id]: created.assemblySteps ?? [],
          }));
        }
      } catch (error) {
        console.error("Chat creation error:", error);
        setErrorOpen(true);
      } finally {
        setIsCreatingChat(false);
      }
    },
    [fetchWithProgress, userId]
  );

  const loadAssemblySteps = useCallback(
    async (chatId: string) => {
      setAssemblyLoadingChatId(chatId);
      try {
        const response = await fetchWithProgress(`/api/assembly/${chatId}`);
        if (!response.ok) {
          const errorPayload = await response.json().catch(() => ({}));
          throw new Error(
            (errorPayload as { error?: string }).error ??
              "組立ステップの取得に失敗しました。"
          );
        }
        const steps = (await response.json()) as AssemblyStep[];
        setAssemblyStepStore((prev) => ({ ...prev, [chatId]: steps }));
      } catch (error) {
        console.error("Failed to fetch assembly steps:", error);
        alert(
          error instanceof Error
            ? error.message
            : "組立ステップの取得に失敗しました。"
        );
      } finally {
        setAssemblyLoadingChatId(null);
      }
    },
    [fetchWithProgress]
  );

  const handleSelectChat = useCallback(
    (chatId: string) => {
      setSelectedChatId(chatId);
      setView("chat");
      if (!assemblyStepStore[chatId]) {
        void loadAssemblySteps(chatId);
      }
    },
    [assemblyStepStore, loadAssemblySteps]
  );

  const handleBackToLibrary = useCallback(() => {
    setView("library");
    setSelectedChatId(null);
  }, []);

  const requestDeleteChat = useCallback(
    (chatId: string) => {
      setPendingDeleteChatId(chatId);
    },
    []
  );

  const confirmedChat = useMemo(
    () => chats.find((chat) => chat.id === pendingDeleteChatId) ?? null,
    [chats, pendingDeleteChatId]
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDeleteChatId) return;
    const chatId = pendingDeleteChatId;
    setDeletingChatId(chatId);
    try {
      const response = await fetchWithProgress(`/api/chat/${chatId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(
          (errorPayload as { error?: string }).error ??
            "チャットの削除に失敗しました。"
        );
      }

      setChats((prev) => prev.filter((chat) => chat.id !== chatId));
      setAssemblyStepStore((prev) => {
        const next = { ...prev };
        delete next[chatId];
        return next;
      });

      if (selectedChatId === chatId) {
        setSelectedChatId(null);
        setView("library");
      }
    } catch (error) {
      console.error("Failed to delete chat:", error);
      alert(
        error instanceof Error
          ? error.message
          : "チャットの削除に失敗しました。"
      );
    } finally {
      setDeletingChatId(null);
      setPendingDeleteChatId(null);
    }
  }, [fetchWithProgress, pendingDeleteChatId, selectedChatId]);

  const activeChat = useMemo(
    () => chats.find((chat) => chat.id === selectedChatId) ?? null,
    [chats, selectedChatId]
  );

  const activeAssemblySteps =
    (selectedChatId && assemblyStepStore[selectedChatId]) ?? [];

  const isAssemblyLoading =
    (assemblyLoadingChatId !== null &&
      selectedChatId === assemblyLoadingChatId) ||
    (isCreatingChat && selectedChatId === null);

  return (
    <div className="relative mt-4 flex h-full min-h-[calc(100vh-12rem)] w-full flex-1 items-stretch justify-center overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/70 via-indigo-900/40 to-sky-900/30 px-4 py-6 shadow-[0_35px_80px_rgba(45,76,255,0.24)] sm:mt-4 sm:px-6 sm:py-32">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.22),transparent_60%)]" />

      {view === "library" ? (
        <div className="flex w-full flex-1 min-h-0">
          <ChatSidebar
            chats={chats}
            selectedChatId={selectedChatId ?? undefined}
            onSelectChatId={handleSelectChat}
            onCreateChat={handleCreateChat}
            onDeleteChat={requestDeleteChat}
            deletingChatId={deletingChatId ?? undefined}
          />
        </div>
      ) : (
        <div className="flex w-full flex-1 min-h-0">
          <ChatWindow
            selectedChatId={selectedChatId ?? undefined}
            chatMeta={activeChat ?? undefined}
            onBack={handleBackToLibrary}
            assemblySteps={activeAssemblySteps as AssemblyStep[]}
            isProcessingAssembly={isAssemblyLoading || isCreatingChat}
          />
        </div>
      )}
      <Dialog
        open={Boolean(pendingDeleteChatId)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeleteChatId(null);
          }
        }}
      >
        <DialogContent className="border-white/10 bg-slate-950/90 text-white backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle>チャットを削除しますか？</DialogTitle>
            <DialogDescription className="text-white/70">
              {confirmedChat ? (
                <>
                  「
                  <span className="font-semibold text-white">
                    {confirmedChat.title}
                  </span>
                  」の会話履歴やアップロードしたファイルが削除されます。
                  この操作は元に戻せません。
                </>
              ) : (
                "選択されたチャットを削除します。"
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="space-y-2 sm:space-y-0">
            <Button
              type="button"
              variant="ghost"
              className="w-full border border-white/10 bg-white/5 text-white hover:bg-white/15 sm:w-auto"
              onClick={() => setPendingDeleteChatId(null)}
              disabled={Boolean(deletingChatId)}
            >
              キャンセル
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="w-full bg-gradient-to-r from-rose-500 via-orange-400 to-amber-300 text-slate-950 shadow-[0_12px_30px_rgba(239,68,68,0.35)] hover:from-rose-400 hover:via-orange-300 hover:to-amber-200 sm:w-auto"
              onClick={handleConfirmDelete}
              disabled={Boolean(deletingChatId)}
            >
              {deletingChatId ? "削除中…" : "削除する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={errorOpen} onOpenChange={setErrorOpen}>
        <DialogContent className="border-white/10 bg-slate-950/90 text-white backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle>読み取りエラー</DialogTitle>
            <DialogDescription className="text-white/70">
              PDFの読み取りに失敗しました。再度お試しください。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              className="w-full border border-white/10 bg-white/5 text-white hover:bg-white/15 sm:w-auto"
              onClick={() => setErrorOpen(false)}
            >
              閉じる
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
