"use client";

import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VoiceMicButtonProps {
  isListening: boolean;
  isSpeaking: boolean;
  isSupported: boolean;
  onToggle: () => void;
}

export function VoiceMicButton({
  isListening,
  isSpeaking,
  isSupported,
  onToggle,
}: VoiceMicButtonProps) {
  if (!isSupported) {
    return null;
  }

  return (
    <div className="fixed bottom-8 right-8 z-50">
      <Button
        onClick={onToggle}
        size="lg"
        className={`
          relative h-16 w-16 rounded-full shadow-lg transition-all duration-300
          ${
            isSpeaking
              ? "bg-gradient-to-br from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
              : isListening
                ? "bg-gradient-to-br from-blue-500 to-cyan-500 animate-pulse-scale"
                : "bg-gradient-to-br from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500"
          }
        `}
        aria-label={
          isSpeaking
            ? "音声出力を停止して入力を開始する"
            : isListening
              ? "音声入力を停止する"
              : "音声入力を開始する"
        }
      >
        {isSpeaking ? (
          <div className="relative">
            <MicOff className="h-7 w-7 text-white" />
            {/* 斜線表示 */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-0.5 w-10 bg-white rotate-45 transform origin-center" />
            </div>
          </div>
        ) : (
          <Mic className="h-7 w-7 text-white" />
        )}
      </Button>
    </div>
  );
}
