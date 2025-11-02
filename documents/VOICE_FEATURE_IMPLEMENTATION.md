# 音声入出力機能の実装ドキュメント

## 目次

1. [概要](#概要)
2. [機能仕様](#機能仕様)
3. [アーキテクチャ](#アーキテクチャ)
4. [実装の詳細](#実装の詳細)
5. [技術的な課題と解決策](#技術的な課題と解決策)
6. [ファイル構成](#ファイル構成)
7. [使用方法](#使用方法)
8. [今後の改善案](#今後の改善案)

---

## 概要

本プロジェクトに音声入出力機能を追加し、組み立てマニュアルアプリケーションをハンズフリー（音声入力時はボタン押下が必要ではある）で操作できるようにしました。

### 主な機能

- **自動音声出力**: ステップ変更時に説明を自動読み上げ
- **音声コマンド**: 予約語によるステップナビゲーション
- **対話型AI**: 音声でチャット質問 AI応答の自動読み上げ
- **音声出力の中断**: 読み上げ中にマイクボタンで即座に音声入力モードに切り替え

### 技術スタック

- **Web Speech API**
  - `SpeechRecognition`: 音声認識（音声 → テキスト）
  - `SpeechSynthesis`: 音声合成（テキスト → 音声）
- **React Hooks**: 状態管理とライフサイクル制御
- **TypeScript**: 型安全な実装

---

## 機能仕様

### 1. 自動音声出力

**動作**: ページ表示時やステップ変更時に、自動的に内容を読み上げる。

**実装箇所**: `src/components/chat/chat-window.tsx:196-202`

```typescript
// ステップ変更時に自動的に音声出力（マイクボタン不要）
useEffect(() => {
  if (prevSpokenFilterRef.current === stepFilter) return;
  if (assemblySteps.length === 0) return;

  prevSpokenFilterRef.current = stepFilter;
  announceCurrentSelection();
}, [announceCurrentSelection, stepFilter, assemblySteps.length]);
```

**読み上げ内容**:

- 全ステップ一覧: 「〇〇の全ステップ一覧です。X件のステップがあります。」
- 個別ステップ: 「ステップXです。[説明文]」

---

### 2. 音声コマンド（予約語）

**動作**: 特定のキーワードを話すことで、ステップナビゲーションや画像操作を実行。

**予約語一覧**: `src/hooks/useVoiceControl.ts:6-19`

| カテゴリ | 予約語 | 動作 |
|---------|--------|------|
| **ステップ移動** | `ステップ[数字]` | 指定されたステップに移動 |
| | `次`, `次のステップ` | 次のステップへ |
| | `戻って`, `前のステップ` | 前のステップへ |
| | `最初`, `最初に戻る` | 最初のステップへ |
| | `最後`, `最後まで進む` | 最後のステップへ |
| | `全て`, `全てのステップ` | 全ステップ一覧を表示 |
| **画像操作** | `拡大`, `画像拡大` | 画像を拡大表示 |
| | `縮小`, `画像縮小` | 拡大表示を閉じる |
| **音声制御** | `しゃべらないで`, `止まって`, `ストップ` | 音声出力を停止 |

**部分一致**: 予約語は部分一致で認識されます。例: 「次のステップを見せて」→「次」が含まれているため、次のステップに移動。

**実装**: `src/hooks/useVoiceControl.ts:127-162`

```typescript
const parseVoiceCommand = useCallback((text: string): VoiceCommand => {
  const normalizedText = text.trim();

  // 停止コマンド（最優先）
  if (RESERVED_COMMANDS.STOP_SPEAKING.some((cmd) => normalizedText.includes(cmd))) {
    return { type: "stopSpeaking" };
  }

  // ステップ番号指定（正規表現マッチング）
  const stepMatch = normalizedText.match(RESERVED_COMMANDS.STEP_NUMBER);
  if (stepMatch) {
    return { type: "step", stepNumber: parseInt(stepMatch[1], 10) };
  }

  // その他の予約語チェック...

  // どの予約語にも一致しない場合は通常のチャット入力として処理
  return { type: "chat", text: normalizedText };
}, []);
```

---

### 3. 対話型チャット

**動作**: 予約語に該当しない音声入力は、AIへの質問として処理され、AIの応答が自動的に読み上げられる。

**フロー**:

1. ユーザーが質問を話す（例: 「このステップの詳細を教えて」）
2. 音声認識 → テキスト化
3. APIリクエスト → AI応答取得
4. AI応答を音声で読み上げ
5. **読み上げ終了後、自動的にマイクが再開**（継続的な対話が可能）

**実装**: `src/components/chat/chat-window.tsx:395-431`

```typescript
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
  void (async () => {
    const aiMessage = await handleSend(selectedChatId, voiceContent);
    if (aiMessage) {
      speak(aiMessage.content, {
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
          if (voiceActivatedRef.current && !isListening) {
            startListening();
          }
        }
      });
    }
  })();
  return;
}
```

---

### 4. マイクボタンの3つの状態

**実装**: `src/components/voice/VoiceMicButton.tsx`

#### 状態1: 待機状態（青色グラデーション）

- **色**: `from-blue-600 to-cyan-600`
- **アイコン**: マイク（`<Mic>`）
- **動作**: クリック → 音声入力開始

#### 状態2: 音声入力中（青色パルスアニメーション）

- **色**: `from-blue-500 to-cyan-500` + `animate-pulse-scale`
- **アイコン**: マイク（`<Mic>`）
- **動作**: クリック → 音声入力停止

#### 状態3: 音声出力中（赤〜オレンジ色グラデーション）

- **色**: `from-red-500 to-orange-500`
- **アイコン**: 斜線付きマイクオフ（`<MicOff>` + 斜線）
- **動作**: クリック → **音声出力を即座に停止して音声入力開始**

```typescript
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
>
```

**パルスアニメーション定義**: `src/app/globals.css:125-138`

```css
@keyframes pulse-scale {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.9;
  }
}

.animate-pulse-scale {
  animation: pulse-scale 1.5s ease-in-out infinite;
}
```

---

## アーキテクチャ

### コンポーネント構成

```tree
src/
├── hooks/
│   └── useVoiceControl.ts          # 音声制御ロジック（カスタムフック）
├── components/
│   ├── voice/
│   │   └── VoiceMicButton.tsx       # マイクボタンUI
│   └── chat/
│       └── chat-window.tsx          # チャット画面（音声機能統合）
└── types/
    └── speech.d.ts                  # Web Speech API型定義
```

```flow
┌─────────────────────────────────────────────────────────────┐
│                      chat-window.tsx                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ useVoiceControl()                                      │ │
│  │  ├─ isListening, isSpeaking, isSupported               │ │
│  │  ├─ speak(), stopSpeaking(), startListening()          │ │
│  │  └─ onCommand: voiceCommandHandlerRef.current()        │ │
│  └────────────────────────────────────────────────────────┘ │
│                           │                                 │
│                           ▼                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ voiceCommandHandlerRef.current(command)                │ │
│  │  ├─ stopSpeaking: 音声出力停止                          │ │
│  │  ├─ step/next/prev/first/last/all: ステップ変更         │ │
│  │  ├─ zoomIn/zoomOut: 画像操作                            │ │
│  │  └─ chat: AIチャット → speak(response) → onEnd再開      │ │
│  └────────────────────────────────────────────────────────┘ │
│                           │                                 │
│                           ▼                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ announceCurrentSelection()                             │ │
│  │  └─ ステップ変更時の自動音声出力                          │ │
│  └────────────────────────────────────────────────────────┘ │
│                           │                                 │
│                           ▼                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ VoiceMicButton                                         │ │
│  │  └─ onClick: handleToggleListening()                   │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 実装の詳細

### 1. useVoiceControl フック

**ファイル**: `src/hooks/useVoiceControl.ts`

**責務**:

- Web Speech API（SpeechRecognition / SpeechSynthesis）のラッパー
- 音声認識結果の予約語パース
- 音声合成の制御

**主要な関数**:

#### `startListening()`

音声入力を開始します。音声出力中（`isSpeaking === true`）の場合は開始しません。

```typescript
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
```

#### `speak(text, options?)`

テキストを音声で読み上げます。

**引数**:

- `text`: 読み上げるテキスト
- `options.onEnd`: 読み上げ終了時のコールバック（対話継続に使用）

**処理フロー**:

1. 日本語音声リストのロード待機（`loadVoices()`）
2. 既に音声が再生中の場合、前の音声をキャンセル（50ms待機）
3. テキストが300文字を超える場合、先頭300文字に制限
4. 日本語音声（`ja-JP`）を優先的に選択
5. `SpeechSynthesisUtterance` を作成して `window.speechSynthesis.speak()` で再生

```typescript
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

      const maxLength = 300;
      const speakText =
        trimmed.length > maxLength ? `${trimmed.slice(0, maxLength)}。以下省略。` : trimmed;

      const utterance = new SpeechSynthesisUtterance(speakText);
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
        console.error("Speech synthesis error:", event.error);
        setIsSpeaking(false);
        options?.onEnd?.();
        onErrorRef.current?.(`音声合成エラー: ${event.error}`);
      };

      synthesisRef.current = utterance;

      // 既存の音声をキャンセル
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
```

#### `parseVoiceCommand(text)`

音声認識結果のテキストを解析し、予約語コマンドまたはチャット入力として分類します。

**戻り値**: `VoiceCommand` 型（Union Type）

```typescript
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
```

---

### 2. chat-window.tsx の実装

**ファイル**: `src/components/chat/chat-window.tsx`

#### 音声コマンドハンドラの設計

音声コマンドハンドラは `useEffect` 内で定義され、`voiceCommandHandlerRef` に保存されます。これにより、`useVoiceControl` の `onCommand` コールバックから安定した参照で呼び出せます。

**実装**: `src/components/chat/chat-window.tsx:294-445`

```typescript
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

    // ステップ移動コマンド処理
    if (command.type === "step" && command.stepNumber) {
      const target = assemblySteps.find((step) => step.stepIndex === command.stepNumber);
      if (target) {
        setStepFilter(command.stepNumber); // ステップ変更 → 自動読み上げ発火
      } else {
        speak(`ステップ${command.stepNumber}は存在しません。`);
      }
      return;
    }

    // ... 他の予約語処理 ...

    // チャット入力
    if (command.type === "chat" && command.text) {
      const voiceContent = command.text.trim();
      if (!voiceContent) {
        speak("メッセージが認識できませんでした。", {
          onEnd: () => {
            if (voiceActivatedRef.current && !isListening) {
              startListening(); // 対話継続
            }
          }
        });
        return;
      }
      void (async () => {
        const aiMessage = await handleSend(selectedChatId, voiceContent);
        if (aiMessage) {
          speak(aiMessage.content, {
            onEnd: () => {
              if (voiceActivatedRef.current && !isListening) {
                startListening(); // AI応答後、マイク再開
              }
            }
          });
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
  selectedChatId,
  selectedStep,
  showImageDialog,
  speak,
  startListening,
  stepIndexes,
  stopSpeaking,
]);
```

#### 自動音声出力の実装

ステップが変更される度に、自動的に内容を読み上げます。

**実装**: `src/components/chat/chat-window.tsx:196-202`

```typescript
// ステップ変更時に自動的に音声出力（マイクボタン不要）
useEffect(() => {
  if (prevSpokenFilterRef.current === stepFilter) return;
  if (assemblySteps.length === 0) return;

  prevSpokenFilterRef.current = stepFilter;
  announceCurrentSelection();
}, [announceCurrentSelection, stepFilter, assemblySteps.length]);
```

#### マイクボタンのクリックハンドラ

**実装**: `src/components/chat/chat-window.tsx:204-222`

```typescript
const handleToggleListening = useCallback(() => {
  if (!voiceActivatedRef.current) {
    voiceActivatedRef.current = true;
  }

  // 音声出力中の場合は、まず音声を停止してから入力を開始
  if (isSpeaking) {
    stopSpeaking();
    // 少し待ってから音声入力を開始
    setTimeout(() => {
      if (!isListening) {
        startListening();
      }
    }, 100);
    return;
  }

  toggleListening();
}, [isListening, isSpeaking, startListening, stopSpeaking, toggleListening]);
```

**ポイント**:

- 音声出力中にマイクボタンをクリックすると、即座に `stopSpeaking()` を実行
- 100ms待機してから `startListening()` を呼び出し（音声停止の完了を待つ）
- これにより、ユーザーは読み上げを中断して質問できる

---

### 3. VoiceMicButton コンポーネント

**ファイル**: `src/components/voice/VoiceMicButton.tsx`

**Props**:

- `isListening`: 音声入力中かどうか
- `isSpeaking`: 音声出力中かどうか
- `isSupported`: ブラウザがWeb Speech APIに対応しているか
- `onToggle`: マイクボタンクリック時のハンドラ

**UI設計**:

- 固定配置（`fixed bottom-8 right-8 z-50`）
- 丸型ボタン（`h-16 w-16 rounded-full`）
- 3つの状態で色とアイコンが変化

```typescript
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
```

---

## 技術的な課題と解決策

### 課題1: 対話が自動的に継続しない

**症状**:

- ユーザーが質問 → AIが応答 → 読み上げ終了
- その後、ユーザーが再度マイクボタンを押さないと次の質問ができない

**原因**:

- 読み上げ終了後に、マイクが自動で再開されない

**解決策**: `speak()` の `onEnd` コールバックでマイクを再開

```typescript
speak(aiMessage.content, {
  onEnd: () => {
    // AI応答の読み上げ終了後、自動的にマイクを再開（対話継続）
    if (voiceActivatedRef.current && !isListening) {
      startListening();
    }
  }
});
```

---

## ファイル構成

### 新規作成ファイル

| ファイルパス | 説明 |
|-------------|------|
| `src/hooks/useVoiceControl.ts` | 音声制御カスタムフック（Web Speech API のラッパー） |
| `src/components/voice/VoiceMicButton.tsx` | マイクボタンコンポーネント（UI） |
| `src/types/speech.d.ts` | Web Speech API の TypeScript 型定義 |

### 修正ファイル

| ファイルパス | 変更内容 |
|-------------|---------|
| `src/components/chat/chat-window.tsx` | 音声機能の統合、コマンドハンドラの実装 |
| `src/app/globals.css` | パルスアニメーション（`animate-pulse-scale`）の追加 |

---

## 使用方法

### 基本的な使い方

1. **ページを開く**: 自動的に「全ステップ一覧です...」と読み上げが開始される（マイクボタンは赤色）
2. **読み上げ終了**: マイクボタンが青色に変わる
3. **マイクボタンをクリック**: 音声入力開始（青いパルスアニメーション）
4. **音声コマンドを話す**:
   - 「次のステップ」→ 次のステップに移動 → 自動的に説明を読み上げ
   - 「ステップ3」→ ステップ3に移動 → 自動的に説明を読み上げ
5. **質問を話す**:
   - 「このステップの詳細を教えて」→ AIが応答 → 応答を読み上げ → 自動的にマイク再開
6. **読み上げ中に割り込む**: マイクボタンをクリック → 読み上げが即座に停止 → 音声入力モードに切り替わる

### デバッグ方法

**コンソールログ**:

- 音声認識結果: `音声認識結果: [テキスト]`
- 音声コマンド受信: `音声コマンド受信: {type: "...", ...}`
- 音声出力開始: `音声出力開始`
- 音声出力終了: `音声出力終了`
- エラー: `Speech synthesis error: [エラー内容]`

**ブラウザの音声設定**:

- Chrome: 設定 → プライバシーとセキュリティ → サイトの設定 → マイク → アクセス許可
- Edge: 設定 → Cookie とサイトのアクセス許可 → マイク → 許可

---

## 今後の改善案

### 1. 音声認識の精度向上

**現状の課題**:

- 予約語の誤認識（例: 「次のステップ」を「月のステップ」と認識）
- 周囲の雑音による誤動作

**改善案**:

- より厳密な予約語マッチング（完全一致モード）
- 信頼度（`confidence`）を考慮したフィルタリング
- カスタム言語モデルの導入

### 2. 音声合成のカスタマイズ

**現状の課題**:

- 読み上げ速度や音程が固定
- 長文が途中で省略される

**改善案**:

- ユーザー設定で `rate`, `pitch`, `volume` を調整可能に
- 長文を文章単位で分割して順次読み上げ
- 音声の一時停止・再開機能

### 3. オフライン対応

**現状の課題**:

- Web Speech API はオンライン環境が必要（ブラウザ依存）

**改善案**:

- ローカル音声認識ライブラリの導入（例: Vosk, PocketSphinx）
- ローカル音声合成エンジンの使用（例: eSpeak, MaryTTS）

### 4. 多言語対応

**現状の課題**:

- 日本語のみ対応

**改善案**:

- `language` プロパティを動的に変更可能に
- 多言語の予約語辞書を用意
- ユーザー設定で言語を選択

### 5. アクセシビリティの強化

**改善案**:

- スクリーンリーダー対応の強化
- キーボードショートカットの追加（例: Ctrl+M でマイクON/OFF）
- 音声フィードバックの追加（例: 「音声入力を開始しました」）

### 6. 音声履歴の記録

**改善案**:

- 音声入力の履歴を保存（ローカルストレージまたはデータベース）
- よく使う質問をテンプレート化
- 音声ログの再生機能

---

## 参考資料

- [Web Speech API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [SpeechRecognition - MDN](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition)
- [SpeechSynthesis - MDN](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis)
- [React Hooks - React 公式ドキュメント](https://react.dev/reference/react)

---

## 貢献者

このドキュメントは、音声機能実装時の技術的な詳細を記録したものです。実装に関する質問や改善提案は、GitHubのIssueまたはPull Requestでお願いします。

**最終更新日**: 2025-11-02
