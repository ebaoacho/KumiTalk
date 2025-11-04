# Step 4: 動作テスト・最適化

## 目標
音声コマンド機能の品質を保証し、実際の使用環境でのパフォーマンスを最適化する。

## テスト戦略

### 4.1 機能テスト

#### 基本機能テスト
- [ ] **ナビゲーションコマンド**
  - ステップ移動（次、前、最初、最後、数字指定）
  - 全ステップ表示
  - 存在しないステップ指定の処理

- [ ] **表示制御コマンド**  
  - 画像拡大・縮小
  - 画像が存在しない場合の処理

- [ ] **音声制御コマンド**
  - 音声停止機能
  - 音声入力の再開

#### エッジケーステスト
```typescript
const EDGE_CASE_TESTS = [
  // 境界値テスト
  { command: "ステップ0", expectation: "エラーメッセージ" },
  { command: "ステップ999", expectation: "エラーメッセージ" },
  
  // 曖昧な音声入力
  { command: "つき", expectation: "「次」として認識" },
  { command: "まえ", expectation: "「前」として認識" },
  
  // 複合コマンド
  { command: "次のステップに進んで画像を拡大", expectation: "最初のコマンドのみ実行" },
  
  // 雑音混入
  { command: "えーと、次", expectation: "「次」として認識" },
  { command: "ステップ、うーん、3", expectation: "「ステップ3」として認識" }
];
```

### 4.2 パフォーマンステスト

#### 応答時間測定
```typescript
const PERFORMANCE_BENCHMARKS = {
  commandParsing: 50,      // ms - コマンド解析
  uiUpdate: 100,           // ms - UI更新
  voiceFeedback: 200,      // ms - 音声フィードバック開始
  totalResponse: 500       // ms - 全体の応答時間
};

const measurePerformance = async (command: string) => {
  const startTime = performance.now();
  
  const parseStart = performance.now();
  const parsedCommand = parseVoiceCommand(command);
  const parseTime = performance.now() - parseStart;
  
  const executeStart = performance.now();
  await executeCommand(parsedCommand);
  const executeTime = performance.now() - executeStart;
  
  const totalTime = performance.now() - startTime;
  
  return {
    parsing: parseTime,
    execution: executeTime,
    total: totalTime
  };
};
```

#### メモリ使用量測定
```typescript
const measureMemoryUsage = () => {
  if ('memory' in performance) {
    return {
      used: performance.memory.usedJSHeapSize,
      total: performance.memory.totalJSHeapSize,
      limit: performance.memory.jsHeapSizeLimit
    };
  }
  return null;
};
```

### 4.3 音声認識精度テスト

#### 認識精度テストケース
```typescript
const RECOGNITION_TEST_CASES = [
  // 標準的な発音
  { 
    input: "次のステップ", 
    expected: { type: "next" },
    confidence: 0.95 
  },
  
  // 方言・なまり
  { 
    input: "つぎのすてっぷ", 
    expected: { type: "next" },
    confidence: 0.85 
  },
  
  // 早口
  { 
    input: "つぎ", 
    expected: { type: "next" },
    confidence: 0.80 
  },
  
  // 小声
  { 
    input: "次...", 
    expected: { type: "next" },
    confidence: 0.70 
  }
];
```

#### 環境別テスト
```typescript
const ENVIRONMENT_TESTS = [
  {
    name: "静音環境",
    noiseLevel: 0,
    expectedAccuracy: 0.95
  },
  {
    name: "オフィス環境",
    noiseLevel: 0.3,
    expectedAccuracy: 0.85
  },
  {
    name: "カフェ環境", 
    noiseLevel: 0.6,
    expectedAccuracy: 0.70
  },
  {
    name: "屋外環境",
    noiseLevel: 0.8,
    expectedAccuracy: 0.60
  }
];
```

### 4.4 ユーザビリティテスト

#### テストシナリオ
```typescript
const USABILITY_SCENARIOS = [
  {
    id: "first_time_user",
    description: "初回ユーザーの音声操作",
    tasks: [
      "音声ボタンを押してステップ2に移動",
      "画像を拡大表示",
      "次のステップに進む",
      "全ステップ表示に戻る"
    ],
    successCriteria: "95%以上のタスク完了率"
  },
  
  {
    id: "experienced_user", 
    description: "経験ユーザーの効率的操作",
    tasks: [
      "音声のみで5つのステップを順次確認",
      "特定ステップにジャンプ",
      "画像操作を含む複合操作"
    ],
    successCriteria: "3分以内での全タスク完了"
  }
];
```

#### 満足度測定
```typescript
const SATISFACTION_METRICS = {
  ease_of_use: "音声コマンドの使いやすさ（1-5点）",
  accuracy: "認識精度への満足度（1-5点）", 
  speed: "応答速度への満足度（1-5点）",
  help: "ヘルプ機能の有用性（1-5点）",
  overall: "総合満足度（1-5点）"
};
```

## 最適化実装

### 4.5 音声認識の最適化

#### 認識精度向上
```typescript
// コンテキストを考慮した認識精度向上
const enhanceRecognition = (rawText: string, context: AppContext) => {
  const normalized = normalizeText(rawText);
  
  // 現在のステップコンテキストを考慮
  if (context.currentStep) {
    const stepKeywords = extractStepKeywords(context.currentStep);
    normalized = applyContextualCorrection(normalized, stepKeywords);
  }
  
  // 過去のコマンド履歴を考慮
  if (context.recentCommands.length > 0) {
    normalized = applyHistoryBasedCorrection(normalized, context.recentCommands);
  }
  
  return normalized;
};
```

