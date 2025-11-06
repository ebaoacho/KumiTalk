"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// 音声コマンドで利用する定型フレーズ
const RESERVED_COMMANDS = {
  // ステップ移動 - 複数パターンと正規表現を組み合わせ
  STEP_NUMBER: [
    /ステップ\s*(\d+)/i,
    /(\d+)\s*番目/i,
    /(\d+)\s*番/i,
    /第\s*(\d+)\s*ステップ/i,
    /(\d+)\s*ステップ目/i,
  ] as RegExp[],
  NEXT_STEP: [
    "次", "次のステップ", "つぎ", "進む", "進んで",
    "次に行く", "次へ", "forward", "フォワード", "先に進む"
  ] as string[],
  PREV_STEP: [
    "戻って", "前のステップ", "もどって", "戻る", "前",
    "前に戻る", "前へ", "back", "バック", "一つ前"
  ] as string[],
  FIRST_STEP: [
    "最初", "最初に戻る", "はじめ", "初回", "1番目",
    "スタート", "開始", "第一", "いちばん最初"
  ] as string[],
  LAST_STEP: [
    "最後", "最後まで進む", "さいご", "終了", "最終",
    "ラスト", "end", "エンド", "一番最後", "完了"
  ] as string[],
  ALL_STEPS: [
    "全て", "全てのステップ", "すべて", "すべてのステップ",
    "全部", "一覧", "オール", "全体", "総合", "まとめて"
  ] as string[],
  // 画像操作
  ZOOM_IN: [
    "拡大", "画像拡大", "ズーム", "ズームイン", "大きく",
    "アップ", "でかく", "見やすく", "詳細表示"
  ] as string[],
  ZOOM_OUT: [
    "縮小", "画像縮小", "ズームアウト", "小さく", "戻す",
    "閉じる", "通常表示", "元に戻す", "ダウン"
  ] as string[],
  // 音声制御
  STOP_SPEAKING: [
    "しゃべらないで", "止まって", "ストップ", "停止",
    "やめて", "静かに", "黙って", "ミュート", "とめて"
  ] as string[],
  STOP_VOICE_MODE: [
    "音声モードやめて",
    "音声モードをやめて",
    "音声モード停止",
    "音声モード止めて",
    "音声モード終わり",
    "音声入力やめて",
    "音声入力停止",
    "音声停止",
    "音声を停止",
    "マイク切って",
    "マイクを切って",
    "マイク止めて",
    "マイク停止",
    "ボイスモードやめて",
    "ボイスモード停止",
    "ボイス停止",
    "ボイスをやめて",
  ] as string[],
};

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
  | { type: "stopVoiceMode" }
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

      // 最新の結果を取得
      const result = event.results[event.results.length - 1];
      const transcript = result[0]?.transcript ?? "";

      if (!transcript) {
        return;
      }

      // 確定した結果（isFinal === true）の場合のみコマンド処理
      if (result.isFinal) {
        console.log("確定した音声認識結果:", transcript);
        const command = parseAndValidateCommand(transcript);
        if (command) {
          onCommandRef.current?.(command);
        }
        lastTranscriptRef.current = "";
        setCurrentTranscript(""); // 確定時に中間結果をクリア

      } else {
        // 中間結果（話している途中）
        console.log("中間結果:", transcript);
        lastTranscriptRef.current = transcript;
        setCurrentTranscript(transcript); // リアルタイムで中間結果を更新
      }
    };

    recognition.onerror = (event) => {
      if (!isMountedRef.current) return;
      
      // エラータイプに応じた適切な処理
      switch (event.error) {
        case "no-speech":
          // 無音は通常の動作なのでエラーとして扱わない
          console.log("音声が検出されませんでした");
          break;
        case "audio-capture":
          onErrorRef.current?.("マイクにアクセスできません。マイクの設定を確認してください。");
          break;
        case "not-allowed":
          onErrorRef.current?.("マイクの使用が許可されていません。ブラウザの設定を確認してください。");
          break;
        case "network":
          onErrorRef.current?.("ネットワークエラーが発生しました。接続を確認してください。");
          break;
        case "aborted":
          // ユーザーによる中止は正常な動作
          console.log("音声認識が中止されました");
          break;
        default:
          onErrorRef.current?.(`音声認識エラー: ${event.error}`);
      }
      
      setIsListening(false);
      setCurrentTranscript(""); // エラー時に中間結果をクリア
    };

    recognition.onend = () => {
      if (!isMountedRef.current) return;
      console.log("音声認識終了");

      setIsListening(false);
      setCurrentTranscript(""); // 認識終了時に中間結果をクリア
    };

    recognitionRef.current = recognition;

    return () => {
      isMountedRef.current = false;

      recognition.stop();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [language]);

  // 音声認識結果の正規化処理
  const normalizeText = useCallback((text: string): string => {
    return text
      .trim()
      .toLowerCase()
      // 全角数字を半角に変換
      .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
      // 漢数字を数字に変換（基本的なもの）
      .replace(/一/g, '1')
      .replace(/二/g, '2')
      .replace(/三/g, '3')
      .replace(/四/g, '4')
      .replace(/五/g, '5')
      .replace(/六/g, '6')
      .replace(/七/g, '7')
      .replace(/八/g, '8')
      .replace(/九/g, '9')
      .replace(/十/g, '10')
      // よくある音声認識の誤変換を修正
      .replace(/つき/g, '次')
      .replace(/まえ/g, '前')
      .replace(/さいご/g, '最後')
      .replace(/はじめ/g, '最初')
      .replace(/でかく/g, '拡大')
      .replace(/ちいさく/g, '縮小')
      // 余分な助詞や語尾を除去
      .replace(/してください$/g, '')
      .replace(/をお願いします$/g, '')
      .replace(/だい$/g, '')
      .replace(/です$/g, '')
      // 余分な空白を除去
      .replace(/\s+/g, ' ');
  }, []);

  // ステップ番号を抽出する関数
  const extractStepNumber = useCallback((text: string): number | null => {
    for (const pattern of RESERVED_COMMANDS.STEP_NUMBER) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > 0) {
          return num;
        }
      }
    }
    return null;
  }, []);

  // コマンドの一致度を計算する関数
  const calculateMatchScore = useCallback((text: string, commands: string[]): number => {
    let maxScore = 0;
    for (const cmd of commands) {
      if (text === cmd) {
        return 1.0; // 完全一致
      }
      if (text.includes(cmd)) {
        maxScore = Math.max(maxScore, 0.8); // 部分一致
      }
      if (cmd.includes(text)) {
        maxScore = Math.max(maxScore, 0.6); // 逆部分一致
      }
    }
    return maxScore;
  }, []);

  const parseVoiceCommand = useCallback((text: string): VoiceCommand => {
    const normalizedText = normalizeText(text);
    console.log('正規化されたテキスト:', normalizedText);

    // 1. 音声制御コマンドは最優先（緊急性が高い）
    if (calculateMatchScore(normalizedText, RESERVED_COMMANDS.STOP_SPEAKING) > 0.6) {
      return { type: "stopSpeaking" };
    }
    if (
      calculateMatchScore(normalizedText, RESERVED_COMMANDS.STOP_VOICE_MODE) > 0.5 ||
      /(音声|ボイス)(モード|入力)?(を)?(全部|全て|全)?(止める|止めて|止めよう|停めて|停止|終了|終わり|やめる|やめて|終わって)/u.test(
        normalizedText.replace(/\s+/g, "")
      )
    ) {
      return { type: "stopVoiceMode" };
    }

    // 2. ステップ番号の抽出（数字指定は優先度高）
    const stepNumber = extractStepNumber(normalizedText);
    if (stepNumber !== null) {
      return { type: "step", stepNumber };
    }

    // 3. ナビゲーションコマンド（優先度順に確認）
    if (calculateMatchScore(normalizedText, RESERVED_COMMANDS.NEXT_STEP) > 0.6) {
      return { type: "next" };
    }
    if (calculateMatchScore(normalizedText, RESERVED_COMMANDS.PREV_STEP) > 0.6) {
      return { type: "prev" };
    }
    if (calculateMatchScore(normalizedText, RESERVED_COMMANDS.FIRST_STEP) > 0.6) {
      return { type: "first" };
    }
    if (calculateMatchScore(normalizedText, RESERVED_COMMANDS.LAST_STEP) > 0.6) {
      return { type: "last" };
    }
    if (calculateMatchScore(normalizedText, RESERVED_COMMANDS.ALL_STEPS) > 0.6) {
      return { type: "all" };
    }

    // 4. 画像操作コマンド
    if (calculateMatchScore(normalizedText, RESERVED_COMMANDS.ZOOM_IN) > 0.6) {
      return { type: "zoomIn" };
    }
    if (calculateMatchScore(normalizedText, RESERVED_COMMANDS.ZOOM_OUT) > 0.6) {
      return { type: "zoomOut" };
    }

    // 5. 該当しない場合はチャットとして処理
    return { type: "chat", text: normalizedText };
  }, [normalizeText, extractStepNumber, calculateMatchScore]);

  // コマンドの妥当性を検証する関数
  const validateCommand = useCallback((command: VoiceCommand): { isValid: boolean; errorMessage?: string } => {
    switch (command.type) {
      case "step":
        if (command.stepNumber < 1 || command.stepNumber > 999) {
          return { 
            isValid: false, 
            errorMessage: `ステップ番号${command.stepNumber}は無効です。1から999の範囲で指定してください。` 
          };
        }
        break;
      case "chat":
        if (!command.text || command.text.trim().length === 0) {
          return {
            isValid: false,
            errorMessage: "メッセージが空です。",
          };
        }
        if (command.text.length > 500) {
          return {
            isValid: false,
            errorMessage: "メッセージが長すぎます。500文字以内で入力してください。",
          };
        }
        break;
    }
    return { isValid: true };
  }, []);

  // 強化されたコマンド解析関数（検証付き）
  const parseAndValidateCommand = useCallback((text: string): VoiceCommand | null => {
    const command = parseVoiceCommand(text);
    const validation = validateCommand(command);
    
    if (!validation.isValid) {
      console.warn('コマンド検証エラー:', validation.errorMessage);
      onErrorRef.current?.(validation.errorMessage || 'コマンドが無効です');
      return null;
    }
    
    return command;
  }, [parseVoiceCommand, validateCommand]);

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
