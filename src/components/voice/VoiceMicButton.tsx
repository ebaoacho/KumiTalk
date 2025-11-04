"use client";

import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VoiceMicButtonProps {
  isListening: boolean;
  isSpeaking: boolean;
  isSupported: boolean;
  currentTranscript: string;
  onToggle: () => void;
}

export function VoiceMicButton({
  isListening,
  isSpeaking,
  isSupported,
  currentTranscript,
  onToggle,
}: VoiceMicButtonProps) {
  if (!isSupported) {
    return null;
  }

  return (
    <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-3">
      {/* 音声認識中の中間結果表示 */}
      {isListening && currentTranscript && (
        <div className="bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg max-w-xs animate-in slide-in-from-bottom-2 duration-300">
          <div className="text-sm text-gray-600 mb-1">認識中...</div>
          <div className="text-gray-800 font-medium">{currentTranscript}</div>
        </div>
      )}
      
      {/* 状態表示 */}
      {(isListening || isSpeaking) && (
        <div className="bg-black/80 backdrop-blur-sm rounded-full px-3 py-1 shadow-lg animate-in slide-in-from-bottom-2 duration-300">
          <div className="text-white text-xs font-medium flex items-center gap-2">
            {isSpeaking ? (
              <>
                <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                音声出力中
              </>
            ) : isListening ? (
              <>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                音声認識中
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* メインボタン */}
      <Button
        onClick={onToggle}
        size="lg"
        className={`
          relative h-16 w-16 rounded-full shadow-lg transition-all duration-300
          ${
            isSpeaking
              ? "bg-gradient-to-br from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
              : isListening
                ? "bg-gradient-to-br from-blue-500 to-cyan-500 animate-pulse"
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
        {/* 音声レベルインジケーター（音声認識中のみ） */}
        {isListening && (
          <div className="absolute inset-0 rounded-full">
            <div className="absolute inset-2 rounded-full bg-white/20 animate-ping"></div>
            <div className="absolute inset-1 rounded-full bg-white/10 animate-ping animation-delay-75"></div>
          </div>
        )}
        
        {isSpeaking ? (
          <div className="relative z-10">
            <MicOff className="h-7 w-7 text-white" />
            {/* 斜線表示 */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-0.5 w-10 bg-white rotate-45 transform origin-center" />
            </div>
          </div>
        ) : (
          <Mic className="h-7 w-7 text-white relative z-10" />
        )}
      </Button>
    </div>
  );
}