#### 音声品質検出
```typescript
const detectAudioQuality = (audioContext: AudioContext) => {
  // 音量レベル測定
  const volumeLevel = measureVolumeLevel(audioContext);
  
  // ノイズレベル測定  
  const noiseLevel = measureNoiseLevel(audioContext);
  
  // 音質スコア計算
  const qualityScore = calculateQualityScore(volumeLevel, noiseLevel);
  
  if (qualityScore < 0.6) {
    speak("音声が聞き取りにくいです。マイクに近づいて、もう一度お試しください。");
  }
  
  return qualityScore;
};
```

### 4.6 パフォーマンス最適化

#### 遅延読み込み
```typescript
// 音声関連機能の遅延読み込み
const VoiceFeatures = lazy(() => import('./VoiceFeatures'));

const OptimizedVoiceControl = () => {
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  
  const enableVoice = useCallback(async () => {
    if (!isVoiceEnabled) {
      // 音声機能の初期化を遅延実行
      await initializeVoiceFeatures();
      setIsVoiceEnabled(true);
    }
  }, [isVoiceEnabled]);
  
  return (
    <Suspense fallback={<VoiceButtonPlaceholder />}>
      {isVoiceEnabled && <VoiceFeatures />}
    </Suspense>
  );
};
```

#### メモリ最適化
```typescript
// 音声認識結果のキャッシュ管理
const useVoiceCache = () => {
  const cache = useRef(new Map<string, VoiceCommand>());
  
  const getCachedCommand = useCallback((text: string): VoiceCommand | null => {
    return cache.current.get(text) || null;
  }, []);
  
  const setCachedCommand = useCallback((text: string, command: VoiceCommand) => {
    // キャッシュサイズ制限
    if (cache.current.size >= 100) {
      const firstKey = cache.current.keys().next().value;
      cache.current.delete(firstKey);
    }
    cache.current.set(text, command);
  }, []);
  
  return { getCachedCommand, setCachedCommand };
};
```

### 4.7 エラー処理の最適化

#### 自動復旧メカニズム
```typescript
const useAutoRecovery = () => {
  const [failureCount, setFailureCount] = useState(0);
  const [lastError, setLastError] = useState<Error | null>(null);
  
  const handleError = useCallback(async (error: Error) => {
    setLastError(error);
    setFailureCount(prev => prev + 1);
    
    // 連続失敗回数に応じた対応
    if (failureCount >= 3) {
      speak("音声認識に問題があります。ページを再読み込みしてください。");
      return;
    }
    
    if (failureCount >= 2) {
      speak("音声認識を再初期化しています。少々お待ちください。");
      await reinitializeVoiceRecognition();
      return;
    }
    
    // 1回目の失敗は簡単な再試行
    speak("もう一度お試しください。");
  }, [failureCount]);
  
  return { handleError };
};
```

## テスト自動化

### 4.8 自動テストスイート

#### 単体テスト
```typescript
// __tests__/voiceCommands.test.ts
describe('Voice Command Parser', () => {
  test.each([
    ['次', { type: 'next' }],
    ['ステップ3', { type: 'step', stepNumber: 3 }],
    ['拡大', { type: 'zoomIn' }],
    ['止まって', { type: 'stopSpeaking' }]
  ])('should parse "%s" correctly', (input, expected) => {
    const result = parseVoiceCommand(input);
    expect(result).toEqual(expected);
  });
});
```

#### 統合テスト
```typescript
// __tests__/voiceIntegration.test.ts
describe('Voice Command Integration', () => {
  test('should navigate to next step', async () => {
    const { getByTestId } = render(<ChatWindow />);
    
    // 音声コマンド実行をシミュレート
    fireEvent.voiceCommand(getByTestId('voice-button'), '次');
    
    await waitFor(() => {
      expect(getByTestId('current-step')).toHaveTextContent('Step 2');
    });
  });
});
```

## 品質保証

### 4.9 品質メトリクス

#### KPI定義
```typescript
const QUALITY_METRICS = {
  recognition_accuracy: {
    target: 0.90,
    current: 0.0,
    measurement: "正しく認識されたコマンド / 総コマンド数"
  },
  
  response_time: {
    target: 500, // ms
    current: 0,
    measurement: "コマンド入力から実行完了までの時間"
  },
  
  user_satisfaction: {
    target: 4.0, // 5点満点
    current: 0.0,
    measurement: "ユーザー満足度アンケート結果"
  },
  
  error_rate: {
    target: 0.05,
    current: 0.0,
    measurement: "エラー発生回数 / 総実行回数"
  }
};
```

#### 継続的モニタリング
```typescript
const trackMetrics = () => {
  const metrics = {
    commandExecutions: 0,
    successfulExecutions: 0,
    averageResponseTime: 0,
    errorCount: 0
  };
  
  // 実行時メトリクス収集
  window.addEventListener('voiceCommandExecuted', (event) => {
    metrics.commandExecutions++;
    if (event.detail.success) {
      metrics.successfulExecutions++;
    } else {
      metrics.errorCount++;
    }
    
    // 定期的にメトリクスを送信
    if (metrics.commandExecutions % 10 === 0) {
      sendMetricsToAnalytics(metrics);
    }
  });
};
```

## 完了基準

### 機能品質
- [ ] 全テストケースが95%以上の成功率
- [ ] 音声認識精度が90%以上
- [ ] 応答時間が平均500ms以内

### パフォーマンス
- [ ] メモリ使用量が10MB以内の増加
- [ ] CPU使用率が継続的に50%以下
- [ ] バッテリー消費が通常使用の120%以内

### ユーザビリティ
- [ ] ユーザビリティテストで満足度4.0以上
- [ ] 初回ユーザーの操作成功率90%以上
- [ ] エラー復旧成功率95%以上

## 次のステップ
Step 4完了後、Step 5（ドキュメント更新）で実装を完了する。