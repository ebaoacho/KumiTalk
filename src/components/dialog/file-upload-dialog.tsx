"use client";

import { useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Upload, X } from "lucide-react";

interface FileUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (title: string, file: File) => void;
}

export function FileUploadDialog({
  open,
  onOpenChange,
  onSubmit,
}: FileUploadDialogProps) {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const resetState = () => {
    setTitle("");
    setFile(null);
    setDragActive(false);
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const validateFile = (candidate: File) => {
    const lower = candidate.name.toLowerCase();
    if (!lower.endsWith(".txt") && !lower.endsWith(".pdf")) {
      alert("PDF またはテキストファイル (.txt) のみアップロードできます。");
      return false;
    }
    return true;
  };

  const readTextFile = (target: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      // 現時点では内容を保持するだけです。必要に応じて処理を追加してください。
      void reader.result;
    };
    reader.readAsText(target, "UTF-8");
  };

  const handleDrag = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (event.type === "dragenter" || event.type === "dragover") {
      setDragActive(true);
    } else if (event.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);

    const dropped = event.dataTransfer.files?.[0];
    if (!dropped) return;
    if (!validateFile(dropped)) return;

    setFile(dropped);
    if (dropped.name.toLowerCase().endsWith(".txt")) {
      readTextFile(dropped);
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected) return;
    if (!validateFile(selected)) return;

    setFile(selected);
    if (selected.name.toLowerCase().endsWith(".txt")) {
      readTextFile(selected);
    }
  };

  const handleSubmit = () => {
    if (!title || !file) return;
    onSubmit(title, file);
    resetState();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="overflow-hidden border border-white/20 bg-gradient-to-br from-[#0b1224]/95 via-[#101936]/92 to-[#15234a]/95 text-white shadow-[0_40px_100px_rgba(37,99,235,0.45)] backdrop-blur-3xl sm:max-w-lg">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.45),transparent_60%)]" />
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-16 top-1/2 h-56 w-56 -translate-y-1/2 rounded-full bg-cyan-400/25 blur-3xl" />
          <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-indigo-500/35 blur-2xl" />
          <div className="absolute -bottom-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-fuchsia-500/30 blur-3xl" />
        </div>

        <DialogHeader className="relative z-10 space-y-2">
          <DialogTitle className="text-xl font-semibold text-white drop-shadow">
            ファイルをアップロード
          </DialogTitle>
          <p className="text-sm text-white/80">
            対応形式: PDF / TXT。必要な資料を読み込んでチャットで活用しましょう。
          </p>
        </DialogHeader>

        <div className="relative z-10 space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="chat-title" className="text-sm font-medium text-white/85">
              チャットのタイトル
            </Label>
            <Input
              id="chat-title"
              placeholder="例: 定期メンテナンス手順書"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="h-12 rounded-xl border-white/30 bg-white/15 text-base text-white placeholder:text-white/65 focus:border-sky-300 focus:ring-2 focus:ring-sky-400/40"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium text-white/85">
              ファイル (PDF / TXT)
            </Label>
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={[
                "relative flex min-h-[12rem] flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-6 transition",
                dragActive
                  ? "border-sky-300 bg-sky-400/15 shadow-[0_20px_50px_rgba(56,189,248,0.35)]"
                  : "border-white/25 bg-white/10 hover:border-sky-200/70 hover:bg-white/15",
              ].join(" ")}
            >
              <input
                id="file-upload"
                type="file"
                accept=".pdf,.txt"
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                onChange={handleFileChange}
              />

              {file ? (
                <div className="flex w-full items-center justify-between rounded-xl border border-white/20 bg-white/15 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/50 to-cyan-400/40 text-white shadow-inner shadow-indigo-500/40">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-white">
                        {file.name}
                      </span>
                      <span className="text-xs text-white/70">
                        {(file.size / 1024).toFixed(2)} KB
                      </span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20"
                    onClick={(event) => {
                      event.preventDefault();
                      setFile(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-white/90 shadow-inner shadow-white/20">
                    <Upload className="h-7 w-7" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-white">
                      ここにドラッグ＆ドロップ
                    </p>
                    <p className="text-xs text-white/75">
                      またはクリックして PDF / TXT を選択してください
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="relative z-10 flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="rounded-xl border-white/25 bg-white/10 text-white hover:bg-white/20"
          >
            キャンセル
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!title || !file}
            className="rounded-xl bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-400 px-6 text-white shadow-lg shadow-sky-500/35 transition hover:shadow-xl hover:shadow-emerald-400/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            完了
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
