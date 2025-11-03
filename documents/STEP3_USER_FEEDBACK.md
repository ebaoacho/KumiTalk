# Step 3: ユーザーフィードバック機能の強化

## 目標
音声コマンドの実行結果を分かりやすくユーザーに伝え、音声インタラクションの体験を向上させる。

## 現在の実装状況

### 既存のフィードバック機能
- ✅ 音声認識中の中間結果表示
- ✅ 音声出力中・認識中の状態表示
- ✅ 基本的な音声合成機能
- ✅ "interrupted"エラーの適切な処理

### 改善が必要な領域
- [ ] コマンド実行結果の音声案内
- [ ] 視覚的なコマンド実行フィードバック
- [ ] エラー時の分かりやすい案内
- [ ] コマンド実行履歴の表示

## 実装タスク

### タスク 3.1: 音声フィードバックシステムの設計

#### 音声案内のカテゴリ設計
```typescript
interface VoiceFeedback {
  success: {
    navigation: (fromStep: number, toStep: number) => string;
    display: (action: 'open' | 'close', target: string) => string;
    general: (message: string) => string;
  };
  error: {
    notFound: (target: string) => string;
    unavailable: (feature: string) => string;
    network: () => string;
  };
  info: {
    current: (stepNumber: number, totalSteps: number) => string;
    help: () => string;
    commands: () => string;
  };
}
```

#### 音声案内のトーン・スピード調整
```typescript
const VOICE_SETTINGS = {
  feedback: {
    rate: 1.1,        // 少し早めで効率的に
    pitch: 1.0,
    volume: 0.9
  },
  instruction: {
    rate: 0.9,        // ゆっくりと分かりやすく
    pitch: 1.0,
    volume: 1.0
  },
  error: {
    rate: 0.8,        // はっきりと
    pitch: 0.9,       // 少し低めで注意を引く
    volume: 1.0
  }
};
```

### タスク 3.2: 視覚的フィードバックの実装

#### コマンド実行状態の表示
```typescript
interface CommandFeedbackState {
  isExecuting: boolean;
  lastCommand: VoiceCommand | null;
  result: 'success' | 'error' | 'pending' | null;
  message: string;
  timestamp: Date;
}
```

#### フィードバック表示コンポーネント
```typescript
// VoiceCommandFeedback.tsx
export function VoiceCommandFeedback({
  commandState,
  onDismiss
}: {
  commandState: CommandFeedbackState;
  onDismiss: () => void;
}) {
  return (
    <div className="fixed top-4 right-4 z-50">
      {commandState.result && (
        <div className={`
          px-4 py-2 rounded-lg shadow-lg backdrop-blur-sm
          transition-all duration-300 animate-in slide-in-from-top-2
          ${commandState.result === 'success' 
            ? 'bg-green-500/90 text-white' 
            : 'bg-red-500/90 text-white'
          }
        `}>
          <div className="flex items-center gap-2">
            {commandState.result === 'success' ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <span className="text-sm font-medium">
              {commandState.message}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
```

### タスク 3.3: コマンド実行履歴の実装

#### 履歴管理システム
```typescript
interface VoiceCommandHistory {
  id: string;
  command: VoiceCommand;
  timestamp: Date;
  result: 'success' | 'error';
  message: string;
  executionTime: number;
}

const useVoiceCommandHistory = () => {
  const [history, setHistory] = useState<VoiceCommandHistory[]>([]);
  
  const addToHistory = useCallback((
    command: VoiceCommand, 
    result: 'success' | 'error',
    message: string,
    executionTime: number
  ) => {
    const entry: VoiceCommandHistory = {
      id: generateId(),
      command,
      timestamp: new Date(),
      result,
      message,
      executionTime
    };
    
    setHistory(prev => [entry, ...prev.slice(0, 9)]); // 最新10件を保持
  }, []);
  
  return { history, addToHistory };
};
```

