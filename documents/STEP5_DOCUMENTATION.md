# Step 5: ドキュメント更新

## 目標
音声コマンド機能の実装完了に伴い、ユーザー向けと開発者向けのドキュメントを整備する。

## ドキュメント種類

### 5.1 ユーザー向けドキュメント

#### 音声コマンド使用方法ガイド
**ファイル**: `documents/USER_VOICE_COMMANDS_GUIDE.md`

```markdown
# 音声コマンド使用方法

## 基本操作

### 音声入力の開始
1. 画面右下の青いマイクボタンをクリック
2. ボタンが青く光り、「音声認識中」と表示されたら準備完了
3. はっきりとコマンドを話してください

### 音声入力の停止
- 「止まって」または「ストップ」と言う
- マイクボタンを再度クリック

## 利用可能なコマンド

### ステップ移動
- **「次」「次のステップ」** - 次のステップに進む
- **「戻って」「前のステップ」** - 前のステップに戻る  
- **「最初」「最初に戻る」** - 最初のステップに移動
- **「最後」「最後まで進む」** - 最後のステップに移動
- **「ステップ3」** - 指定した番号のステップに移動
- **「全て」「すべて」** - 全ステップを一覧表示

### 画像操作
- **「拡大」「画像拡大」** - 現在のステップ画像を拡大表示
- **「縮小」「画像縮小」** - 拡大表示を閉じる

### 音声制御
- **「しゃべらないで」「止まって」「ストップ」** - AI音声を停止

## 使用のコツ

### 音声認識を成功させるために
- **はっきりと話す**: 明瞭な発音を心がける
- **適度な音量**: 小声すぎず、大声すぎず
- **静かな環境**: 背景音が少ない場所で使用
- **マイクとの距離**: 30cm程度の距離を保つ

### エラーが発生した場合
- 「もう一度お試しください」と表示されたら、同じコマンドを繰り返す
- 認識されない場合は、別の言い方を試す（例：「次」→「次のステップ」）
- 継続してエラーが発生する場合は、マイクボタンを一度クリックして再開

## よくある質問

**Q: コマンドが認識されません**
A: 以下を確認してください：
- マイクの許可が与えられているか
- 背景音が大きすぎないか  
- はっきりと発音しているか

**Q: 音声出力を停止したい**
A: 「止まって」または「ストップ」と言ってください

**Q: どのコマンドが使えるかわからない**
A: 「ヘルプ」または「使い方」と言うと、利用可能なコマンドが案内されます
```

#### トラブルシューティングガイド
**ファイル**: `documents/VOICE_TROUBLESHOOTING.md`

```markdown
# 音声機能トラブルシューティング

## よくある問題と解決方法

### マイクが動作しない
**症状**: マイクボタンを押しても音声認識が開始されない

**解決方法**:
1. ブラウザのマイク許可を確認
2. システムのマイク設定を確認
3. 他のアプリケーションがマイクを使用していないか確認
4. ページを再読み込み

### 音声が認識されない
**症状**: 話しかけても何も反応しない

**解決方法**:
1. マイクに向かってはっきりと話す
2. 背景音を減らす
3. 定義されたコマンドを使用しているか確認
4. 音声認識サービスの状態を確認

### コマンドが間違って実行される
**症状**: 意図しないコマンドが実行される

**解決方法**:
1. より明確にコマンドを発音する
2. コマンドの前後に無関係な言葉を入れない
3. 雑音の少ない環境で使用する

### 音声出力が停止しない
**症状**: AI音声が止まらない

**解決方法**:
1. 「ストップ」または「止まって」と言う
2. マイクボタンをクリック
3. ページを再読み込み
```

### 5.2 開発者向けドキュメント

#### API仕様書
**ファイル**: `documents/VOICE_API_SPECIFICATION.md`

```markdown
# 音声コマンドAPI仕様

## useVoiceControl Hook

### インターフェース
```typescript
interface UseVoiceControlOptions {
  onCommand?: (command: VoiceCommand) => void;
  onError?: (error: string) => void;
  language?: string;
}

interface UseVoiceControlReturn {
  isListening: boolean;
  isSpeaking: boolean;
  isSupported: boolean;
  currentTranscript: string;
  startListening: () => void;
  stopListening: () => void;
  speak: (text: string, options?: SpeechOptions) => Promise<void>;
  stopSpeaking: () => void;
  toggleListening: () => void;
}
```

### 使用例
```typescript
const MyComponent = () => {
  const { isListening, speak, toggleListening } = useVoiceControl({
    onCommand: (command) => {
      console.log('受信したコマンド:', command);
    },
    onError: (error) => {
      console.error('音声エラー:', error);
    }
  });

  return (
    <div>
      <button onClick={toggleListening}>
        {isListening ? '停止' : '開始'}
      </button>
    </div>
  );
};
```

## VoiceCommand型定義

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
  | { type: "help"; category?: string }
  | { type: "chat"; text: string };
```

## コマンド解析

### parseVoiceCommand関数
```typescript
function parseVoiceCommand(text: string): VoiceCommand
```

**パラメータ**:
- `text`: 音声認識で取得したテキスト

**戻り値**:
- `VoiceCommand`: 解析されたコマンドオブジェクト

