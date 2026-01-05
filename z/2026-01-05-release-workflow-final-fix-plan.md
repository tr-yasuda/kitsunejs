# Release Workflow 最終修正プラン

## 現状の問題

- OIDC token exchange は成功している
- しかし npm publish 時に ENEEDAUTH エラーが発生
- 根本原因：`@semantic-release/npm` が npm CLI に OIDC 認証情報を正しく渡せていない

## ユーザーからの指摘事項

### 1. プランの方向性（正しい部分）

✅ **`@semantic-release/git` を外して master へ push しない**
- この方針は正しい
- GH013 エラー（repository rules 違反）はこれで解決する

### 2. 説明の修正が必要な部分

#### package.json の version について

**現在の説明（不正確）**:
- "package.json は 0.0.0 のままで、npm publish 時だけ動的に変更されて元に戻る"

**正しい説明**:
- `@semantic-release/npm` は publish のために **作業ディレクトリ上で** package.json を書き換える
- `@semantic-release/git` を外せば、その差分は **push/commit されない**
- よって master は汚れない（これが重要）

#### version 固定の運用リスク

**問題点**:
- `package.json` の version を `0.0.0` 固定にすると、将来的に問題になる可能性
  - `import { version } from "../package.json"` で参照したい場合
  - bundler がバナーやメタデータに version を埋める場合
  - 利用者が repo からビルドすると version が 0.0.0 になって混乱

**推奨対応**:
- `"version": "0.0.0-development"` に変更（開発版であることを明示）
- バージョン参照が必要になったら、**ビルド時に注入する**設計にする
  - CI で `GITHUB_REF_NAME` や `git describe` を使用
  - 実行時に `child_process` で git を叩くのは非現実的

### 3. 初回タグの扱い

**現在のプラン**:
- 手動で `v0.1.0` タグを作成

**問題点**:
- semantic-release は初回リリースで **1.0.0** を選ぶ（ログでも確認済み）
- 手動で v0.1.0 を打つのは、「まだ 0.x で行きたい」という意思表示としてはアリ
- ただし「そのタグをどのコミットに打つか」が運用上重要

**推奨**:
- v0.1.0 を打つなら、区切りのコミット（CHANGELOG 生成前後など）に付ける
- **もしくは 1.0.0 で良ければ、手動タグは不要（semantic-release に任せる）**

### 4. releaseRules の deps 扱い

**現在の設定**:
```json
{ "type": "chore", "release": false }
```

**問題点**:
- 依存関係アップデート（Dependabot）は多くが `chore(deps)` になる
- セキュリティ修正が deps 更新に含まれても、**一切リリースされない**可能性

**選択肢**:
1. `chore(deps)` を patch リリースする（deps 更新を出したい場合）
2. `chore` は基本 false だけど、`deps` だけ patch にする（折衷案）
3. 「Dependabot の PR は `fix(deps):` でコミットする」など、人間運用で逃がす

### 5. Biome スキーマ更新について

**問題点**:
- PR #14 で Biome スキーマ更新と release 修正を混ぜている
- 変更理由が別で、トラブル時に切り分けが難しくなる

**推奨**:
- Biome スキーマ更新は別 PR にする

---

## ユーザーの判断（確認済み）

### 1. deps 更新（Dependabot）も npm に出したい？

**回答: 出したくない**

理由：
- セキュリティ修正が含まれる deps 更新は `fix(deps):` でコミットすればリリースされる
- 通常の依存更新は開発者が意図的にリリースタイミングを制御したい
- Dependabot の自動 PR が即座にリリースを引き起こすのは制御が難しい

→ **`chore(deps)` は release: false のまま**

### 2. 初回バージョンは 0.1.0 から始めたい？ それとも 1.0.0 でOK？

**回答: 1.0.0 でOK**

理由：
- すでに API が安定している（Option/Result の実装は完成済み）
- 公開ドキュメントも整備済み
- テストカバレッジも十分
- semver では「public API が定義されていれば 1.0.0 から始めて良い」

→ **semantic-release に任せて 1.0.0 からスタート**

---

## 最終修正プラン

### 修正内容

#### 1. package.json の version 変更

```json
{
  "version": "0.0.0-development"
}
```

理由：開発版であることを明示し、将来の混乱を防ぐ

#### 2. .releaserc.json の確認（変更不要）

現在の設定のまま：

