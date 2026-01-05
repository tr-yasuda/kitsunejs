docs のコード例を examples に実体化する実装計画（実行プラン v1）

作成日: 2025-11-20

## 目的と範囲
- 目的: `docs/` に掲載されている TS/JS のコード例を、実行可能（または型検証可能）な形で `examples/` 配下に整備する。
- 範囲: `docs/api-reference.md`, `docs/recipes.md`, `docs/rust-comparison.md`（TS/JS 部分のみ）。Rust コードは除外。

## 前提/合意事項（再掲）
- 構成: docs 構成ミラー型（A 案）
- 実行レベル: 可能なものは実行（外部 I/O は mock 化）（B レベル）
- インポート: `@/*` で `src/` を参照（ESM、拡張子は `.js` 指定）
- ツール: `tsx`
- 命名: 連番-短い説明（kebab-case）
- CI: 型チェック＋一部 smoke-run
- 出典ヘッダ: 各 example 冒頭に記載（出典ファイル/セクション）
- 補助コード: mock/型補助を最小限許可

## 進め方（マイルストーン）
1. 雛形準備（ディレクトリ/README/共通ヘルパ）
   - `examples/` を作成し、章/節に対応するサブディレクトリを用意する。
   - 必要に応じて `examples/_helpers/` に最小限の mock/ユーティリティを配置（`fetch` mock など）。
   - `examples/README.md`（任意）を追加して使い方を明記。
2. Recipes の移植（優先）
   - 1.1 API Call Error Handling（`fetch` を mock）
   - 1.2 Unifying Multiple Error Types
3. API Reference の代表例移植
   - `ok`/`err`
   - `map`/`mapErr`/`andThen`
   - `fromNullable`/`try`/`tryAsync`
   - `all`/`any`
   - `unwrapOr`/`unwrapOrElse`
4. スクリプト追加（`package.json`）
   - `devDependencies` に `tsx`
   - `examples:check`: `tsx --tsconfig tsconfig.json --no-transpile --typecheck examples/**/*.ts`
   - `examples:run`: smoke 対象のみ実行（`tsx examples/**/NN-*.ts` のサブセット）
5. CI 連携（`.github/workflows/lint.yaml`）
   - `examples:check` をジョブに追加
   - `examples:run` のサンプル実行（代表 2〜3 本）
6. ドキュメント/整備
   - `examples/README.md` に使用方法、実行方法、ポリシー（mock の方針、ESM など）を追記

## ディレクトリ/ファイル雛形（初期）
```
examples/
  recipes/
    1-error-handling/
      01-api-call-error-handling.ts
      02-unifying-multiple-error-types.ts
      README.md
  api-reference/
    01-ok-err.ts
    02-map-mapErr-andThen.ts
    03-fromNullable-try-tryAsync.ts
    04-all-any.ts
    05-unwrapOr-unwrapOrElse.ts
  _helpers/
    fetch-mock.ts
  README.md (任意)
```

## 実装・記述ルール（抜粋）
- ファイル先頭に出典ヘッダを記載（例）
  ```ts
  /**
   * Source: docs/recipes.md#11-api-call-error-handling
   * Note: External I/O is mocked.
   */
  ```
- ESM 構成に合わせて import で拡張子 `.js` を付ける（`@/core/result.js` 等）。
- 例内の型定義は `type` を使用（`interface` 禁止）。
- 関数は `function` 宣言を使用（引数の関数のみアロー可）。
- `any` 禁止。必要に応じて `unknown`/ジェネリクスを使用。
- 非同期処理は `async/await` を使用。例外は握りつぶさずハンドリング。

## mock 方針
- `fetch` は `examples/_helpers/fetch-mock.ts` で提供。
  - 成功/失敗を切り替えられる最小 API（`setResponse`, `setError` など）
  - 各 example ファイル内で `globalThis.fetch = mockFetch` のように差し替え、実行後に復元。

## スクリプト例（案）
- `examples:check`: 型チェック専用
- `examples:run`: 代表サンプルの smoke 実行（時間短縮のため限定）

## 段階的導入パターン（提案）
### パターンA: 最小セット（recipes 1.1/1.2 のみ）
- Pros: 早期に CI を通し、方針を検証できる。差分が小さくレビューが容易。
- Cons: docs 全体との乖離が一時的に発生。

### パターンB: 標準セット（A + API Reference 代表例）
- Pros: ライブラリの核機能の使用感を網羅。CI のカバレッジが向上。
- Cons: 多少のボリューム。mock 設計が必要。

### パターンC: 一括移植（該当 TS/JS をすべて）
- Pros: ドキュメントと examples の完全同期。
- Cons: 初回コスト/レビュー負荷が大きい。CI 時間増。

推奨案: パターンB（標準セット）。

## 成功判定（Done の定義）
- `examples:check` がローカル/CI で成功する。
- `examples:run` の smoke がローカル/CI で成功する。
- `docs` の対象例が `examples/` に存在し、出典ヘッダが付与されている。

## 確認事項（要ご回答）
1) `examples/_helpers` の導入は許可で問題ありませんか？
2) smoke 実行対象は「recipes 1.1 / 1.2 / api-reference から 1 本」の計 3 本で良いですか？
3) `package.json` への `tsx` 追加バージョンは `^4` 系で問題ありませんか？
4) `examples/README.md` の追加は実施してよいですか？

以上、承認いただければ、パターンBにて「1. 雛形準備」→「2. Recipes 1.1/1.2」→「3. API Reference 代表例」の順で実装を開始します。
