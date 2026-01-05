kitsunejs 型エラー改善 実装プラン（案B' 採用確定版）

作成日: 2025-11-20 10:48
参照: z/2025-11-20-type-fixes-plan.md（改訂プラン）

---

要約（決定事項）

- 採用: 案B'（`unwrapOr`/`unwrapOrElse` の条件付きオーバーロード）。
- 方針: ユニオン氾濫を避けつつ、`Result.err('...').unwrapOr(0)` を型エラー無しで許容。
- ヘルパー: `errOf<T>` は当面見送り。必要性が発生したら再提案。
- ドキュメント: 「T=never の場合にのみ既定値型へ収束」を明記。嘘がない説明を最優先。

---

選択肢の整理（簡易再掲）

- 案A（ドキュメント統一のみ）
  - Pros: 変更リスク最小
  - Cons: 使い勝手が悪い（不採用）
- 案B（常時ユニオン化）
  - Pros: 直感的に通る
  - Cons: ユニオン氾濫（不採用）
- 案B'（条件付きオーバーロード）
  - Pros: 直感と型安全の両立、原則ユニオン回避（採用）
  - Cons: 型宣言が高度
- 案C（`T` 既定 `unknown`）
  - Cons: 型安全性低下（不採用）
- 案D（`errOf<T>` ヘルパー）
  - Pros: 明示手段の提供
  - Cons: API 増加。当面見送り

---

実装タスク（詳細手順）

1. 現状調査（短時間）
   - tsc/tsup/vitest の現状通過状況を確認。
   - `Result` 実装/型定義の所在を特定（例: `src/core/result.ts` など。実際のファイル名を要確認）。
   - `unwrapOr`/`unwrapOrElse` の既存シグネチャと `Ok`/`Err` 実装の有無を把握。

2. 型設計更新（案B' 実装）
   - `Result<T, E>` に以下のオーバーロードを追加。
     - `unwrapOr(defaultValue: T): T`
     - `unwrapOr<U>(defaultValue: U): T extends never ? U : T`
     - `unwrapOrElse(fn: (error: E) => T): T`
     - `unwrapOrElse<U>(fn: (error: E) => U): T extends never ? U : T`
   - 具象実装（`Ok`/`Err`）がある場合、同様のオーバーロードを宣言し、実装本体は現行の動作を維持。
   - オーバーロード順序は「T 固定のシグネチャ → U あり条件付き」の順に定義して推論を安定化。
   - JSDoc に「T=never の場合のみ既定値型へ収束」を明記。

3. 互換性・破壊的変更の確認
   - 既存公開 API の呼び出し箇所（テスト・サンプル）で型がより厳格/緩くならないか点検。
   - `unwrapOr`/`unwrapOrElse` の戻り値が従来 `T` だったケースはそのまま `T` を維持することを確認。

4. 型検証・動作検証
   - `pnpm typecheck`（または `tsc -p tsconfig.json --noEmit`）。
   - `pnpm build`（tsup）で型エクスポートに破綻がないことを確認。
   - `pnpm test`（vitest）でユニット/型テストを通過。
   - 必要に応じて `expect-type` 等で最小の型検証ケースを追加：
     - `Result.err('x').unwrapOr(0)` の戻りが `number` である。
     - `Result<number, E>.err(e).unwrapOr(0)`（もしくは `Result.ok(1).unwrapOr(0)`）の戻りが `number`（=T）である。

5. ドキュメント更新
   - 対象: `README.md`, `docs/api-reference.md`, `docs/recipes.md`, `docs/rust-comparison.md`。
   - 記述ルール:
     - まず「原則として戻りは T。T=never（典型: `Result.err(...)`）のみ既定値型へ収束」を冒頭に明記。
     - サンプルを全て型エラー無しに更新。
     - アンチパターン（無意味なユニオン化を誘発する設計）を避けるガイドを追加。

6. 変更履歴とレポート
   - `z/` に本実装プランの完了メモを追記（このファイルに完了チェックを追記）。
   - 必要に応じて `CHANGELOG` の下書きを `z/` に作成。

---

作業チェックリスト

- [ ] `Result` の型/実装に条件付きオーバーロードを追加
- [ ] `Ok`/`Err` 実装があれば整合性を確保
- [ ] JSDoc に仕様の要点（T=never 特例）を追記
- [ ] 型検証（tsc）通過
- [ ] ビルド（tsup）通過
- [ ] テスト（vitest）通過＋型検証ケース追加
- [ ] ドキュメント全更新・サンプル再検証
- [ ] `z/` に差分記録と完了メモ

---

リスクと緩和

- 推論ぶれ（オーバーロード順序・条件式）
  - 対応: シグネチャ順序の固定、最小型テストの追加。
- IDE 表示の分かりにくさ
  - 対応: JSDoc で特例説明を併記。
- 互換性
  - 対応: 公開 API の戻り型が変わらない（通常は T のまま）ことを確認し、CHANGELOG に明記。

---

スケジュール（目安）

- Day 0（本日）: プラン確定 ✓ / 実装着手
- Day 1: 実装・テスト・ドキュメント更新を完了し、レビュー提出
- Day 2: フィードバック反映とパッチリリース準備

---

承認不要事項（ユーザー回答済みのため前提化）

- 案B' 採用、`errOf<T>` 当面見送り、ドキュメント方針の確定。

---

備考（実装上の注意）

- TypeScript の条件型は分配されるため、`T extends never ? U : T` は `T=never` のときのみ `U` に収束する設計意図に合致。
- 実装本体は変更不要（`unwrapOr`/`unwrapOrElse` のランタイム挙動は現行のまま）を基本方針とする。