```json
{
  "branches": ["master"],
  "plugins": [
    [
      "@semantic-release/commit-analyzer",
      {
        "preset": "conventionalcommits",
        "releaseRules": [
          { "type": "feat", "release": "minor" },
          { "type": "fix", "release": "patch" },
          { "type": "perf", "release": "patch" },
          { "type": "refactor", "release": "patch" },
          { "type": "docs", "release": false },
          { "type": "style", "release": false },
          { "type": "test", "release": false },
          { "type": "chore", "release": false }
        ]
      }
    ],
    [
      "@semantic-release/release-notes-generator",
      {
        "preset": "conventionalcommits",
        "presetConfig": {
          "types": [
            { "type": "feat", "section": "Features" },
            { "type": "fix", "section": "Bug Fixes" },
            { "type": "perf", "section": "Performance Improvements" },
            { "type": "refactor", "section": "Code Refactoring" },
            { "type": "docs", "section": "Documentation", "hidden": true }
          ]
        }
      }
    ],
    "@semantic-release/npm",
    [
      "@semantic-release/github",
      {
        "successComment": false,
        "failComment": false,
        "releasedLabels": false
      }
    ]
  ]
}
```

注意点：
- `@semantic-release/git` は含まない（master への書き戻しを防ぐ）
- `@semantic-release/changelog` は含まない（CHANGELOG.md を生成しない）

#### 3. .github/workflows/release.yaml の最終形

現在の設定を確認し、必要に応じて修正：

```yaml
name: Release

on:
  push:
    branches:
      - master

permissions:
  contents: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v5
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v6
        with:
          node-version: 22
          registry-url: 'https://registry.npmjs.org'

      - name: Configure npm for provenance
        run: npm config set provenance true

      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10.20.0

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run lint
        run: pnpm lint

      - name: Run type-check
        run: pnpm type-check

      - name: Run tests
        run: pnpm test

      - name: Build
        run: pnpm build

      - name: Release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_CONFIG_PROVENANCE: true
        run: npx semantic-release
```

#### 4. Biome スキーマ更新を切り離す

PR #14, #15 の変更から Biome スキーマ更新を除外し、別 PR で対応

---

## 実行手順

### Phase 1: 既存 PR のクリーンアップ

1. ローカルで master を最新化
2. 既存の失敗した v1.0.0 タグを削除（すでに実施済み）
3. PR #15 の変更を確認

### Phase 2: 必要な修正

1. package.json の version を `0.0.0-development` に変更
2. この変更を PR #15 に追加するか、新規 PR にするか判断

### Phase 3: リリース実行

1. PR をマージ
2. Release workflow が自動実行
3. semantic-release が 1.0.0 としてリリース
4. OIDC 認証で npm に publish

---

## 残っている npm publish の ENEEDAUTH 問題

### 現状

- OIDC token exchange: ✅ 成功
- npm publish: ❌ ENEEDAUTH エラー

### 次に試すべき対応（優先順位順）

#### Option 1: semantic-release/exec を使用

`@semantic-release/exec` プラグインで npm publish を直接制御：

```json
{
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/npm",  // prepare のみ使用
    [
      "@semantic-release/exec",
      {
        "publishCmd": "npm publish --provenance --access public"
      }
    ],
    "@semantic-release/github"
  ]
}
```

**メリット**:
- semantic-release のバージョニング機能を維持
- npm publish コマンドを直接制御
- `--provenance` フラグを明示的に渡せる

**デメリット**:
- 追加の依存パッケージが必要

#### Option 2: Granular Access Token を使用（暫定対応）

npm で granular access token を作成：

1. https://www.npmjs.com/settings/~/tokens で token 作成
2. "Bypass 2FA for automation" を有効化
3. Expiration を 90 days に設定
4. GitHub Secrets に `NPM_TOKEN` として保存

**メリット**:
- 既存の semantic-release 設定がそのまま動く
- 実績がある方法

**デメリット**:
- OIDC の利点（トークン管理不要）を失う
- 90日ごとに更新が必要

#### Option 3: setup-node の設定を見直す

`setup-node@v6` の OIDC 対応状況を確認し、設定を調整

---

## 確認事項

以下の点について、ユーザーに確認が必要：

1. ✅ package.json の version を `0.0.0-development` に変更して良いか
2. ✅ Biome スキーマ更新は別 PR にするか
3. ❓ npm publish の ENEEDAUTH 問題について、どの Option を試すか
   - Option 1: semantic-release/exec（推奨）
   - Option 2: Granular Access Token（暫定）
   - Option 3: その他のアプローチ

---

## 補足：npm token の状況（2025/12/9 以降）

- npm classic tokens: 完全廃止
- 利用可能な認証方法:
  1. **OIDC Trusted Publishing**（推奨、トークン不要）
  2. **Granular Access Tokens**（最大90日間有効）
  3. **Session-based auth**（2時間有効、CLI 用）

現在のログでは OIDC token exchange は成功しているため、npm CLI への認証情報の渡し方が問題。
