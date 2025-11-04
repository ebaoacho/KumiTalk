"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Play } from "lucide-react";

interface VideoPlayerProps {
  chatId: string;
  stepIndex: number;
  existingVideoBase64?: string;
  onVideoGenerated?: (videoBase64: string) => void;
}

export function VideoPlayer({
  chatId,
  stepIndex,
  existingVideoBase64,
  onVideoGenerated,
}: VideoPlayerProps) {
  const [videoBase64, setVideoBase64] = useState<string | undefined>(
    existingVideoBase64
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateVideo = async () => {
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
    } catch (err) {
      console.error("Video generation error:", err);
      setError(
        err instanceof Error ? err.message : "動画生成中にエラーが発生しました"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
        <p className="text-sm text-red-300">{error}</p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 text-red-300 hover:bg-red-500/20"
          onClick={handleGenerateVideo}
        >
          再試行
        </Button>
      </div>
    );
  }

  if (!videoBase64) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-white/10 bg-white/5 p-8">
        <Play className="h-12 w-12 text-white/40" />
        <p className="text-sm text-white/60">
          このステップの組み立て動画を生成できます
        </p>
        <Button
          onClick={handleGenerateVideo}
          disabled={isGenerating}
          className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg hover:from-indigo-400 hover:via-purple-400 hover:to-pink-400"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              動画生成中... (3分)
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              動画を生成
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border border-white/10 bg-black/40 shadow-xl">
        <video
          src={videoBase64}
          controls
          className="h-auto w-full"
          preload="metadata"
        >
          お使いのブラウザは動画タグをサポートしていません。
        </video>
      </div>
      <p className="text-xs text-white/50 text-center">
        🎬 組み立て動画 (ステップ {stepIndex + 1})
      </p>
    </div>
  );
}
