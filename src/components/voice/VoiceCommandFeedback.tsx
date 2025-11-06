"use client";

import { useEffect, useState } from "react";
import { CheckCircle, AlertCircle, Info } from "lucide-react";

interface VoiceCommandFeedback {
  type: 'success' | 'error' | 'info';
  message: string;
  timestamp: Date;
}

interface VoiceCommandFeedbackProps {
  feedback: VoiceCommandFeedback | null;
  onDismiss: () => void;
}

export function VoiceCommandFeedback({
  feedback,
  onDismiss
}: VoiceCommandFeedbackProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (feedback) {
      setIsVisible(true);
      // 3秒後に自動で消去
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onDismiss, 300); // アニメーション完了後に完全に削除
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [feedback, onDismiss]);

  if (!feedback) return null;

  const getIcon = () => {
    switch (feedback.type) {
      case 'success':
        return <CheckCircle className="h-4 w-4" />;
      case 'error':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getColorClasses = () => {
    switch (feedback.type) {
      case 'success':
        return 'bg-green-500/90 text-white border-green-400';
      case 'error':
        return 'bg-red-500/90 text-white border-red-400';
      default:
        return 'bg-gray-500/90 text-white border-gray-400';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      <div 
        className={`
          px-4 py-3 rounded-lg shadow-lg backdrop-blur-sm border
          transition-all duration-300 max-w-sm
          ${isVisible ? 'animate-in slide-in-from-top-2 opacity-100' : 'animate-out slide-out-to-top-2 opacity-0'}
          ${getColorClasses()}
        `}
      >
        <div className="flex items-start gap-3">
          {getIcon()}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium break-words">
              {feedback.message}
            </p>
            <p className="text-xs opacity-80 mt-1">
              {feedback.timestamp.toLocaleTimeString('ja-JP', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })}
            </p>
          </div>
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(onDismiss, 300);
            }}
            className="text-white/80 hover:text-white transition-colors"
            aria-label="フィードバックを閉じる"
          >
            <span className="text-lg leading-none">×</span>
          </button>
        </div>
      </div>
    </div>
  );
}
