"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Film, MonitorPlay } from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoPlayerProps {
  chatId: string;
  stepIndex: number;
  existingVideoBase64?: string;
  onVideoGenerated?: (videoBase64: string) => void;
  onOpenVideoDialog?: (videoBase64: string) => void;
  className?: string;
}

export function VideoPlayer({
  chatId,
  stepIndex,
  existingVideoBase64,
  onVideoGenerated,
  onOpenVideoDialog,
  className,
}: VideoPlayerProps) {
  const [videoBase64, setVideoBase64] = useState<string | undefined>(
    existingVideoBase64
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setVideoBase64(existingVideoBase64);
    setError(null);
  }, [existingVideoBase64, stepIndex, chatId]);

  const handleGenerateVideo = async (shouldOpenAfter = false) => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/generate-video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chatId,
          stepIndex,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          (errorData as { error?: string }).error ?? "動画生成に失敗しました"
        );
      }

      const data = (await response.json()) as {
        success: boolean;
        videoBase64: string;
        cached: boolean;
      };

      setVideoBase64(data.videoBase64);
      onVideoGenerated?.(data.videoBase64);
      if (shouldOpenAfter) {
        onOpenVideoDialog?.(data.videoBase64);
      }
    } catch (err) {
      console.error("Video generation error:", err);
      setError(
        err instanceof Error ? err.message : "動画生成中にエラーが発生しました"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Button
        type="button"
        onClick={() => {
          if (videoBase64) {
            onOpenVideoDialog?.(videoBase64);
            return;
          }
          void handleGenerateVideo(true);
        }}
        disabled={isGenerating}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-70",
          videoBase64
            ? "bg-gradient-to-br from-emerald-400 to-sky-500 hover:from-emerald-300 hover:to-sky-400"
            : "bg-gradient-to-br from-fuchsia-500 via-purple-500 to-indigo-500 hover:from-fuchsia-400 hover:via-purple-400 hover:to-indigo-400"
        )}
        aria-pressed={Boolean(videoBase64)}
        aria-busy={isGenerating}
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            動画を生成中…
          </>
        ) : (
          <>
            {videoBase64 ? (
              <MonitorPlay className="h-4 w-4" />
            ) : (
              <Film className="h-4 w-4" />
            )}
            {videoBase64 ? "動画を表示する" : "動画を生成する"}
          </>
        )}
      </Button>
      <div className="flex items-center gap-2 text-xs text-white/70">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium",
            videoBase64
              ? "border border-emerald-400/40 bg-emerald-400/15 text-emerald-100"
              : "border border-white/20 bg-white/10 text-white/70"
          )}
        >
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              videoBase64 ? "bg-emerald-400" : "bg-white/50"
            )}
          >
          </span>
        </span>
        <span>
          {isGenerating
            ? "生成中です…数分お待ちください。"
            : videoBase64
              ? "このステップの動画は生成済みです。"
              : "まだ動画は生成されていません。"}
        </span>
      </div>
      {error && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs text-red-200 hover:bg-red-500/20"
          onClick={() => handleGenerateVideo()}
        >
          再試行
        </Button>
      )}
      {error && (
        <p className="text-xs text-red-200">{error}</p>
      )}
    </div>
  );
}
