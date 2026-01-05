kitsunejs テスト失敗ホットフィックス計画（unwrapOr/unwrapOrElse の never 特例）

作成日: 2025-11-20

目的:
- `tests/core/result.test-d.ts` の「never 特例」型テスト失敗を解消する最小変更プランを定義する。

事象:
- `Result.err("x").unwrapOrElse(() => 123)` の推論が `number` ではなく `never` と評価され、型テストが失敗。

原因（要点）:
- 条件型が分配される書き方（`T extends never ? U : T`）だったため、`T=never` 分岐が安定しなかった。
- `unwrapOrElse` のオーバーロード順で非ジェネリック版が先に選ばれる可能性があった。

対応方針（案と選定）:
- 案A（採用）: 条件型を非分配化 → `[T] extends [never] ? U : T`。
- 案B（併用）: `unwrapOrElse` のオーバーロードは「U 版 → T 版」の順に並べる。
- 案C（不採用）: 常時ユニオン化（`T | U`）。
- 案D（不採用）: `Result.err` の既定 T を `unknown` に変更。

実施ステップ:
1. 抽象 `Result<T, E>` のオーバーロード更新（`unwrapOr`/`unwrapOrElse`）。
2. 具象 `Ok`/`Err` の同名オーバーロード更新（ランタイム実装は維持）。
3. `pnpm type-check` / `pnpm test` で検証。
4. 影響と理由を本ファイルに記録、CHANGELOG 0.1.0 に追記予定。

検証結果（現在）:
- type-check: Pass
- test: Pass（該当 d.ts テストを含む）

影響範囲と互換性:
- ランタイム挙動は非変更。
- 型は「通常は T、`T=never` のときのみ U」に安定化。

確認事項:
1) 本ホットフィックス内容で確定して問題ありませんか？
2) CHANGELOG 0.1.0 に「型宣言の安定化（never 特例）」を追記してよいですか？
3) 今後の新規 API にも `[T] extends [never] ? ...` パターン適用でよいですか？