#### 履歴表示UI
```typescript
// VoiceCommandHistory.tsx
export function VoiceCommandHistory({ 
  history, 
  isVisible, 
  onToggle 
}: {
  history: VoiceCommandHistory[];
  isVisible: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="fixed bottom-24 right-8 z-40">
      <Button
        onClick={onToggle}
        size="sm"
        className="mb-2 rounded-full bg-white/20 backdrop-blur-sm"
      >
        履歴 ({history.length})
      </Button>
      
      {isVisible && (
        <div className="w-80 max-h-96 overflow-y-auto rounded-lg bg-white/90 backdrop-blur-sm shadow-lg">
          <div className="p-3 border-b">
            <h3 className="font-semibold text-gray-800">音声コマンド履歴</h3>
          </div>
          
          <div className="divide-y">
            {history.map((entry) => (
              <div key={entry.id} className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">
                    {formatCommandDisplay(entry.command)}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    entry.result === 'success' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {entry.result}
                  </span>
                </div>
                <p className="text-xs text-gray-600">{entry.message}</p>
                <p className="text-xs text-gray-400">
                  {entry.timestamp.toLocaleTimeString()} 
                  ({entry.executionTime}ms)
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

### タスク 3.4: ヘルプ・ガイダンス機能

#### 音声ヘルプシステム
```typescript
const VOICE_HELP_CONTENT = {
  basic: `
    音声コマンドが利用できます。
    「次」で次のステップ、「戻って」で前のステップに移動できます。
    「ステップ3」のように数字を言うと、そのステップに直接移動します。
  `,
  navigation: `
    ナビゲーションコマンド：
    「次」「次のステップ」で次に進む、
    「戻って」「前のステップ」で前に戻る、
    「最初」で最初のステップ、
    「最後」で最後のステップ、
    「全て」で全ステップ表示
  `,
  display: `
    表示コマンド：
    「拡大」で画像を拡大表示、
    「縮小」で拡大表示を閉じる
  `,
  control: `
    制御コマンド：
    「止まって」「ストップ」で音声を停止
  `
};

const provideHelp = (category?: 'basic' | 'navigation' | 'display' | 'control') => {
  const content = category ? VOICE_HELP_CONTENT[category] : VOICE_HELP_CONTENT.basic;
  speak(content, { rate: 0.9 });
};
```

#### ヘルプトリガーの実装
```typescript
const HELP_COMMANDS = [
  "ヘルプ", "助けて", "使い方", "コマンド一覧", 
  "何ができる", "どうやって使う"
];

// parseVoiceCommand関数に追加
if (HELP_COMMANDS.some(cmd => normalizedText.includes(cmd))) {
  return { type: "help", category: detectHelpCategory(normalizedText) };
}
```

### タスク 3.5: エラーハンドリングとリカバリー

#### 詳細なエラーメッセージ
```typescript
const ERROR_MESSAGES = {
  stepNotFound: (stepNum: number, maxStep: number) => 
    `ステップ${stepNum}は存在しません。1から${maxStep}までのステップがあります。`,
  
  noImage: () => 
    `このステップには画像がありません。他のステップを試してください。`,
  
  speechError: (error: string) => 
    `音声でエラーが発生しました。もう一度お試しください。`,
  
  networkError: () => 
    `ネットワークエラーです。接続を確認してもう一度お試しください。`,
  
  recognitionFailed: () => 
    `音声を認識できませんでした。もう一度はっきりと話してください。`
};
```

#### 自動復旧機能
```typescript
const handleCommandError = useCallback((
  error: Error, 
  command: VoiceCommand,
  retryCount: number = 0
) => {
  const errorMessage = getErrorMessage(error, command);
  
  // 音声でエラーを通知
  speak(errorMessage, {
    onEnd: () => {
      // 特定のエラーの場合、自動で再試行提案
      if (shouldSuggestRetry(error) && retryCount < 2) {
        speak("もう一度お試しください。", {
          onEnd: () => {
            if (!isListening) startListening();
          }
        });
      }
    }
  });
  
  // 視覚的なエラー表示
  setCommandFeedback({
    result: 'error',
    message: errorMessage,
    timestamp: new Date()
  });
}, [speak, isListening, startListening]);
```

## 実装スケジュール

### 週1: 基本フィードバック（タスク 3.1-3.2）
- [ ] 音声フィードバックシステムの設計・実装
- [ ] 基本的な視覚フィードバックコンポーネント

### 週2: 履歴・ヘルプ機能（タスク 3.3-3.4）
- [ ] コマンド履歴システムの実装
- [ ] ヘルプ・ガイダンス機能の実装

### 週3: エラーハンドリング・テスト（タスク 3.5）
- [ ] エラーハンドリングの強化
- [ ] 統合テスト・調整

## 完了基準

### 機能要件
- [ ] 全てのコマンド実行に対して適切なフィードバックが提供される
- [ ] ユーザーがコマンドの実行状況を常に把握できる
- [ ] エラー時に分かりやすい案内と復旧支援が提供される

### ユーザビリティ要件
- [ ] 音声案内が自然で聞き取りやすい
- [ ] 視覚的フィードバックが邪魔にならない
- [ ] ヘルプ機能で迷わず使える

### 性能要件
- [ ] フィードバック表示の遅延が200ms以内
- [ ] 音声案内の開始が500ms以内

## 次のステップ
Step 3完了後、Step 4（動作テスト・最適化）に進む。