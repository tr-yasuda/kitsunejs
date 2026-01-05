kitsunejs 型エラー改善 実装実行プラン（進捗付き）

作成日: 2025-11-20 11:01
参照:
- z/2025-11-20-type-fixes-plan.md（改訂プラン）
- z/2025-11-20-type-fixes-implementation-plan.md（実装プラン）

---

目的

- 方針（案B'＝条件付きオーバーロード）に基づき、`Result.err('...').unwrapOr(0)` を型エラー無しで許容しつつ、通常は戻り値型 `T` を維持する。
- ランタイム挙動は現行のまま、型だけを改善。

---

実施ステップ（進捗）

1. 型変更の導入（Result/Ok/Err） ✓
   - 抽象 `Result<T, E>` にオーバーロードを追加：
     - `unwrapOr(defaultValue: T): T`
     - `unwrapOr<U>(defaultValue: U): T extends never ? U : T`
     - `unwrapOrElse(fn: (error: E) => T): T`
     - `unwrapOrElse<U>(fn: (error: E) => U): T extends never ? U : T`
   - 具象 `Ok`/`Err` に同オーバーロードを反映。実装は単一シグネチャでランタイム維持。

2. 型・ビルド・テストの検証 ✓
   - `pnpm type-check`（tsc）: 通過。
   - `pnpm build`（tsup）: 通過、d.ts 生成確認。
   - `pnpm test`（vitest）: 既存テスト・型テストともに通過。

3. ドキュメント更新（これから） *
   - `README.md`
   - `docs/api-reference.md`
   - `docs/recipes.md`
   - `docs/rust-comparison.md`
   - 記述方針: 「原則戻りは T、T=never（典型: `Result.err(...)`）のとき既定値/関数戻り型に収束」を明記。例を更新。

4. 追加の型検証（任意）
   - 最小の型テスト（expect-type もしくは vitest の d.ts テスト）を補強。

5. 変更履歴（CHANGELOG）とリリースノート（これから）
   - パッチリリースの草案を作成。

---

提案（ドキュメント表現の選択肢）

- パターンA: 仕様中心の簡潔表現（短め）
  - 例: 「`unwrapOr`/`unwrapOrElse` の戻りは原則 `T`。`T=never` のときに限り既定値（もしくは関数戻り値）の型に収束します。」
  - Pros: 簡潔で読みやすい。教程全体のノイズが減る。
  - Cons: 初学者には動機づけや根拠が薄い可能性。

- パターンB: 仕組み＋サンプル重視（やや詳しめ）
  - 例: 上記に加え、`Result.err('x').unwrapOr(0)` が `number`、`Result.ok(1 as const).unwrapOr(0)` が `1` 型（= T）となる例を併記。FAQ でユニオン回避の意図も説明。
  - Pros: 誤解を避けやすい。Type-safe 指向を明確化。
  - Cons: 文章量がやや増える。

推奨案

- パターンB（仕組み＋サンプル重視）。Pros: 誤用防止と意図の伝達に有利。

---

チェックリスト（最新版）

- [x] `Result` の型/実装に条件付きオーバーロードを追加（抽象/具象）
- [x] JSDoc に「T=never 特例」を記述（最低限）
- [x] 型検証（tsc）通過
- [x] ビルド（tsup）通過
- [x] テスト（vitest）通過（既存 d.ts テスト含む）
- [ ] ドキュメント全更新・サンプル再検証
- [ ] 型検証テストの追加（任意）
- [ ] CHANGELOG 下書き作成
- [ ] `z/` に完了メモと差分理由を追記

---

互換性・リスク

- 公開 API のランタイムは非変更。型レベルの改善のみ。
- 戻り型は従来どおり通常は `T`。`Result.err(...)` の経路でのみ既定値型へ収束。
- IDE のシグネチャ表示はオーバーロードにより改善（順序最適化済み）。

---

確認事項（ご回答ください）

1) ドキュメント表現は パターンA（簡潔）/パターンB（詳しめ） のどちらを採用しますか？
2) CHANGELOG への記載を行ってよいですか？（パッチ扱いで想定）
3) 追加の型テスト（`expect-type` など）を最低限 2 ケース追加してもよいですか？
   - `Result.err('x').unwrapOr(0)` が `number`
   - `Result.ok(1 as const).unwrapOr(0)` が `1`

---

備考

- コード規約: 既存の関数宣言スタイル・型命名に合わせて実装。
- ランタイムの例外文言やメソッド挙動は触っていません（非破壊）。
