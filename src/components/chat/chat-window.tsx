"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Loader2, Send, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import Image from "next/image";
import { useProgress } from "@/lib/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { AssemblyStep, Chat, Message } from "./chat-interface";
import { ShowImageDialog } from "../dialog/show-image-dialog";
import { VideoPlayer } from "@/components/video/VideoPlayer";
import MarkdownRenderer from "./markdown-renderer";
import { VoiceMicButton } from "@/components/voice/VoiceMicButton";
import { VoiceCommandFeedback } from "@/components/voice/VoiceCommandFeedback";
import { useVoiceControl, type VoiceCommand } from "@/hooks/useVoiceControl";

interface ChatWindowProps {
  selectedChatId?: string;
  chatMeta?: Chat;
  onBack?: () => void;
  assemblySteps?: AssemblyStep[];
  isProcessingAssembly?: boolean;
}

type StepFilter = "all" | number;

const formatTimestamp = (value?: string) => {
  if (!value) return "";
  try {
    const date = new Date(value);
    return new Intl.DateTimeFormat("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return "";
  }
};

export function ChatWindow({
  selectedChatId,
  chatMeta,
  onBack,
  assemblySteps = [],
  isProcessingAssembly = false,
}: ChatWindowProps) {
  const { fetchWithProgress } = useProgress();

  const [inputMessage, setInputMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [stepFilter, setStepFilter] = useState<StepFilter>("all");
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [voiceFeedback, setVoiceFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    timestamp: Date;
  } | null>(null);

  const endRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScroll = useRef(false);

  const voiceCommandHandlerRef = useRef<(command: VoiceCommand) => void>(() => {});
  const voiceErrorHandlerRef = useRef<(error: string) => void>(() => {});

  const {
    isListening,
    isSpeaking,
    isSupported,
    currentTranscript,
    speak,
    stopSpeaking,
    startListening,
    stopListening,
  } = useVoiceControl({
    onCommand: (command) => voiceCommandHandlerRef.current(command),
    onError: (error) => voiceErrorHandlerRef.current(error),
    language: "ja-JP",
  });

  const voiceActivatedRef = useRef(false);
  const [isVoiceProcessing, setIsVoiceProcessing] = useState(false);
  const voiceResumeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isRecognizedVoiceQuestion = useCallback((content: string) => {
    const trimmed = content.trim();
    if (trimmed.length < 5) {
      return false;
    }

    const collapsed = trimmed.replace(/\s+/g, "");
    if (collapsed.length < 3) {
      return false;
    }

    if (!/[一-龠ぁ-んァ-ンa-zA-Z0-9]/u.test(collapsed)) {
      return false;
    }

    const uniqueChars = new Set(collapsed);
    if (uniqueChars.size <= 1) {
      return false;
    }

    const hasQuestionMark = /[?？]/.test(trimmed);
    const hasQuestionEnding = /(か|かな|かい|かしら)([?？]*)$/u.test(trimmed);
    const questionKeywords = [
      "教えて",
      "どう",
      "どこ",
      "どれ",
      "どの",
      "なぜ",
      "なに",
      "何",
      "理由",
      "方法",
      "確認",
      "説明",
      "できない",
      "できる",
      "使い方",
      "わからない",
      "help",
      "why",
      "how",
      "what",
      "where",
      "when",
      "which",
      "explain",
      "step",
      "ステップ",
    ];
    const hasKeyword = questionKeywords.some((keyword) => trimmed.includes(keyword));

    return hasKeyword || hasQuestionMark || hasQuestionEnding;
  }, []);

  const sanitizeMarkdownForSpeech = useCallback((text: string) => {
    let processed = text;
    processed = processed.replace(/```[\s\S]*?```/g, ""); // Remove code blocks entirely
    processed = processed.replace(/`([^`]+)`/g, "$1"); // Inline code
    processed = processed.replace(/!\[([^\]]*)\]\([^\)]+\)/g, "$1"); // Images
    processed = processed.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1"); // Links
    processed = processed.replace(/[*_~]+/g, ""); // Emphasis markers
    processed = processed.replace(/^>\s?/gm, ""); // Blockquotes
    processed = processed.replace(/^[-+*]\s+/gm, ""); // Bullet markers
    processed = processed.replace(/#+\s*/g, ""); // Headings
    processed = processed.replace(/[:：]/g, "、"); // Colons to pause
    processed = processed.replace(/\r?\n\r?\n/g, "。"); // Paragraph breaks
    processed = processed.replace(/\r?\n/g, "、"); // Line breaks
    processed = processed.replace(/\s{2,}/g, " "); // Extra spaces
    return processed.trim();
  }, []);

  useEffect(() => {
    voiceErrorHandlerRef.current = (error) => {
      console.error("音声コントロールエラー:", error);
    };
  }, []);

  useEffect(() => {
    if (voiceResumeTimerRef.current) {
      clearTimeout(voiceResumeTimerRef.current);
      voiceResumeTimerRef.current = null;
    }

    if (!voiceActivatedRef.current) {
      return;
    }

    if (isVoiceProcessing || isSpeaking || isListening) {
      return;
    }

    voiceResumeTimerRef.current = setTimeout(() => {
      if (voiceActivatedRef.current && !isVoiceProcessing && !isSpeaking && !isListening) {
        startListening();
      }
    }, 400);

    return () => {
      if (voiceResumeTimerRef.current) {
        clearTimeout(voiceResumeTimerRef.current);
        voiceResumeTimerRef.current = null;
      }
    };
  }, [isListening, isSpeaking, isVoiceProcessing, startListening]);

  useEffect(() => {
    setStepFilter("all");
  }, [assemblySteps]);

  useEffect(() => {
    if (!selectedChatId) {
      setMessages([]);
      setIsLoading(false);
      shouldAutoScroll.current = false;
      listRef.current?.scrollTo({ top: 0 });
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    const fetchMessages = async (chatId: string) => {
      try {
        const response = await fetchWithProgress(`/api/messages/${chatId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch messages: ${response.status}`);
        }
        const data: Message[] = await response.json();
        if (!cancelled) {
          shouldAutoScroll.current = false;
          setMessages(data);
          requestAnimationFrame(() => {
            listRef.current?.scrollTo({ top: 0 });
          });
        }
      } catch (error) {
        console.error("Failed to load messages:", error);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void fetchMessages(selectedChatId);

    return () => {
      cancelled = true;
    };
  }, [fetchWithProgress, selectedChatId]);

  useEffect(() => {
    shouldAutoScroll.current = false;
    listRef.current?.scrollTo({ top: 0 });
  }, [selectedChatId]);

  const title = useMemo(
    () => chatMeta?.title ?? "選択中のチャット",
    [chatMeta?.title]
  );
  const fileName = useMemo(
    () => chatMeta?.fileName ?? "ファイル名未設定",
    [chatMeta?.fileName]
  );

  const selectedStep =
    typeof stepFilter === "number"
      ? assemblySteps.find((step) => step.stepIndex === stepFilter) ?? null
      : null;

  // ステップの並び（インデックス順に揃える）
  const stepIndexes = useMemo(
    () => [...assemblySteps.map((s) => s.stepIndex)].sort((a, b) => a - b),
    [assemblySteps]
  );
  const currentIdx = useMemo(
    () => (typeof stepFilter === "number" ? stepIndexes.indexOf(stepFilter) : -1),
    [stepFilter, stepIndexes]
  );
  const hasPrev = stepIndexes.length > 0 && (currentIdx > 0 || currentIdx === -1);
  const hasNext = stepIndexes.length > 0 && (currentIdx === -1 || currentIdx < stepIndexes.length - 1);

  const goPrev = useCallback(() => {
    if (currentIdx > 0) {
      setStepFilter(stepIndexes[currentIdx - 1]);
    } else if (currentIdx === -1 && stepIndexes.length > 0) {
      setStepFilter(stepIndexes[stepIndexes.length - 1]);
    }
  }, [currentIdx, stepIndexes]);

  const goNext = useCallback(() => {
    if (stepIndexes.length === 0) {
      return;
    }
    if (currentIdx === -1) {
      setStepFilter(stepIndexes[0]);
      return;
    }
    if (currentIdx < stepIndexes.length - 1) {
      setStepFilter(stepIndexes[currentIdx + 1]);
    }
  }, [currentIdx, stepIndexes]);

  useEffect(() => {
    if (typeof stepFilter !== "number") return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrev();
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev, stepFilter]);

  const handleToggleListening = useCallback(() => {
    if (isVoiceProcessing) {
      return;
    }

    // 音声出力を強制停止してすぐに聞き直す
    if (isSpeaking) {
      if (!voiceActivatedRef.current) {
        voiceActivatedRef.current = true;
      }
      stopSpeaking();
      setTimeout(() => {
        if (voiceActivatedRef.current && !isListening) {
          startListening();
        }
      }, 120);
      return;
    }

    if (voiceActivatedRef.current) {
      voiceActivatedRef.current = false;
      stopListening();
      return;
    }

    voiceActivatedRef.current = true;
    if (!isListening) {
      startListening();
    }
  }, [isListening, isSpeaking, isVoiceProcessing, startListening, stopListening, stopSpeaking]);

  const filteredMessages = useMemo(() => messages, [messages]);

  const handleSend = useCallback(
    async (chatId?: string, overrideContent?: string): Promise<Message | null> => {
      const source = overrideContent ?? inputMessage;
      const content = source.trim();
      if (!content) return null;
      if (!chatId) {
        alert("チャットが選択されていません。");
        return null;
      }

      const optimisticUser: Message = {
        id: `temp-${Date.now()}`,
        role: "user",
        content,
        stepIndex: typeof stepFilter === "number" ? stepFilter : null,
        createdAt: new Date().toISOString(),
      };

      if (!overrideContent) {
        setInputMessage("");
      }
      setIsSending(true);
      setMessages((prev) => [...prev, optimisticUser]);

      try {
        const response = await fetch(`/api/messages/${chatId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content,
            stepIndex: typeof stepFilter === "number" ? stepFilter : null,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            (errorData as { error?: string }).error ?? "メッセージの送信に失敗しました。"
          );
        }

        const data: { userMessage: Message; aiMessage: Message } = await response.json();

        setMessages((prev) => {
          const withoutTemp = prev.filter((m) => m.id !== optimisticUser.id);
          return [...withoutTemp, data.userMessage, data.aiMessage];
        });

        return data.aiMessage;
      } catch (error) {
        console.error("Failed to send message:", error);
        alert(
          error instanceof Error ? error.message : "メッセージの送信に失敗しました。"
        );
        setMessages((prev) => prev.filter((m) => m.id !== optimisticUser.id));
        return null;
      } finally {
        setIsSending(false);
      }
    },
    [inputMessage, stepFilter]
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void handleSend(selectedChatId);
  };

  useEffect(() => {
    voiceCommandHandlerRef.current = (command: VoiceCommand) => {
      if (command.type === "stopSpeaking") {
        stopSpeaking();
        return;
      }

      voiceActivatedRef.current = true;

      if (!selectedChatId) {
        speak("チャットが選択されていません。");
        return;
      }

      if (command.type === "step" && command.stepNumber) {
        const target = assemblySteps.find((step) => step.stepIndex === command.stepNumber);
        if (target) {
          setStepFilter(command.stepNumber);
          speak(`ステップ${command.stepNumber}に移動しました。${target.title}`);
          setVoiceFeedback({
            type: 'success',
            message: `ステップ${command.stepNumber}に移動`,
            timestamp: new Date()
          });
        } else {
          const maxStep = assemblySteps.length > 0 ? Math.max(...assemblySteps.map(s => s.stepIndex)) : 0;
          speak(`ステップ${command.stepNumber}は存在しません。利用可能なステップは1から${maxStep}です。`);
          setVoiceFeedback({
            type: 'error',
            message: `ステップ${command.stepNumber}は存在しません`,
            timestamp: new Date()
          });
        }
        return;
      }

      if (command.type === "next") {
        if (stepIndexes.length === 0) {
          speak("ステップが登録されていません。");
          return;
        }
        if (currentIdx === -1) {
          const firstStep = stepIndexes[0];
          setStepFilter(firstStep);
          const target = assemblySteps.find(step => step.stepIndex === firstStep);
          speak(`ステップ${firstStep}に移動しました。${target?.title || ''}`);
          return;
        }
        if (currentIdx < stepIndexes.length - 1) {
          const nextStep = stepIndexes[currentIdx + 1];
          setStepFilter(nextStep);
          const target = assemblySteps.find(step => step.stepIndex === nextStep);
          speak(`ステップ${nextStep}に移動しました。${target?.title || ''}`);
          setVoiceFeedback({
            type: 'success',
            message: `次のステップ${nextStep}に移動`,
            timestamp: new Date()
          });
        } else {
          speak("これが最後のステップです。");
          setVoiceFeedback({
            type: 'info',
            message: '最後のステップです',
            timestamp: new Date()
          });
        }
        return;
      }

      if (command.type === "prev") {
        if (stepIndexes.length === 0) {
          speak("ステップが登録されていません。");
          return;
        }
        if (currentIdx === -1) {
          const lastStep = stepIndexes[stepIndexes.length - 1];
          setStepFilter(lastStep);
          const target = assemblySteps.find(step => step.stepIndex === lastStep);
          speak(`ステップ${lastStep}に移動しました。${target?.title || ''}`);
          return;
        }
        if (currentIdx > 0) {
          const prevStep = stepIndexes[currentIdx - 1];
          setStepFilter(prevStep);
          const target = assemblySteps.find(step => step.stepIndex === prevStep);
          speak(`ステップ${prevStep}に移動しました。${target?.title || ''}`);
        } else {
          speak("これが最初のステップです。");
        }
        return;
      }

      if (command.type === "first") {
        if (stepIndexes.length === 0) {
          speak("ステップが登録されていません。");
          return;
        }
        const firstStep = stepIndexes[0];
        setStepFilter(firstStep);
        const target = assemblySteps.find(step => step.stepIndex === firstStep);
        speak(`最初のステップ${firstStep}に移動しました。${target?.title || ''}`);
        return;
      }

      if (command.type === "last") {
        if (stepIndexes.length === 0) {
          speak("ステップが登録されていません。");
          return;
        }
        const lastStep = stepIndexes[stepIndexes.length - 1];
        setStepFilter(lastStep);
        const target = assemblySteps.find(step => step.stepIndex === lastStep);
        speak(`最後のステップ${lastStep}に移動しました。${target?.title || ''}`);
        return;
      }

      if (command.type === "all") {
        setStepFilter("all");
        speak(`全${assemblySteps.length}ステップを表示しています。`);
        return;
      }

      if (command.type === "zoomIn") {
        if (selectedStep?.imageBase64) {
          setShowImageDialog(true);
          speak(`ステップ${selectedStep.stepIndex}の画像を拡大表示しました。`);
        } else if (stepFilter === "all") {
          speak("画像を拡大するには、まず特定のステップを選択してください。");
        } else {
          speak("このステップには拡大できる画像がありません。");
        }
        return;
      }

      if (command.type === "zoomOut") {
        if (showImageDialog) {
          setShowImageDialog(false);
          speak("拡大表示を閉じました。");
        } else {
          speak("現在画像は拡大表示されていません。");
        }
        return;
      }

      if (command.type === "chat" && command.text) {
        const voiceContent = command.text.trim();
        if (!voiceContent) {
          speak("メッセージが認識できませんでした。", {
            onEnd: () => {
              // 読み上げ終了後、自動的にマイクを再開（対話継続）
              if (voiceActivatedRef.current && !isListening) {
                startListening();
              }
            }
            });
          return;
        }
        if (!isRecognizedVoiceQuestion(voiceContent)) {
          speak("質問として認識できませんでした。もう一度はっきりと質問してください。", {
            onEnd: () => {
              if (voiceActivatedRef.current && !isListening) {
                startListening();
              }
            },
          });
          setVoiceFeedback({
            type: 'error',
            message: '音声が質問として認識されませんでした',
            timestamp: new Date(),
          });
          return;
        }
        void (async () => {
          setIsVoiceProcessing(true);
          try {
            const aiMessage = await handleSend(selectedChatId, voiceContent);
            if (aiMessage) {
              const spokenText = sanitizeMarkdownForSpeech(aiMessage.content) || "回答を読み上げできませんでした。";
              speak(spokenText, {
                onEnd: () => {
                  // AI応答の読み上げ終了後、自動的にマイクを再開（対話継続）
                  if (voiceActivatedRef.current && !isListening) {
                    startListening();
                  }
                }
              });
            } else {
              speak("メッセージの送信に失敗しました。", {
                onEnd: () => {
                  // エラーメッセージの読み上げ終了後も、マイクを再開
                  if (voiceActivatedRef.current && !isListening) {
                    startListening();
                  }
                }
              });
            }
          } finally {
            setIsVoiceProcessing(false);
          }
        })();
        return;
      }
    };
  }, [
    assemblySteps,
    currentIdx,
    handleSend,
    isListening,
    isRecognizedVoiceQuestion,
    isVoiceProcessing,
    sanitizeMarkdownForSpeech,
    selectedChatId,
    selectedStep,
    showImageDialog,
    speak,
    startListening,
    stepIndexes,
    stopSpeaking,
  ]);

  if (!selectedChatId) {
    return (
      <>
        <div className="relative flex h-full w-full flex-1 items-center justify-center overflow-hidden rounded-3xl border border-dashed border-white/10 bg-white/5 text-white/70">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(129,140,248,0.2),transparent_55%)]" />
          <div className="flex flex-col items-center gap-6 px-10 text-center">
            <div className="rounded-full border border-white/20 bg-white/10 px-5 py-2 text-xs uppercase tracking-[0.3em] text-white/60">
              Ready to assemble
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-semibold text-white">
                組立マニュアルを選択してください
              </h3>
              <p className="text-sm text-white/70">
                サイドバーでファイルを選ぶと、このエリアにステップ画像とチャットが表示されます。
              </p>
            </div>
          </div>
        </div>
        {isSupported && (
          <VoiceMicButton
            isListening={isListening}
            isSpeaking={isSpeaking}
            isSupported={isSupported}
            currentTranscript={currentTranscript}
            isProcessing={isVoiceProcessing}
            onToggle={handleToggleListening}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="relative flex h-full w-full flex-1 min-h-0 flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_30px_80px_rgba(34,197,247,0.25)]">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(129,140,248,0.25),transparent_55%)]" />
      <header className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-indigo-500/40 via-sky-500/30 to-cyan-400/30 px-6 py-4 text-white shadow-lg backdrop-blur-lg">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={onBack}
              className="flex h-9 items-center gap-1.5 rounded-full border border-transparent bg-white px-4 text-xs font-semibold text-slate-900 shadow hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              ドキュメント一覧へ戻る
            </Button>
          )}
          <div>
            <h3 className="text-lg font-semibold leading-tight">{title}</h3>
            <p className="text-xs text-white/80">{fileName}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isProcessingAssembly && (
            <span className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white/80">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              画像を抽出しています…
            </span>
          )}
          {!isProcessingAssembly && assemblySteps.length > 0 && (
            <span className="rounded-full border border-emerald-300/40 bg-emerald-400/25 px-3 py-1 text-xs font-semibold text-emerald-50">
              組立ステップ {assemblySteps.length} 件
            </span>
          )}
        </div>
      </header>

      <div className="flex h-full min-h-0 flex-col">
        {assemblySteps.length > 0 && (
          <section className="border-b border-white/10 bg-white/10 px-6 py-6 backdrop-blur">
            {/* ヘッダー + ステップピル */}
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-white/50">
                  Assembly Steps
                </p>
                <h4 className="text-lg font-semibold text-white">カラーガイド付き組立手順</h4>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-white/70">
                <button
                  type="button"
                  onClick={() => setStepFilter("all")}
                  className={cn(
                    "rounded-full border px-3 py-1 transition",
                    stepFilter === "all"
                      ? "border-sky-300/60 bg-sky-300/25 text-white"
                      : "border-white/15 bg-white/5 hover:border-sky-200/40"
                  )}
                >
                  全ステップ
                </button>
                {assemblySteps.map((step) => (
                  <button
                    key={step.stepIndex}
                    type="button"
                    onClick={() => setStepFilter(step.stepIndex)}
                    className={cn(
                      "rounded-full border px-3 py-1 transition",
                      stepFilter === step.stepIndex
                        ? "border-sky-300/60 bg-sky-300/25 text-white"
                        : "border-white/15 bg-white/5 hover:border-sky-200/40"
                    )}
                  >
                    Step {step.stepIndex}
                  </button>
                ))}
              </div>
            </div>
          {/* 表示切替：全ステップ or 単体表示 */}
          {stepFilter === "all" ? (
            // これまで通り：全ステップのグリッド
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {assemblySteps.map((step) => (
                <article
                  key={step.stepIndex}
                  role="button"
                  tabIndex={0}
                  onClick={() => setStepFilter(step.stepIndex)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setStepFilter(step.stepIndex);
                    }
                  }}
                  className={cn(
                    "flex flex-col overflow-hidden rounded-2xl border border-white/15 bg-white/5 shadow-[0_14px_35px_rgba(56,189,248,0.25)] transition hover:border-sky-200/40 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-sky-200/70"
                  )}
                >
                  <div className="flex items-center justify-between px-5 pt-5 text-xs uppercase tracking-[0.3em] text-white/50">
                    <span>Step {step.stepIndex}</span>
                    <span className="truncate">{step.title}</span>
                  </div>
                  {step.imageBase64 ? (
                    <div className="group relative my-4 h-40 w-full overflow-hidden">
                      <Image
                        src={step.imageBase64}
                        alt={`組立ステップ ${step.stepIndex}`}
                        width={640}
                        height={360}
                        unoptimized
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                      />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
                    </div>
                  ) : (
                    <div className="flex h-40 w-full items-center justify-center bg-white/5 text-xs text-white/50">
                      画像なし
                    </div>
                  )}
                  <div className="px-5 pb-4 text-sm text-white/75 line-clamp-3">
                    {step.description}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            // 単体表示（Featured のみ）＋左右矢印
            selectedStep && (
              <div className="relative">
                {/* 左右の矢印 */}
                <button
                  type="button"
                  onClick={goPrev}
                  disabled={!hasPrev}
                  className={cn(
                    "absolute left-0 top-1/2 -translate-y-1/2 z-10",
                    "rounded-full border border-white/20 bg-black/30 p-2 backdrop-blur",
                    "hover:bg-black/50 disabled:opacity-40 disabled:cursor-not-allowed"
                  )}
                  aria-label="前のステップへ"
                >
                  <ChevronLeft className="h-6 w-6 text-white" />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  disabled={!hasNext}
                  className={cn(
                    "absolute right-0 top-1/2 -translate-y-1/2 z-10",
                    "rounded-full border border-white/20 bg-black/30 p-2 backdrop-blur",
                    "hover:bg-black/50 disabled:opacity-40 disabled:cursor-not-allowed"
                  )}
                  aria-label="次のステップへ"
                >
                  <ChevronRight className="h-6 w-6 text-white" />
                </button>
          
                {/* Featured 本体 */}
                <article className="mb-6 overflow-hidden rounded-3xl border border-sky-300/60 bg-white/10 shadow-[0_25px_60px_rgba(56,189,248,0.25)]">
                  <div className="flex flex-col gap-4 p-5 md:flex-row">
                    <div className="md:w-[46%]">
                     <div className="mb-3 flex items-center gap-2 text-xs">
                       <span className="rounded-full border border-sky-300/60 bg-sky-300/25 px-2 py-0.5 text-white">
                         Featured
                       </span>
                       <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-white/80">
                         Step {selectedStep.stepIndex}
                       </span>
                     </div>
                     {selectedStep.imageBase64 ? (
                       <button
                         type="button"
                         onClick={() => setShowImageDialog(true)}
                         className="group relative block h-64 w-full overflow-hidden rounded-2xl sm:h-80 md:h-96"
                       >
                         <Image
                           src={selectedStep.imageBase64}
                           alt={`組立ステップ ${selectedStep.stepIndex}`}
                           width={960}
                           height={540}
                           unoptimized
                           className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                         />
                         <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                         <span className="pointer-events-none absolute bottom-3 right-3 rounded-full border border-white/40 bg-black/45 px-3 py-1 text-xs text-white/80">
                           クリックで拡大
                         </span>
                       </button>
                     ) : (
                       <div className="flex h-64 w-full items-center justify-center rounded-2xl bg-white/5 text-xs text-white/50 sm:h-80 md:h-96">
                         画像は生成されませんでした
                       </div>
                     )}
                     {selectedChatId && (
                      <div className="mt-4">
                        <VideoPlayer
                          chatId={selectedChatId}
                          stepIndex={selectedStep.stepIndex}
                          existingVideoBase64={selectedStep.videoBase64}
                        />
                      </div>
                    )}
                   </div>
                   <div className="md:flex-1">
                     <h5 className="mb-2 text-xl font-semibold text-white">{selectedStep.title}</h5>
                     <p className="mb-3 text-sm text-white/80">{selectedStep.description}</p>
                     {!!selectedStep.parts.length && (
                       <div className="mt-4">
                         <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
                           Parts & Colors
                         </p>
                         <div className="flex flex-wrap gap-2">
                           {selectedStep.parts.map((part) => (
                             <span
                               key={`${selectedStep.stepIndex}-${part.name}`}
                               className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/80"
                             >
                               <span className="block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: part.color }} />
                               {part.name}
                             </span>
                           ))}
                         </div>
                       </div>
                     )}
                     <div className="mt-4 flex flex-wrap gap-2">
                       <Button
                         type="button"
                         className="rounded-full bg-gradient-to-br from-cyan-400 to-emerald-400 text-slate-900 hover:from-cyan-300 hover:to-emerald-300"
                         onClick={() => setShowImageDialog(true)}
                       >
                         画像を拡大表示
                       </Button>
                       <Button
                         variant="outline"
                         type="button"
                         className="rounded-full border-white/20 bg-white/10 text-white hover:bg-white/20"
                         onClick={() => setStepFilter("all")}
                       >
                         全ステップを表示
                       </Button>
                     </div>
                   </div>
                 </div>
               </article>
             </div>
           )
          )}
        </section>
        )}

        <div ref={listRef} className="relative min-h-0 flex-1 overflow-y-auto px-6 py-6">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-white/70">
              メッセージを読み込んでいます…
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-white/60">
              <p className="text-sm">まだメッセージがありません。</p>
              <p className="text-xs">
                下の入力欄から質問すると、AIが組立手順についてサポートします。
              </p>
            </div>
          ) : (
            filteredMessages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "mb-4 flex gap-3",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-xl",
                    message.role === "user" ? "items-end" : "items-start"
                  )}
                >
                  <div
                    className={cn(
                      "rounded-3xl px-5 py-3 text-sm leading-relaxed shadow-lg transition",
                      message.role === "user"
                        ? "bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-400 text-white shadow-indigo-500/30"
                        : "border border-white/10 bg-white/10 text-white shadow-cyan-500/10 backdrop-blur"
                    )}
                  >
                    <MarkdownRenderer
                      content={message.content}
                      className={cn(
                        // prose で見やすく（Tailwind Typography を入れてないなら下行は削ってOK）
                        "prose prose-invert max-w-none",
                        // 微調整：気泡内の余白・色のバランス
                        "[&_.hljs-title]:font-semibold [&_.hljs-attr]:font-normal [&_code]:font-mono"
                      )}
                    />
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-white/45">
                    {typeof message.stepIndex === "number" && (
                      <span className="rounded-full border border-white/15 bg-white/5 px-2 py-1">
                        Step {message.stepIndex}
                      </span>
                    )}
                    {(() => {
                      const timestampText = formatTimestamp(
                        message.timestamp ?? message.createdAt
                      );
                      return timestampText ? <span>{timestampText}</span> : null;
                    })()}
                  </div>
                </div>
              </div>
            ))
          )}

          {/* 送信中だけ表示する“AI入力中”バブル（チャット領域限定のローディング） */}
          {isSending && (
            <div className="mb-4 flex justify-start gap-3">
              <div className="max-w-xl items-start">
                <div className="flex items-center gap-2 rounded-3xl border border-white/10 bg-white/10 px-5 py-3 text-sm leading-relaxed text-white shadow-cyan-500/10 backdrop-blur">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>AIが入力しています…</span>
                </div>
                <div className="mt-2 flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-white/45">
                  {typeof stepFilter === "number" && (
                    <span className="rounded-full border border-white/15 bg-white/5 px-2 py-1">
                      Step {stepFilter}
                    </span>
                  )}
                  <span>
                    {new Intl.DateTimeFormat("ja-JP", {
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date())}
                  </span>
                </div>
              </div>
            </div>
          )}      
          <div ref={endRef} />
        </div>

        <footer className="shrink-0 border-t border-white/10 bg-white/5 px-6 py-4 backdrop-blur-xl">
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 shadow-[0_18px_45px_rgba(14,165,233,0.22)]"
          >
            <Input
              value={inputMessage}
              onChange={(event) => setInputMessage(event.target.value)}
              placeholder={
                selectedStep
                  ? `Step ${selectedStep.stepIndex} について質問する...`
                  : "組立に関する質問を入力..."
              }
              className="h-12 flex-1 border-none bg-transparent text-white placeholder:text-white/50 focus-visible:ring-0"
              autoComplete="off"
            />
            <Button
              type="submit"
              disabled={!inputMessage.trim() || isSending}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-emerald-400 text-slate-950 hover:from-cyan-300 hover:to-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              aria-disabled={!inputMessage.trim() || isSending}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </footer>
      </div>
      <ShowImageDialog
        open={showImageDialog}
        onOpenChange={setShowImageDialog}
        imageBase64={selectedStep?.imageBase64 ?? ""}
        stepIndex={selectedStep?.stepIndex ?? 0}
      />
    </div>
    {isSupported && (
      <VoiceMicButton
        isListening={isListening}
        isSpeaking={isSpeaking}
        isSupported={isSupported}
        currentTranscript={currentTranscript}
        isProcessing={isVoiceProcessing}
        onToggle={handleToggleListening}
      />
    )}
    <VoiceCommandFeedback
      feedback={voiceFeedback}
      onDismiss={() => setVoiceFeedback(null)}
    />
  </>
  );
}
