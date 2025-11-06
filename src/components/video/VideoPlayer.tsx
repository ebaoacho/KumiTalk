"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Film, Loader2, MonitorPlay } from "lucide-react";

interface VideoPlayerProps {
  videoBase64?: string;
  isGenerating?: boolean;
  error?: string | null;
  onGenerate: () => void;
  onShow: () => void;
  onRetry: () => void;
  className?: string;
}

export function VideoPlayer({
  videoBase64,
  isGenerating = false,
  error,
  onGenerate,
  onShow,
  onRetry,
  className,
}: VideoPlayerProps) {
  const hasVideo = Boolean(videoBase64);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Button
        type="button"
        onClick={() => {
          if (isGenerating) return;
          if (hasVideo) {
            onShow();
          } else {
            onGenerate();
          }
        }}
        disabled={isGenerating}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-70",
          hasVideo
            ? "bg-gradient-to-br from-emerald-400 to-sky-500 hover:from-emerald-300 hover:to-sky-400"
            : "bg-gradient-to-br from-fuchsia-500 via-purple-500 to-indigo-500 hover:from-fuchsia-400 hover:via-purple-400 hover:to-indigo-400"
        )}
        aria-pressed={hasVideo}
        aria-busy={isGenerating}
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            動画を生成中…
          </>
        ) : hasVideo ? (
          <>
            <MonitorPlay className="h-4 w-4" />
            動画を表示する
          </>
        ) : (
          <>
            <Film className="h-4 w-4" />
            動画を生成する
          </>
        )}
      </Button>

      <div className="flex items-center gap-2 text-xs text-white/70">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium",
            hasVideo
              ? "border border-emerald-400/40 bg-emerald-400/15 text-emerald-100"
              : "border border-white/20 bg-white/10 text-white/70"
          )}
        >
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              hasVideo ? "bg-emerald-400" : "bg-white/50"
            )}
          />
          {hasVideo ? "生成済み" : "未生成"}
        </span>
        <span>
          {isGenerating
            ? "生成中です…数分お待ちください。"
            : hasVideo
              ? "このステップの動画は生成済みです。"
              : "まだ動画は生成されていません。"}
        </span>
      </div>

      {error && (
        <>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="self-start rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs text-red-200 hover:bg-red-500/20"
            onClick={onRetry}
          >
            再試行
          </Button>
          <p className="text-xs text-red-200">{error}</p>
        </>
      )}
    </div>
  );
}