**解析ルール**:
1. STOP_SPEAKINGコマンドを最優先でチェック
2. 正規表現パターンでステップ番号を抽出
3. 定義済みキーワードで各コマンド種別を判定
4. 該当しない場合はchatコマンドとして処理
```

#### 拡張開発ガイド
**ファイル**: `documents/VOICE_EXTENSION_GUIDE.md`

```markdown
# 音声コマンド拡張開発ガイド

## 新しいコマンドの追加

### 1. コマンド定義の追加
```typescript
// src/hooks/useVoiceControl.ts
const RESERVED_COMMANDS = {
  // 既存のコマンド...
  
  // 新しいコマンドを追加
  NEW_COMMAND: ["新コマンド", "別の表現"],
};
```

### 2. 型定義の更新
```typescript
export type VoiceCommand =
  | { type: "newCommand"; parameter?: string }
  | // 既存の型定義...
```

### 3. 解析ロジックの追加
```typescript
const parseVoiceCommand = useCallback((text: string): VoiceCommand => {
  const normalizedText = text.trim();
  
  // 新しいコマンドのチェック
  if (RESERVED_COMMANDS.NEW_COMMAND.some((cmd) => normalizedText.includes(cmd))) {
    return { type: "newCommand" };
  }
  
  // 既存のロジック...
}, []);
```

### 4. コマンド実行の実装
```typescript
// src/components/chat/chat-window.tsx
useEffect(() => {
  voiceCommandHandlerRef.current = (command: VoiceCommand) => {
    if (command.type === "newCommand") {
      executeNewCommand();
      return;
    }
    
    // 既存のコマンド処理...
  };
}, []);
```

## パフォーマンス考慮事項

### 音声認識の最適化
- 認識結果のキャッシュ活用
- 不要な再認識の抑制
- メモリリークの防止

### レスポンシブ設計
- 低スペック端末での動作保証
- バッテリー消費の最小化
- ネットワーク使用量の最適化

## デバッグとテスト

### ログ出力
```typescript
// 開発環境でのみ詳細ログを出力
if (process.env.NODE_ENV === 'development') {
  console.log('音声認識結果:', transcript);
  console.log('解析されたコマンド:', command);
}
```

### テスト用モック
```typescript
// __mocks__/speechRecognition.ts
export const mockSpeechRecognition = {
  start: jest.fn(),
  stop: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
};
```
```

### 5.3 技術ドキュメント更新

#### CLAUDE.mdの更新
既存のCLAUDE.mdに音声機能の詳細を追加

```markdown
### 音声コマンド機能

- **音声認識**: Web Speech API使用
- **音声合成**: Speech Synthesis API使用  
- **対応ブラウザ**: Chrome, Edge, Safari（一部制限あり）
- **言語**: 日本語（ja-JP）

#### 主要ファイル
- `src/hooks/useVoiceControl.ts` - 音声制御の核となるカスタムフック
- `src/components/voice/VoiceMicButton.tsx` - 音声入力UIコンポーネント
- `src/components/chat/chat-window.tsx` - コマンド実行ハンドラー

#### 開発時の注意点
- 音声APIはHTTPS環境でのみ動作
- マイク許可が必要
- ブラウザ間で音声認識精度に差がある
```

#### package.jsonのscripts更新
```json
{
  "scripts": {
    "test:voice": "jest --testPathPattern=voice",
    "test:voice:watch": "jest --testPathPattern=voice --watch",
    "docs:voice": "typedoc src/hooks/useVoiceControl.ts --out docs/voice-api"
  }
}
```

## ドキュメント品質保証

### 5.4 ドキュメントレビュー

#### チェックリスト
- [ ] **正確性**: 実装と一致している
- [ ] **完全性**: 必要な情報が全て含まれている
- [ ] **明確性**: 理解しやすい表現になっている
- [ ] **一貫性**: 用語や表記が統一されている
- [ ] **最新性**: 最新の実装状況を反映している

#### レビュープロセス
1. **技術レビュー**: 実装担当者による内容確認
2. **ユーザビリティレビュー**: UI/UX観点での確認
3. **言語レビュー**: 日本語表現の自然さ確認
4. **最終レビュー**: 全体的な整合性確認

### 5.5 ドキュメント保守

#### 更新トリガー
- 新機能追加時
- バグ修正時  
- UI変更時
- ユーザーフィードバック受領時

#### バージョン管理
```markdown
## 変更履歴

### v1.2.0 (2024-XX-XX)
- 音声コマンド機能を追加
- ヘルプ機能を実装
- エラーハンドリングを改善

### v1.1.0 (2024-XX-XX)
- 基本的な音声認識機能を追加
```

## 完了基準

### ドキュメント完成度
- [ ] ユーザー向けガイドが完成している
- [ ] 開発者向けAPI仕様が完成している
- [ ] トラブルシューティングガイドが完成している
- [ ] 既存ドキュメントが更新されている

### 品質基準
- [ ] 内容の正確性が保証されている
- [ ] 実装との整合性が取れている
- [ ] ユーザビリティテストで有用性が確認されている

### 維持管理体制
- [ ] ドキュメント更新の責任者が明確
- [ ] 更新プロセスが定義されている
- [ ] 定期的な見直しスケジュールが設定されている

## 次のアクション
Step 5完了で音声コマンド機能の実装が完了。継続的な改善とユーザーフィードバックの収集を開始。