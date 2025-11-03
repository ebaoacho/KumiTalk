"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// 音声コマンドで利用する定型フレーズ
const RESERVED_COMMANDS = {
  // ステップ移動
  STEP_NUMBER: /ステップ\s*(\d+)/i,
  NEXT_STEP: ["次", "次のステップ"],
  PREV_STEP: ["戻って", "前のステップ"],
  FIRST_STEP: ["最初", "最初に戻る"],
  LAST_STEP: ["最後", "最後まで進む"],
  ALL_STEPS: ["全て", "全てのステップ", "すべて", "すべてのステップ"],
  // 画像操作
  ZOOM_IN: ["拡大", "画像拡大"],
  ZOOM_OUT: ["縮小", "画像縮小"],
  // 音声制御
  STOP_SPEAKING: ["しゃべらないで", "止まって", "ストップ"],
} as const;

export type VoiceCommand =
  | { type: "step"; stepNumber: number }
  | { type: "next" }
  | { type: "prev" }
  | { type: "first" }
  | { type: "last" }
  | { type: "all" }
  | { type: "zoomIn" }
  | { type: "zoomOut" }
  | { type: "stopSpeaking" }
  | { type: "chat"; text: string };

interface UseVoiceControlOptions {
  onCommand?: (command: VoiceCommand) => void;
  onError?: (error: string) => void;
  language?: string;
}

