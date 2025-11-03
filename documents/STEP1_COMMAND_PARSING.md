# Step 1: 音声コマンド解析機能の強化

## 目標
既存の音声コマンド解析機能を拡張し、定義された音声コマンドを正確に認識・分類する。

## 現在の実装状況

### 既存のコマンド定義
```typescript
const RESERVED_COMMANDS = {
  STEP_NUMBER: /ステップ\s*(\d+)/i,
  NEXT_STEP: ["次", "次のステップ"],
  PREV_STEP: ["戻って", "前のステップ"],
  FIRST_STEP: ["最初", "最初に戻る"],
  LAST_STEP: ["最後", "最後まで進む"],
  ALL_STEPS: ["全て", "全てのステップ", "すべて", "すべてのステップ"],
  ZOOM_IN: ["拡大", "画像拡大"],
  ZOOM_OUT: ["縮小", "画像縮小"],
  STOP_SPEAKING: ["しゃべらないで", "止まって", "ストップ"],
}
```

### 既存のコマンド型定義
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

## 実装タスク

### タスク 1.1: コマンドパターンの拡張
- [ ] 既存のコマンドパターンを確認
- [ ] 音声認識で認識されやすいバリエーションを追加
- [ ] 部分一致・あいまい一致機能の検討

#### 追加検討するバリエーション
```typescript
// ステップ移動
STEP_NUMBER: [
  /ステップ\s*(\d+)/i,
  /(\d+)\s*番目/i,
  /(\d+)\s*番/i,
  /第\s*(\d+)\s*ステップ/i
]

NEXT_STEP: [
  "次", "次のステップ", "つぎ", "進む", "進んで",
  "次に行く", "次へ", "forward", "フォワード"
]

PREV_STEP: [
  "戻って", "前のステップ", "もどって", "戻る",
  "前に戻る", "前へ", "back", "バック"
]
```

### タスク 1.2: コマンド解析精度の向上
- [ ] 音声認識結果の正規化処理
- [ ] ひらがな・カタカナ・漢字の統一処理
- [ ] 数字の漢数字・アラビア数字変換

#### 正規化処理の例
```typescript
function normalizeText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)) // 全角数字を半角に
    .replace(/[一二三四五六七八九十]/g, convertKanjiToNumber) // 漢数字を数字に
    .replace(/つぎ/g, '次')
    .replace(/まえ/g, '前');
}
```

### タスク 1.3: コマンド優先度の実装
- [ ] 複数のコマンドが一致した場合の優先度設定
- [ ] 特定コマンド（STOP_SPEAKING）の最優先処理
- [ ] コマンドの信頼度スコアリング機能

#### 優先度設定例
```typescript
const COMMAND_PRIORITY = {
  stopSpeaking: 1,    // 最優先
  step: 2,            // 数字指定
  navigation: 3,      // next, prev等
  display: 4,         // zoom等
  chat: 999           // 最後
};
```

### タスク 1.4: エラーハンドリングの改善
- [ ] 認識できないコマンドの処理
- [ ] 部分的に一致するコマンドの処理
- [ ] 音声品質が低い場合の再試行機能

#### エラーハンドリング例
```typescript
function parseVoiceCommand(text: string): VoiceCommand | VoiceCommandError {
  const normalized = normalizeText(text);
  
  // 1. 完全一致チェック
  const exactMatch = findExactMatch(normalized);
  if (exactMatch) return exactMatch;
  
  // 2. 部分一致チェック
  const partialMatch = findPartialMatch(normalized);
  if (partialMatch.confidence > 0.8) return partialMatch.command;
  
  // 3. 候補提案
  if (partialMatch.confidence > 0.5) {
    return { type: "suggestion", candidates: partialMatch.candidates };
  }
  
  // 4. チャットとして処理
  return { type: "chat", text: normalized };
}
```

## 実装完了基準

### 機能要件
- [ ] 全てのRESERVED_COMMANDSが正確に認識される
- [ ] 音声認識の誤変換に対してもある程度対応できる
- [ ] コマンド実行の成功率が90%以上

### 性能要件
- [ ] コマンド解析処理時間が100ms以下
- [ ] メモリ使用量の増加が最小限

### 品質要件
- [ ] 単体テストのカバレッジが90%以上
- [ ] 実際の音声入力でのテスト実施

## 次のステップ
Step 1完了後、Step 2（UIコンポーネントとの連携）に進む。