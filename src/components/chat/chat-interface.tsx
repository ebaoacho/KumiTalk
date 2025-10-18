"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useProgress } from "@/lib/progress";
import { Role } from "@prisma/client";
import { ChatSidebar } from "./chat-sidebar";
import { ChatWindow } from "./chat-window";

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
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  createdAt?: string;
  updatedAt?: string;
  timestamp?: string;
}

export function ChatInterface({ userId }: { userId: string }) {
  const { fetchWithProgress } = useProgress();

  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [view, setView] = useState<"library" | "chat">("library");

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    const loadChats = async () => {
      try {
        const response = await fetchWithProgress(`/api/chat/${userId}`);
        if (!response.ok) {
          throw new Error(`Failed to load chats (status ${response.status})`);
        }
        const data: Chat[] = await response.json();
        if (!cancelled) {
          setChats(data);
          setSelectedChatId(null);
          setView("library");
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
        alert("userId が未設定です。ログイン後にもう一度お試しください。");
        return;
      }

      const allowedTypes = ["application/pdf", "text/plain"];
      if (!allowedTypes.includes(file.type)) {
        alert("PDF またはテキストファイルのみアップロード可能です。");
        return;
      }

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

        const created: Chat = await response.json();
        setChats((prev) => [...prev, created]);
        setSelectedChatId(created.id);
        setView("chat");
      } catch (error) {
        console.error("Chat creation error:", error);
        alert(
          error instanceof Error
            ? error.message
            : "チャットの作成に失敗しました。"
        );
      }
    },
    [fetchWithProgress, userId]
  );

  const handleSelectChat = useCallback((chatId: string) => {
    setSelectedChatId(chatId);
    setView("chat");
  }, []);

  const handleBackToLibrary = useCallback(() => {
    setView("library");
    setSelectedChatId(null);
  }, []);

  const activeChat = useMemo(
    () => chats.find((chat) => chat.id === selectedChatId) ?? null,
    [chats, selectedChatId]
  );

  return (
    <div className="relative mt-2 flex h-full min-h-[calc(100vh-14rem)] w-full flex-1 items-stretch justify-center overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/70 via-indigo-900/40 to-sky-900/30 px-4 py-5 shadow-[0_35px_80px_rgba(45,76,255,0.24)] sm:mt-64 sm:px-6 sm:py-2">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.22),transparent_60%)]" />

      {view === "library" ? (
        <div className="flex w-full flex-1 min-h-0">
          <ChatSidebar
            chats={chats}
            onSelectChatId={handleSelectChat}
            onCreateChat={handleCreateChat}
          />
        </div>
      ) : (
        <div className="flex w-full flex-1 min-h-0">
          <ChatWindow
            selectedChatId={selectedChatId ?? undefined}
            chatMeta={activeChat ?? undefined}
            onBack={handleBackToLibrary}
          />
        </div>
      )}
    </div>
  );
}
