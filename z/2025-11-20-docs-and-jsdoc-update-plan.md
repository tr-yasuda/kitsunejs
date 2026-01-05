kitsunejs ドキュメント更新＆JSDoc英文化プラン（案提示＋推奨案）

作成日: 2025-11-20 11:02
参照:
- z/2025-11-20-type-fixes-plan.md（改訂プラン）
- z/2025-11-20-type-fixes-implementation-plan.md（実装プラン）
- z/2025-11-20-type-fixes-execution-plan.md（進捗）

---

背景と目的

- 方針は承認済み：条件付きオーバーロード（案B'）を採用済み。
- 追加のユーザー要望：
  - ドキュメント表現は「パターンB（詳しめ・ユーザーフレンドリー）」を採用。
  - CHANGELOG への追記を実施。
  - 型検証テストを 2 ケース追加。
  - JSDoc が日本語の箇所を英語に修正。

---

提案パターン（ドキュメント表現）

パターンA（簡潔）
- 内容: 仕様中心の短い記述のみ。
- Pros:
  - 読了が速い。ノイズが少ない。
- Cons:
  - 初学者が誤解しやすい。動機や背景が伝わりにくい。

パターンB（詳しめ・ユーザーフレンドリー）【推奨】
- 内容: 仕様＋サンプル＋FAQ（なぜユニオンを避けるか、`T=never` 特例の意義、よくあるパターン）。
- Pros:
  - 誤用を防ぎやすい。意図が明確。
  - IDE 上での挙動（ツールチップ）と一致して理解しやすい。
- Cons:
  - 文章量がやや増える。

推奨案：パターンB（本プランはパターンBで具体化します）

---

変更対象と編集方針

1) JSDoc（英語化）
   - 対象: `src/core/result.ts` の `Result#unwrapOr` / `Result#unwrapOrElse`（抽象・Ok・Err 含む）。
   - 方針: 日本語の補足文を英語に置換し、以下を明記。
     - Return type is generally `T`. It narrows to the default type `U` only when `T` is `never` (typical: `Result.err(...)`).
     - For `unwrapOrElse`, the same rule applies using the callback return type `U`.

2) ドキュメント（パターンBで更新）
   - `README.md`
     - Quick Start と API の要約に「`T=never` の特例」を記載。
     - サンプル：
       - `Result.err('x').unwrapOr(0)` の戻り型が `number`。
       - `Result.ok(1 as const).unwrapOr(0)` の戻り型が `1`。
   - `docs/api-reference.md`
     - `Result<T, E>` の `unwrapOr` / `unwrapOrElse` セクションを詳細化。
     - オーバーロードと推論ルールを明記。
   - `docs/recipes.md`
     - ユニオン回避の実践例、既定値の型一貫性の勘所を追加。
   - `docs/rust-comparison.md`
     - Rust の `unwrap_or` / `unwrap_or_else` との対比：TS のジェネリクス推論と `never` 特例の違いを解説。

3) 追加の型検証テスト（2ケース）
   - 目的: 推論が意図どおりであることを機械的に確認。
   - ケース:
     - `Result.err('x').unwrapOr(0)` が `number`。
     - `Result.ok(1 as const).unwrapOr(0)` がリテラル型 `1`。
   - 手段: 既存のテスト基盤（vitest / d.ts 検証）を利用。

4) CHANGELOG 追記
   - 種別: Patch（型定義の改善、ランタイム非変更）。
   - 記載: 条件付きオーバーロード導入、`T=never` 特例の説明、ドキュメント更新、型テスト追加。

---

作業タスクリスト（詳細）

1. JSDoc 英語化（src/core/result.ts）
   - [ ] `Result#unwrapOr` 説明文を英語へ
   - [ ] `Result#unwrapOrElse` 説明文を英語へ
   - [ ] Ok/Err の同名メソッドの英語ドキュメント整合

2. ドキュメント更新（パターンB）
   - [ ] README: 仕様＋サンプル＋注意点
   - [ ] docs/api-reference.md: オーバーロード宣言と推論規則
   - [ ] docs/recipes.md: 実践セクション拡充
   - [ ] docs/rust-comparison.md: 比較節追記

3. テスト追加（型検証）
   - [ ] 2ケースの型推論検証を追加（vitest/d.ts）

4. 変更履歴
   - [ ] CHANGELOG: Patch ノートを追記

5. 最終検証
   - [ ] `pnpm type-check`
   - [ ] `pnpm build`
   - [ ] `pnpm test`

---

スケジュール（目安）

- 本日（Day 0）: 本プラン確定、JSDoc 英語化、README と API リファレンス更新
- 明日（Day 1）: 残りの docs 更新、型テスト 2 ケース追加、CHANGELOG 追記
- 明後日（Day 2）: 最終レビューと微調整、PR 作成

---

リスクと緩和

- IDE 上のオーバーロード表示が冗長
  - → JSDoc を簡潔に、先頭に結論（原則 `T`、`T=never` で `U`）を書く。
- 型テストが環境差で不安定
  - → 期待型の直書きと `as const` を併用し、最小限のケースに限定。

---

確認事項（最終）

1) 本プラン（パターンB＋JSDoc英文化＋CHANGELOG＋型テスト追加）の内容で着手して問題ありませんか？
2) CHANGELOG の見出しは `0.1.x` パッチでよいですか？（別指定があればご指示ください）