export function useVoiceControl({
  onCommand,
  onError,
  language = "ja-JP",
}: UseVoiceControlOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState("");

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isMountedRef = useRef(false);
  const onCommandRef = useRef(onCommand);
  const onErrorRef = useRef(onError);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTranscriptRef = useRef<string>("");

  useEffect(() => {
    onCommandRef.current = onCommand;
  }, [onCommand]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    isMountedRef.current = true;

    const RecognitionCtor: typeof SpeechRecognition | undefined =
      typeof window !== "undefined"
        ? (window.SpeechRecognition as typeof SpeechRecognition | undefined) ??
          (window.webkitSpeechRecognition as typeof SpeechRecognition | undefined)
        : undefined;

    const supported =
      Boolean(RecognitionCtor) && typeof window !== "undefined" && "speechSynthesis" in window;

    setIsSupported(supported);

    if (!supported) {
      onErrorRef.current?.("お使いのブラウザは音声認識または音声合成に対応していません。");
      return () => {
        isMountedRef.current = false;
      };
    }

    const recognition = new RecognitionCtor!();
    recognition.lang = language;
    recognition.continuous = true; // 連続音声認識モード
    recognition.interimResults = true; // 中間結果も取得
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      if (!isMountedRef.current) return;

      // 既存のタイマーをクリア
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }

      // 最新の結果を取得
      const result = event.results[event.results.length - 1];
      const transcript = result[0]?.transcript ?? "";

      if (!transcript) {
        return;
      }

      // 確定した結果（isFinal === true）の場合のみコマンド処理
      if (result.isFinal) {
        console.log("確定した音声認識結果:", transcript);
        const command = parseVoiceCommand(transcript);
        onCommandRef.current?.(command);
        lastTranscriptRef.current = "";
        setCurrentTranscript(""); // 確定時に中間結果をクリア

        // 5秒間の無音タイマーを開始
        silenceTimerRef.current = setTimeout(() => {
          if (isMountedRef.current && recognitionRef.current) {
            console.log("5秒間無音のため、音声認識を停止します");
            try {
              recognitionRef.current.stop();
            } catch (error) {
              console.error("音声認識停止エラー:", error);
            }
          }
        }, 5000);
      } else {
        // 中間結果（話している途中）
        console.log("中間結果:", transcript);
        lastTranscriptRef.current = transcript;
        setCurrentTranscript(transcript); // リアルタイムで中間結果を更新
      }
    };

    recognition.onerror = (event) => {
      if (!isMountedRef.current) return;
      if (event.error !== "no-speech") {
        onErrorRef.current?.(`音声認識エラー: ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      if (!isMountedRef.current) return;
      console.log("音声認識終了");

      // タイマーをクリア
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }

      setIsListening(false);
      setCurrentTranscript(""); // 認識終了時に中間結果をクリア
    };

    recognitionRef.current = recognition;

    return () => {
      isMountedRef.current = false;

      // タイマーをクリア
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }

      recognition.stop();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [language]);

  const parseVoiceCommand = useCallback((text: string): VoiceCommand => {
    const normalizedText = text.trim();

    if (RESERVED_COMMANDS.STOP_SPEAKING.some((cmd) => normalizedText.includes(cmd))) {
      return { type: "stopSpeaking" };
    }

    const stepMatch = normalizedText.match(RESERVED_COMMANDS.STEP_NUMBER);
    if (stepMatch) {
      return { type: "step", stepNumber: parseInt(stepMatch[1], 10) };
    }

    if (RESERVED_COMMANDS.NEXT_STEP.some((cmd) => normalizedText.includes(cmd))) {
      return { type: "next" };
    }
    if (RESERVED_COMMANDS.PREV_STEP.some((cmd) => normalizedText.includes(cmd))) {
      return { type: "prev" };
    }
    if (RESERVED_COMMANDS.FIRST_STEP.some((cmd) => normalizedText.includes(cmd))) {
      return { type: "first" };
    }
    if (RESERVED_COMMANDS.LAST_STEP.some((cmd) => normalizedText.includes(cmd))) {
      return { type: "last" };
    }
    if (RESERVED_COMMANDS.ALL_STEPS.some((cmd) => normalizedText.includes(cmd))) {
      return { type: "all" };
    }
    if (RESERVED_COMMANDS.ZOOM_IN.some((cmd) => normalizedText.includes(cmd))) {
      return { type: "zoomIn" };
    }
    if (RESERVED_COMMANDS.ZOOM_OUT.some((cmd) => normalizedText.includes(cmd))) {
      return { type: "zoomOut" };
    }

    return { type: "chat", text: normalizedText };
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported || isSpeaking) return;
    const recognition = recognitionRef.current;
    if (!recognition) return;

    try {
      recognition.start();
      setIsListening(true);
    } catch (error) {
      console.error("Failed to start speech recognition:", error);
      onErrorRef.current?.("音声認識を開始できませんでした。");
    }
  }, [isSupported, isSpeaking]);

  const stopListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    // タイマーをクリア
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    try {
      recognition.stop();
      setIsListening(false);
    } catch (error) {
      console.error("Failed to stop speech recognition:", error);
    }
  }, []);

  const loadVoices = useCallback(() => {
    return new Promise<void>((resolve) => {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        resolve();
        return;
      }

      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        resolve();
        return;
      }

      const handleVoicesChanged = () => {
        window.speechSynthesis.removeEventListener("voiceschanged", handleVoicesChanged);
        resolve();
      };

      window.speechSynthesis.addEventListener("voiceschanged", handleVoicesChanged);
    });
  }, []);

  const speak = useCallback(
    async (text: string, options?: { onEnd?: () => void }) => {
      if (!isSupported || typeof window === "undefined" || !window.speechSynthesis) {
        onErrorRef.current?.("音声合成が利用できないブラウザです。");
        return;
      }

      const trimmed = text.trim();
      if (trimmed.length === 0) {
        console.warn("読み上げるテキストが空です。");
        return;
      }

      try {
        await loadVoices();

        const utterance = new SpeechSynthesisUtterance(trimmed);
        utterance.lang = language;
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        const voices = window.speechSynthesis.getVoices();
        const japaneseVoice = voices.find((voice) => voice.lang?.startsWith("ja"));
        if (japaneseVoice) {
          utterance.voice = japaneseVoice;
        }

        utterance.onstart = () => {
          if (!isMountedRef.current) return;
          setIsSpeaking(true);
        };

        utterance.onend = () => {
          if (!isMountedRef.current) return;
          setIsSpeaking(false);
          options?.onEnd?.();
        };

        utterance.onerror = (event) => {
          if (!isMountedRef.current) return;
          
          // "interrupted" エラーは通常の動作なので、ユーザーにエラーとして表示しない
          if (event.error === "interrupted") {
            console.log("Speech synthesis was interrupted (normal behavior)");
            setIsSpeaking(false);
            options?.onEnd?.();
            return;
          }
          
          console.error("Speech synthesis error:", event.error);
          setIsSpeaking(false);
          options?.onEnd?.();
          onErrorRef.current?.(`音声合成エラー: ${event.error}`);
        };

        synthesisRef.current = utterance;

        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
          await new Promise((resolve) => setTimeout(resolve, 50));
        }

        window.speechSynthesis.speak(utterance);
      } catch (error) {
        console.error("Failed to prepare speech synthesis:", error);
        setIsSpeaking(false);
        options?.onEnd?.();
        onErrorRef.current?.("音声合成の初期化に失敗しました。");
      }
    },
    [isSupported, language, loadVoices]
  );

  const stopSpeaking = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    synthesisRef.current = null;
    setIsSpeaking(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (isSpeaking) return;
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, isSpeaking, startListening, stopListening]);

  return {
    isListening,
    isSpeaking,
    isSupported,
    currentTranscript,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    toggleListening,
  };
}
