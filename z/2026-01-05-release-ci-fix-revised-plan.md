# Release CI 修正プラン（最終版）

**作成日**: 2026-01-05  
**対象**: kitsunejs リポジトリのリリースCI改善

---

## 現状分析

### 問題の本質

semantic-release が master ブランチに CHANGELOG.md と package.json をコミット・プッシュしようとして、repository rules に違反して失敗している。

**失敗箇所**:
```
[@semantic-release/git] › ℹ  Found 2 file(s) to commit
Error: git push --tags https://github.com/tr-yasuda/kitsunejs.git HEAD:master
remote: - Changes must be made through a pull request.
```

### 現在の設定フロー

1. `@semantic-release/changelog`: CHANGELOG.md を生成
2. `@semantic-release/npm`: package.json の version を書き換え
3. `@semantic-release/git`: これらをコミットして master に push ← **ここで失敗**

---

## 解決方針

**master に書き戻す系の plugin を削除する**

### 新しいフロー

1. コミット履歴を分析してバージョンを決定
2. **Git タグを作成**（例: v1.2.3）
3. **GitHub Release を作成**（リリースノート付き）
4. **npm に publish**（タグベースでバージョン指定）

### 真実の情報源（Source of Truth）

- **Git タグ**が正式なバージョン
- package.json の version は `0.0.0` のまま（semantic-release が npm publish 時に動的に設定）
- CHANGELOG.md は不要（GitHub Release でリリースノートを管理）

### メリット

- ✅ master ブランチを汚さない
- ✅ Repository rules と競合しない
- ✅ タグでバージョン管理が明確
- ✅ GitHub Release でリリースノート管理
- ✅ 設定がシンプル

---

## 実装内容

### 1. `.releaserc.json` の修正

**削除するプラグイン**:
- `@semantic-release/changelog` - CHANGELOG.md 生成（不要）
- `@semantic-release/git` - master へのコミット・プッシュ（不要）

**残すプラグイン**:
- `@semantic-release/commit-analyzer` - コミット分析
- `@semantic-release/release-notes-generator` - リリースノート生成
- `@semantic-release/npm` - npm publish
- `@semantic-release/github` - GitHub Release 作成

**新しい設定**:

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

### 2. Biome スキーマバージョンの更新

現在の警告を解消：

```bash
pnpm biome migrate --write
```

**変更内容**:
```diff
- "$schema": "https://biomejs.dev/schemas/2.3.5/schema.json",
+ "$schema": "https://biomejs.dev/schemas/2.3.10/schema.json",
```

---

## 実装手順

### ステップ 1: Biome スキーマの更新

```bash
# スキーマを更新
pnpm biome migrate --write

# 確認
pnpm lint

# コミット
git add biome.json
git commit -m "chore: update biome schema to 2.3.10"
```

### ステップ 2: `.releaserc.json` の修正

```bash
# 修正内容を確認後、コミット
git add .releaserc.json
git commit -m "chore: simplify semantic-release config to use Git tags as source of truth"
```

### ステップ 3: 変更をプッシュ

```bash
git push origin master
```

### ステップ 4: 初回タグの作成

```bash
# v0.1.0 として初回タグを作成
git tag -a v0.1.0 -m "chore: initial release tag"
git push origin v0.1.0
```

### ステップ 5: テストリリース

```bash
# feat コミットで新しいリリースをトリガー
git commit --allow-empty -m "feat: test semantic-release with tag-based workflow"
git push origin master
```

### ステップ 6: 動作確認

```bash
# ワークフロー確認
gh run list --workflow=release.yaml --limit 3

# タグ確認
git fetch --tags
git tag --list

# GitHub Release 確認
gh release list

# npm 公開確認
npm view kitsunejs versions
```

---

## 期待される動作

### リリースフロー（修正後）

1. **開発者が feat/fix コミットを master にマージ**（PR 経由）
2. **Release ワークフローが自動実行**
3. **semantic-release の動作**:
   - コミット履歴を分析 → 新バージョンを決定（例: v0.2.0）
   - **Git タグを作成** → `v0.2.0`
   - **GitHub Release を作成** → リリースノート付き
   - **npm に publish** → `kitsunejs@0.2.0`
4. **master ブランチには何も書き込まれない**

### バージョン管理

- **Git タグ**: `v0.1.0`, `v0.2.0`, `v0.2.1`, ...
- **GitHub Release**: タグごとにリリースノート
- **npm**: タグと同じバージョンで公開
- **package.json**: `"version": "0.0.0"` のまま（変更不要）

---

## トラブルシューティング

### 問題 1: npm publish 時に「バージョンが 0.0.0 のままでは？」

**回答**: semantic-release が npm publish 時に動的にバージョンを設定します。

`@semantic-release/npm` プラグインは：
1. Git タグからバージョンを取得
2. 一時的に package.json を書き換え
3. npm publish を実行
4. package.json は元に戻る（コミットされない）

### 問題 2: CHANGELOG.md がないと困る場合

**解決策**:

**オプション A**: GitHub Release をリリースノートとして使用（推奨）
- すべてのリリースノートは GitHub Releases に記録される
- ユーザーは GitHub で履歴を確認可能

**オプション B**: 手動で CHANGELOG.md を管理
- 重要なリリースのみ手動で記録
- または別ツールで GitHub Releases から生成

**オプション C**: `@semantic-release/changelog` を戻す（ただし git プラグインは不要）
```json
{
  "plugins": [
    ...,
    ["@semantic-release/changelog", { "changelogFile": "CHANGELOG.md" }],
    "@semantic-release/npm",
    "@semantic-release/github"
  ]
}
```
この場合、CHANGELOG.md は生成されるが、コミットされない（ローカルに残るだけ）。
必要なら手動でコミット・PR を作成する。

### 問題 3: package.json の version を更新したい

**理由**: ソースコードから現在のバージョンを参照したい場合

**解決策**: 
```typescript
// バージョンを取得する関数
import { execSync } from 'child_process';

function getVersion(): string {
  try {
    // Git タグから取得
    return execSync('git describe --tags --abbrev=0').toString().trim();
  } catch {
    return '0.0.0-dev';
  }
}
```

---

## チェックリスト

### 実装前
- [ ] 現在の `.releaserc.json` の内容を確認
- [ ] npm Trusted Publisher が設定済みか確認（✅ 確認済み）

### 実装
- [ ] Biome スキーマを 2.3.10 に更新
- [ ] `.releaserc.json` から不要なプラグインを削除
- [ ] 変更をコミット・プッシュ
- [ ] 初回タグ v0.1.0 を作成
- [ ] テストリリースを実行

### 確認
- [ ] ワークフローが成功したか
- [ ] Git タグが作成されたか（`git tag --list`）
- [ ] GitHub Release が作成されたか（`gh release list`）
- [ ] npm に公開されたか（`npm view kitsunejs versions`）
- [ ] リリースノートが正しく生成されたか

---

## まとめ

### 変更内容

1. **`.releaserc.json`**: `@semantic-release/changelog` と `@semantic-release/git` を削除
2. **`biome.json`**: スキーマバージョンを 2.3.10 に更新
3. **運用方針**: Git タグを真実の情報源とする

### メリット

- master ブランチへのコミットが不要
- Repository rules と競合しない
- シンプルで保守しやすい設定
- 標準的な Git タグベースのバージョン管理

### 次のステップ

ユーザー様の承認後、上記の手順で実装を進めます。
