kitsunejs 型エラー改善プラン（改訂版）

作成日: 2025-11-20
参照: z/2025-11-19-type-fixes-plan.md（前版）

この改訂版はユーザー回答に基づき、型安全性を維持しつつ `Result.err('...').unwrapOr(0)` を自然に許容する方針へ再設計したプランです。複数パターンを提示し、Pros/Cons を明記し、最後に推奨案を提示します。

---

ユーザー回答の解釈（要点）

- 1) a（自然な記法を許容）。提案の中では案Bが良い。
  - 目的: `Result.err('...').unwrapOr(0)` を型エラー無しで許容。
- 2) ユニオン多発は好ましくない（Type-safe が売り）。
- 3) ヘルパー追加は可だが、本当に必要か吟味したい。
- 4) ドキュメントだけでなく、ライブラリの型改善まで行う。

→ 使い勝手（1-a）を確保しつつ、安易なユニオン化は避ける（2）。ヘルパーは必要最小限（3）。ライブラリ側で型を改善（4）。

---

選択肢（改訂）

案A: ドキュメント統一のみ（現状維持）

- 内容: サンプルでは常に `Result.err<number>(...)` を明示。
- Pros:
  - コード変更不要。リスク最小。
- Cons:
  - 使い勝手が悪く、(1-a) を満たせない。

案B: `unwrapOr`/`unwrapOrElse` を常時ユニオン化（前版案B）

- 例: `unwrapOr<U>(v: U): T | U` / `unwrapOrElse<U>(f: (e: E) => U): T | U`。
- Pros:
  - `Result.err('...').unwrapOr(0)` が通る。
- Cons:
  - 戻り値が `T | U` になりやすく、(2) に反する（型の明確性低下）。

案B': 条件付きオーバーロード（推奨改案）

- 目的: 便宜（1-a）と型安全（2）を両立。通常は `T` を維持し、`T = never`（典型的に `Result.err(...)`）のときだけ既定値型 `U` に収束。
- 仕様（概念）:
  - unwrapOr
    - `function unwrapOr(defaultValue: T): T;`
    - `function unwrapOr<U>(defaultValue: U): T extends never ? U : T;`
  - unwrapOrElse
    - `function unwrapOrElse(fn: (error: E) => T): T;`
    - `function unwrapOrElse<U>(fn: (error: E) => U): T extends never ? U : T;`
- 挙動:
  - `Result.err('x')` は `T = never` → `unwrapOr(0)` は `number` を返す（ユニオン化しない）。
  - `Result<number, E>` など `T` 既知 → 返り値は常に `T`（ユニオン化しない）。
- Pros:
  - 直感的な書き方を許容しつつユニオン氾濫を回避。
  - 公開 API の意味論は維持（返り値の型がより明確）。
- Cons:
  - 型宣言が高度で、実装・型テストのコストは増える。

案C: `Result.err` の既定 `T` を `unknown` に変更

- Pros: `unwrapOr(0)` の通りやすさは上がる。
- Cons: `T` が `unknown` に流れやすく、後段の絞り込み負担・安全性低下。非推奨。

案D: ヘルパー `errOf<T>` 追加（任意）

- 例: `Result.errOf<number>('...')`。
- Pros: 明示スタイルの選択肢を提供。後方互換。
- Cons: API 表面積増。案B' が機能すれば必須ではない。

---

推奨案（結論）

- 第1優先: 案B'（条件付きオーバーロード）。
  - `Result.err('...').unwrapOr(0)` を許容しつつ、原則ユニオン化を避ける。
  - Type-safe 指向に合致。
- 第2優先: 案D は必要が生じた場合のみ追加（当面は見送り可）。
- 非推奨: 案B（常時ユニオン化）、案C（`unknown` 既定化）。

---

実施タスク（詳細）

1. 現状調査と再現
   - tsc 型チェック・tsup ビルド・vitest 実行で型/挙動を確認。
   - README / docs（`docs/api-reference.md`, `docs/recipes.md`, `docs/rust-comparison.md`）のサンプルを抽出し、検証用に型チェック。

2. 型設計の更新（案B' 実装）
   - `Result<T, E>` の `unwrapOr` / `unwrapOrElse` に条件付きオーバーロードを導入。
   - `Ok<T, E>` / `Err<T, E>` が存在する場合は宣言を整合。
   - 公開 API の差分をレビュー（破壊的変更の有無確認）。

3. ドキュメント更新（Type-safe を前面に）
   - サンプルを全て型エラー無しに修正。
   - 「`T=never` の場合のみ既定値型に収束する」仕様と利点（ユニオン回避）を明記。
   - よくあるパターン／アンチパターンの追記。

4. 検証
   - tsc/tsup/vitest を再実行し、型と挙動を確認。
   - Node ESM で簡易サンプル実行確認。

5. 任意の拡張（必要時のみ）
   - `Result.errOf<T>` の追加可否を再評価。追加する場合は README に明示スタイルとして併記。
   - 必要に応じて `z/coding-guidelines.md` へ要約反映。

6. 変更履歴の記録
   - 前版（2025-11-19）との差分と採否理由を `z/` に記録。

---

サンプル型シグネチャ（案B' 雛形）

```
// 実コードの構造に合わせて this 型や実装は調整
type Result<T, E> = {
  // unwrapOr
  unwrapOr(defaultValue: T): T;
  unwrapOr<U>(defaultValue: U): T extends never ? U : T;

  // unwrapOrElse
  unwrapOrElse(fn: (error: E) => T): T;
  unwrapOrElse<U>(fn: (error: E) => U): T extends never ? U : T;
}
```

- 目的は「`T=never` のみ既定値型へ収束」。通常ケースでは返り値は `T` を維持。
- 具象実装（`Ok`/`Err`）がある場合、同様のオーバーロード宣言を反映。

---

リスクと緩和策

- オーバーロード順序や条件式次第で推論がぶれる可能性
  - 対応: 型テスト（dtslint/expect-type もしくは vitest の型検証）を追加。
- IDE 表示の分かりやすさ
  - 対応: JSDoc に「`T=never` 特例」を明記しツールチップを改善。
- 互換性
  - 対応: 破壊的変更が無いことを確認。影響は CHANGELOG に明記。

---

スケジュール（目安）

- Day 0: 本プランレビュー＆確定 → 実装着手。
- Day 1: 型変更（案B'）実装、ドキュメント更新、tsc/tsup/vitest 通過。
- Day 2: レビュー対応、微調整、パッチリリース準備。

---

最終確認のお願い（質問）

1) 案B'（条件付きオーバーロード）採用で問題ありませんか？
2) `errOf<T>` は当面見送り、必要性が出たら追加の方針で良いですか？
3) ドキュメントでは「`T=never` のみ既定値型へ収束」を明示し、通常は `T` を返す説明で問題ありませんか？
4) 他に配慮すべきユースケース（`const` リテラルの推論、後続の narrowing 必要性など）はありますか？
