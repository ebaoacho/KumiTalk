"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  FileText,
  FolderPlus,
  Sparkles,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Chat } from "./chat-interface";
import { FileUploadDialog } from "../dialog/file-upload-dialog";
import { cn } from "@/lib/utils";

interface ChatSidebarProps {
  chats: Chat[];
  selectedChatId?: string;
  onSelectChatId: (chatId: string) => void;
  onCreateChat: (title: string, file: File) => void;
}

const formatDate = (value: string) => {
  try {
    const formatter = new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    return formatter.format(new Date(value));
  } catch {
    return value;
  }
};

export function ChatSidebar({
  chats,
  selectedChatId,
  onSelectChatId,
  onCreateChat,
}: ChatSidebarProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const sortedChats = useMemo(
    () =>
      [...chats].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      ),
    [chats],
  );

  const handleDialogSubmit = (title: string, file: File) => {
    onCreateChat(title, file);
    setIsDialogOpen(false);
  };

  return (
    <>
      <div className="relative flex w-full max-w-5xl flex-col gap-10 overflow-y-auto px-4 py-6 sm:px-8">
        <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-3 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-sky-200/90">
            <Sparkles className="h-3.5 w-3.5" />
            Library
          </span>
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            ファイルから始める会話
          </h2>
          <p className="text-sm text-white/70">
            マニュアルや資料をアップロードして、必要な手順やポイントを対話形式で素早く確認できます。
          </p>
          <Button
            onClick={() => setIsDialogOpen(true)}
            className="mt-2 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-400 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 transition hover:shadow-xl hover:shadow-cyan-400/40"
          >
            <Upload className="h-4 w-4" />
            ファイルを読み込む
          </Button>
        </div>

        {sortedChats.length === 0 ? (
          <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 rounded-3xl border border-white/10 bg-white/5 p-10 text-center shadow-[0_25px_60px_rgba(59,130,246,0.25)]">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/35 to-cyan-400/35 text-white">
              <FolderPlus className="h-7 w-7" />
            </div>
            <div className="space-y-3">
              <h3 className="text-2xl font-semibold text-white">
                まだファイルがありません
              </h3>
              <p className="text-sm text-white/70">
                手元のPDFや手順書をアップロードすると、チャットで内容を確認したり要点を抽出できます。
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(true)}
              className="rounded-full border-white/30 bg-white/5 text-white hover:bg-white/10"
            >
              新しいチャットを作成
            </Button>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {sortedChats.map((chat, index) => {
              const isActive = chat.id === selectedChatId;
              return (
              <button
                key={chat.id}
                onClick={() => onSelectChatId(chat.id)}
                className={cn(
                  "group relative flex flex-col gap-4 overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 text-left shadow-[0_25px_60px_rgba(59,130,246,0.2)] transition focus:outline-none focus:ring-2 focus:ring-cyan-300/60",
                  isActive
                    ? "border-cyan-200/60 bg-white/15 shadow-[0_30px_75px_rgba(34,211,238,0.32)]"
                    : "hover:border-cyan-200/40 hover:bg-white/10 hover:shadow-[0_30px_70px_rgba(34,211,238,0.28)]"
                )}
              >
                <div
                  className={cn(
                    "pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-500/0 via-sky-500/10 to-cyan-400/0 opacity-0 transition",
                    isActive ? "opacity-100" : "group-hover:opacity-100"
                  )}
                />
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/25 to-sky-500/25 text-white shadow-inner">
                      <FileText className="h-6 w-6" />
                    </div>
                    <div>
                      <span className="text-xs font-medium uppercase tracking-[0.3em] text-white/60">
                        Chat {index + 1}
                      </span>
                      <h3 className="text-lg font-semibold text-white">
                        {chat.title}
                      </h3>
                    </div>
                  </div>
                </div>
                <div className="relative flex items-center justify-between text-sm text-white/70">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    <span>{formatDate(chat.updatedAt)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-white/60">
                    {typeof chat.assemblyStepCount === "number" && (
                      <span className="rounded-full border border-white/20 bg-white/10 px-2 py-1">
                        {chat.assemblyStepCount} steps
                      </span>
                    )}
                    <span className="truncate max-w-[8rem] sm:max-w-[10rem]">
                      {chat.fileName}
                    </span>
                  </div>
                </div>
              </button>
            )})}
          </div>
        )}
      </div>

      <FileUploadDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={handleDialogSubmit}
      />
    </>
  );
}
