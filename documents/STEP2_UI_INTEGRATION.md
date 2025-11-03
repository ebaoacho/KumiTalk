# Step 2: UIコンポーネントとの連携

## 目標
音声コマンドをUIコンポーネントの機能と統合し、実際のアプリケーション操作を音声で実行できるようにする。

## 対象コンポーネント

### 1. ChatWindow コンポーネント
- **ファイル**: `src/components/chat/chat-window.tsx`
- **連携機能**: ステップナビゲーション、画像表示制御

### 2. ShowImageDialog コンポーネント
- **ファイル**: `src/components/dialog/show-image-dialog.tsx`
- **連携機能**: 画像拡大表示・閉じる

### 3. VoiceMicButton コンポーネント
- **ファイル**: `src/components/voice/VoiceMicButton.tsx`
- **連携機能**: 音声制御状態表示

## 実装タスク

### タスク 2.1: ステップナビゲーション連携

#### 現在の実装確認
```typescript
// 既存のナビゲーション関数
const goPrev = useCallback(() => { ... }, []);
const goNext = useCallback(() => { ... }, []);
const setStepFilter = useState<StepFilter>();
```

#### 実装する音声コマンド連携
- [ ] `next` コマンド → `goNext()` 実行
- [ ] `prev` コマンド → `goPrev()` 実行  
- [ ] `first` コマンド → `setStepFilter(stepIndexes[0])` 実行
- [ ] `last` コマンド → `setStepFilter(stepIndexes[length-1])` 実行
- [ ] `all` コマンド → `setStepFilter("all")` 実行
- [ ] `step {number}` コマンド → 指定ステップに移動

#### 音声フィードバックの実装
```typescript
const executeNavigationCommand = (command: VoiceCommand) => {
  switch (command.type) {
    case 'next':
      if (hasNext) {
        goNext();
        speak(`ステップ${nextStepNumber}に移動しました`);
      } else {
        speak('これが最後のステップです');
      }
      break;
    // ... 他のコマンド
  }
};
```

### タスク 2.2: 画像表示制御連携

#### 対象機能
- [ ] 画像拡大表示の開始
- [ ] 画像拡大表示の終了
- [ ] 現在表示中の状態確認

#### 実装方法
```typescript
const executeImageCommand = (command: VoiceCommand) => {
  switch (command.type) {
    case 'zoomIn':
      if (selectedStep?.imageBase64) {
        setShowImageDialog(true);
        speak('画像を拡大表示しました');
      } else {
        speak('表示できる画像がありません');
      }
      break;
    
    case 'zoomOut':
      if (showImageDialog) {
        setShowImageDialog(false);
        speak('拡大表示を閉じました');
      } else {
        speak('現在拡大表示されていません');
      }
      break;
  }
};
```

### タスク 2.3: 音声制御の統合

#### 実装する機能
- [ ] 音声出力の即座停止
- [ ] 音声入力状態の制御
- [ ] 音声制御状態の可視化

#### 実装方法
```typescript
const executeVoiceControl = (command: VoiceCommand) => {
  switch (command.type) {
    case 'stopSpeaking':
      stopSpeaking();
      speak('音声を停止しました', { 
        onEnd: () => {
          // 停止メッセージ後、すぐに音声入力を再開
          if (!isListening) startListening();
        }
      });
      break;
  }
};
```

### タスク 2.4: コマンド実行ハンドラーの統合

#### 統合されたコマンド処理関数
```typescript
const executeVoiceCommand = useCallback((command: VoiceCommand) => {
  // 音声制御コマンドは最優先
  if (command.type === 'stopSpeaking') {
    executeVoiceControl(command);
    return;
  }

  // チャットが選択されていない場合のエラーハンドリング
  if (!selectedChatId) {
    speak('チャットが選択されていません');
    return;
  }

  // ナビゲーションコマンド
  if (['next', 'prev', 'first', 'last', 'all', 'step'].includes(command.type)) {
    executeNavigationCommand(command);
    return;
  }

  // 画像コマンド
  if (['zoomIn', 'zoomOut'].includes(command.type)) {
    executeImageCommand(command);
    return;
  }

  // チャットメッセージ
  if (command.type === 'chat') {
    executeChat(command.text);
    return;
  }
}, [selectedChatId, hasNext, hasPrev, ...]);
```

### タスク 2.5: エラーハンドリングとフィードバック

#### 実装するエラー処理
- [ ] ステップが存在しない場合
- [ ] 画像が利用できない場合
- [ ] ネットワークエラーの場合
- [ ] 音声認識エラーの場合

#### 音声フィードバックパターン
```typescript
const VOICE_FEEDBACK = {
  SUCCESS: {
    navigation: (stepNum: number) => `ステップ${stepNum}に移動しました`,
    zoom: '画像を拡大表示しました',
    close: '拡大表示を閉じました'
  },
  ERROR: {
    noStep: (stepNum: number) => `ステップ${stepNum}は存在しません`,
    noImage: '表示できる画像がありません',
    noChat: 'チャットが選択されていません',
    network: 'ネットワークエラーが発生しました'
  },
  INFO: {
    firstStep: 'これが最初のステップです',
    lastStep: 'これが最後のステップです',
    allSteps: '全ステップを表示しています'
  }
};
```

## UI状態との同期

### タスク 2.6: 状態管理の改善

#### 音声コマンド実行状態の管理
```typescript
const [voiceCommandExecuting, setVoiceCommandExecuting] = useState(false);
const [lastExecutedCommand, setLastExecutedCommand] = useState<VoiceCommand | null>(null);
```

#### 視覚的フィードバックの実装
- [ ] コマンド実行中のローディング表示
- [ ] 実行結果の一時的な表示
- [ ] エラー時の警告表示

## テスト要件

### 単体テスト
- [ ] 各コマンド処理関数のテスト
- [ ] エラーハンドリングのテスト
- [ ] 音声フィードバックの内容テスト

### 統合テスト
- [ ] 音声入力からUI更新までの一連のフロー
- [ ] 複数コマンドの連続実行
- [ ] エラー状態からの復旧

### ユーザビリティテスト
- [ ] 実際の音声入力での動作確認
- [ ] ノイズがある環境での動作確認
- [ ] 異なる話し方での認識精度確認

## 完了基準

### 機能要件
- [ ] 全ての定義済み音声コマンドが正しく動作する
- [ ] 適切な音声フィードバックが提供される
- [ ] エラー時に分かりやすいメッセージが表示される

### 性能要件
- [ ] コマンド実行の応答時間が500ms以内
- [ ] UI状態の更新が即座に反映される

### 品質要件
- [ ] 音声コマンドの成功率が95%以上
- [ ] ユーザビリティテストで満足度が高い

## 次のステップ
Step 2完了後、Step 3（ユーザーフィードバック機能の強化）に進む。