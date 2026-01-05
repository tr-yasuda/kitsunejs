docs のコード例を examples ディレクトリに実体化する計画（v1）

作成日: 2025-11-20

目的:
- docs 配下の TS/JS のコード例をプロジェクト直下の examples/ に実体化する。
- Rust の例は対象外。

合意済み方針:
- 構成: docs 構成ミラー型（A 案）
- 実行レベル: 可能なものは実行（外部 I/O は mock 化）
- インポート: src からのパスエイリアス（@/*）
- ツール: tsx
- 命名: 連番-短い説明（kebab-case）
- CI: 型チェック＋一部 smoke-run を追加
- 出典ヘッダ: 各 example 冒頭に記載
- 補助コード: 型や mock を最小限許可

初回対象:
- docs/api-reference.md
- docs/recipes.md
- docs/rust-comparison.md（TS/JS のみ、Rust は除外）

実装手順（承認後）:
1) examples/ 作成、章/節に対応するサブディレクトリ作成
2) recipes の 1.1, 1.2 の例を移植（fetch は mock）
3) api-reference の代表例（ok/err, map/mapErr/andThen, fromNullable/try/tryAsync, all/any, unwrapOr/unwrapOrElse）を移植
4) package.json に tsx と scripts（examples:check, examples:run など）追加
5) CI（.github/workflows/lint.yaml）に examples チェック/一部実行を追加
6) 必要に応じて examples/README.md を追加

補足:
- 実行は副作用を避けるため mock を使用
- ESM/拡張子（.js）指定に合わせて import を記述
