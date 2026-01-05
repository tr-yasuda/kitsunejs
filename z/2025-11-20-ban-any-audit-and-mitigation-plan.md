# any 使用監査と是正プラン（Result 周辺の実装シグネチャ）

作成日: 2025-11-20

## 背景 / 課題
- 本プロジェクトでは any 型の使用を原則禁止としています。
- 直近の型改善（`Result<T, E>` の `unwrapOr` / `unwrapOrElse` 条件付きオーバーロード導入）で、実装シグネチャ（実体側）に `any` が混在しています。
- ユーザー質問: 「今回の any は本当に必要か？」

## 現状把握（該当箇所の例）
- `src/core/result.ts`
  - Ok クラス 実装シグネチャ：
    - `unwrapOr(_defaultValue: any): any`
    - `unwrapOrElse(_fn: (error: E) => any): any`
  - Err クラス 実装シグネチャ：
    - `unwrapOr(defaultValue: any): any`
    - `unwrapOrElse(fn: (error: E) => any): any`
- 目的は「オーバーロード解決のための実装シグネチャを緩くし、ランタイムは変更しない」ことでしたが、方針上 any は避けるべきです。

## 選択肢（複数案）

### 案A: 例外的に any を内側実装だけで許容
- 概要: 公開 API のオーバーロードは型安全を維持し、実装シグネチャのみ any を使用。
- Pros:
  - 実装が最小限で簡潔。
  - 追加の型ユーティリティやアサーションが少ない。
- Cons:
  - 方針違反（any 原則禁止）。
  - 将来の保守で any が外側に漏れるリスク。
  - 静的解析（biome/ESLint）との矛盾が生じうる。

### 案B: any を完全撤廃し、unknown + 型アサーション（必要最小限）に置換（推奨）
- 概要: 実装シグネチャを `unknown` ベースに変更し、戻り値はオーバーロードと整合するジェネリック条件型を採用。内部で必要時のみアサーション（`as unknown as ...`）を使用。
- 具体方針（例）：
  - Ok:
    - `unwrapOr(_defaultValue: unknown): T { return this.value; }`
    - `unwrapOrElse(_fn: (error: E) => unknown): T { return this.value; }`
  - Err:
    - `unwrapOr<U>(defaultValue: unknown): [T] extends [never] ? U : T { return defaultValue as unknown as ([T] extends [never] ? U : T); }`
    - `unwrapOrElse<U>(fn: (error: E) => unknown): [T] extends [never] ? U : T { return fn(this.error) as unknown as ([T] extends [never] ? U : T); }`
  - 抽象（`Result`）側はオーバーロードのみ（実装なし）なので変更不要。
- Pros:
  - any を全廃し、方針順守。
  - 型安全性が上がり、将来の拡張時の予期せぬ any 伝播を防止。
- Cons:
  - 実装にアサーションが入る分、若干冗長。
  - IDE 表示で実装シグネチャがやや複雑に見える。

### 案C: 実装シグネチャをオーバーロードと同等の最汎型に寄せる（追加ヘルパー型の導入）
- 概要: 共通ユーティリティ型（例: `type UnwrapReturn<T, U> = [T] extends [never] ? U : T`）を導入し、実装シグネチャにも適用。パラメータは `unknown`、戻り値は `UnwrapReturn<T, U>` で統一。
- Pros:
  - 返り値型の可読性向上。
  - 同パターンの再利用性が高い。
- Cons:
  - 公開 API 以外の型が 1 つ増える（表面積増加）。
  - 「本当に必要か？」の観点ではオーバーエンジニアリングの懸念。

### 案D: 実装を分岐して any/アサーションを不要化（ランタイム型ガードで厳密化）
- 概要: Ok/Err で実装を分ける（現状と同じ）上で、返り値の型を厳密化するためのランタイム分岐や補助関数を追加してアサーションを減らす。
- Pros:
  - 一部 `as` を減らせる可能性。
- Cons:
  - ランタイムの複雑化・コスト増。今回の変更目的（型のみ改善）から逸脱。

## 推奨案
- 案B（unknown + 必要最小限アサーション）を推奨します。
  - any を完全撤廃し、方針順守。
  - ランタイム非変更を維持。
  - 追加の型ユーティリティ導入（案C）は現時点では過剰と判断。

## 具体的な変更案（ドラフト）
- Ok 実装：
  - `unwrapOr(_defaultValue: unknown): T { return this.value; }`
  - `unwrapOrElse(_fn: (error: E) => unknown): T { return this.value; }`
- Err 実装：
  - `unwrapOr<U>(defaultValue: unknown): [T] extends [never] ? U : T { return defaultValue as unknown as ([T] extends [never] ? U : T); }`
  - `unwrapOrElse<U>(fn: (error: E) => unknown): [T] extends [never] ? U : T { return fn(this.error) as unknown as ([T] extends [never] ? U : T); }`
- ドキュメント/JSDoc：any 記述があれば unknown に統一（JSDoc は英語運用を維持）。
- テスト：既存の型テストはそのまま通る想定。回帰チェックのみ追加実行。

## 影響範囲
- 型定義（実装シグネチャ）に限定。公開 API/ランタイム挙動は不変。
- ビルド成果物（d.ts）の any 混入は無し。

## 実施手順
1. `src/core/result.ts` の any を unknown + アサーションに置換（Ok/Err 実装のみ）。
2. `pnpm type-check` / `pnpm build` / `pnpm test` を実行し回帰検証。
3. ドキュメント（`README.md`, `docs/api-reference.md`）に any 非使用方針を明記（必要なら追補）。
4. `CHANGELOG` 0.1.0 に「any を撤廃（実装シグネチャ）」を追記。
5. `z/` に完了レポートを追加。

## リスクと緩和
- リスク: 実装シグネチャの型が複雑化し、将来の修正時にアサーションの整合性が崩れる。
  - 緩和: 変更直後に型テスト（`tests/core/result.test-d.ts`）を再実行し、PR にガードとして残す。
- リスク: IDE での型表示が回りくどくなる。
  - 緩和: JSDoc に要点（"Return type narrows to U only when T is never"）を簡潔に記載。

## 確認したい点（要回答）
1) 案B（unknown + 必要最小限アサーション）で進めて問題ありませんか？
2) `CHANGELOG` 0.1.0 に「any 撤廃（実装シグネチャ）」を併記してよいですか？
3) any 禁止の自動検出を強化するため、Biome/ESLint ルール（`noExplicitAny` 相当）の厳格化をパイプラインに追加してよいですか？
4) 他ファイルにも any が残っていないか全体監査（grep）を実施してレポートする方針でよいですか？

---

以上、レビュー後に実装へ着手します。
