# Release CI 修正とタグ管理プラン

**作成日**: 2026-01-05
**対象**: kitsunejs リポジトリのリリースCI改善

---

## 現状分析

### 確認した問題点

1. **Release ワークフローが失敗している**
   - 最新2回のワークフロー実行が失敗 (2025-12-28)
   - エラーメッセージ: "There are no relevant changes, so no new version is released."
   - semantic-release が新しいバージョンをリリースすべきコミットを検出できていない

2. **Git タグが存在しない**
   - `git tag --list` の結果が空
   - バージョン履歴が追跡できていない状態

3. **Biome 設定の警告**
   - `biome.json` のスキーマバージョンが 2.3.5 だが、CLI は 2.3.10
   - リリースには直接影響しないが修正すべき

4. **package.json のバージョンが 0.0.0**
   - semantic-release による自動バージョニングを想定しているが、初回タグがない

---

## 根本原因

### semantic-release の動作条件

semantic-release は以下の条件で動作します：

1. **初回リリース**: タグが存在しない場合、すべてのコミット履歴を分析
2. **2回目以降**: 最新タグ以降のコミットを分析

現在の状況：
- タグが存在しないため、全コミット履歴を分析
- しかし、最新の2つのコミットは `fix(ci):` で、すでにリリースが試みられた後
- semantic-release が「リリース対象のコミットがない」と判断している可能性

---

## 解決プラン

### オプション A: 手動で初回タグを作成 (推奨)

#### Pros
- シンプルで確実
- バージョン履歴の起点を明確に設定できる
- 過去のコミット履歴を含めるかどうかを制御可能

#### Cons
- 手動作業が必要

#### 手順

1. **Biome 設定を修正**
   ```bash
   # biome.json のスキーマバージョンを更新
   pnpm biome migrate --write
   ```

2. **初回タグを作成**
   ```bash
   # 現在の状態を v0.1.0 としてタグ付け
   git tag v0.1.0
   git push origin v0.1.0
   ```

3. **次回のコミットで自動リリース**
   - `feat:` または `fix:` のコミットをプッシュ
   - Release ワークフローが自動実行され、v0.2.0 または v0.1.1 をリリース

---

### オプション B: semantic-release の設定を調整

#### Pros
- 完全自動化

#### Cons
- 設定が複雑
- 初回リリースの挙動が不透明

#### 手順

1. **`.releaserc.json` に初回リリース設定を追加**
   ```json
   {
     "branches": ["master"],
     "tagFormat": "v${version}",
     "plugins": [
       ["@semantic-release/commit-analyzer", {
         "preset": "conventionalcommits",
         "releaseRules": [...],
         "parserOpts": {
           "noteKeywords": ["BREAKING CHANGE", "BREAKING CHANGES"]
         }
       }],
       ...
     ]
   }
   ```

2. **ダミーの feat コミットを追加**
   ```bash
   # 空コミットでトリガー
   git commit --allow-empty -m "feat: initialize semantic versioning"
   git push origin master
   ```

---

### オプション C: package.json のバージョンを基準にする

#### Pros
- package.json を信頼できる情報源とする

#### Cons
- semantic-release の完全自動化のメリットが減少

#### 手順

1. **package.json のバージョンを設定**
   ```json
   {
     "version": "0.1.0"
   }
   ```

2. **対応するタグを作成**
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```

---

## 推奨アプローチ: オプション A

理由：
- シンプルで理解しやすい
- バージョン履歴の起点を明確に制御できる
- semantic-release の通常動作に従う

---

## 実装手順 (詳細)

### ステップ 1: Biome 設定の修正

```bash
# スキーマバージョンを更新
pnpm biome migrate --write

# 修正を確認
pnpm lint

# コミット
git add biome.json
git commit -m "chore: update biome schema to 2.3.10"
```

### ステップ 2: 初回タグの作成

```bash
# タグを作成 (v0.1.0 を起点とする)
git tag -a v0.1.0 -m "chore: initial release tag for semantic-release"

# タグをプッシュ
git push origin v0.1.0

# タグが作成されたことを確認
git tag --list
```

**注意**: このタグはローカルのコミット (7bfab52) に付与されます。

### ステップ 3: Release ワークフローの動作確認

次回の `feat:` または `fix:` コミットで自動リリースが動作するはずです。

**テストコミット例**:
```bash
# テスト用の小さな変更
git commit --allow-empty -m "chore: test semantic-release workflow"
git push origin master
```

### ステップ 4: 動作確認

1. **GitHub Actions でワークフロー確認**
   ```bash
   gh run list --workflow=release.yaml --limit 3
   ```

2. **タグが作成されたか確認**
   ```bash
   git fetch --tags
   git tag --list
   ```

3. **GitHub Releases を確認**
   ```bash
   gh release list
   ```

---

## 追加の改善提案

### 1. CHANGELOG.md の初期化

現在 CHANGELOG.md が存在しない場合、semantic-release が自動生成します。
手動で初期ファイルを作成することも可能：

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
```

### 2. Release ワークフローの改善案

現在の設定で問題ないですが、以下の改善も検討可能：

```yaml
# .github/workflows/release.yaml

# オプション: ワークフロー実行条件を明確化
on:
  push:
    branches:
      - master
    paths-ignore:  # ドキュメントのみの変更ではトリガーしない
      - '**.md'
      - 'docs/**'
```

### 3. npm publish の確認

semantic-release は自動的に npm にパブリッシュしますが、以下を確認：

- npm レジストリの認証が正しく設定されている (OIDC)
- `package.json` の `publishConfig` が正しい
  ```json
  {
    "publishConfig": {
      "provenance": true,
      "access": "public"  // プライベートパッケージでない場合
    }
  }
  ```

### 4. タグフォーマットの統一

`.releaserc.json` にタグフォーマットを明示的に指定：

```json
{
  "branches": ["master"],
  "tagFormat": "v${version}",  // 明示的に v プレフィックスを指定
  "plugins": [...]
}
```

---

## チェックリスト

- [ ] Biome スキーマバージョンを 2.3.10 に更新
- [ ] 初回タグ v0.1.0 を作成
- [ ] タグをリモートにプッシュ
- [ ] テストコミットで Release ワークフローを確認
- [ ] GitHub Releases でリリースノートを確認
- [ ] npm レジストリにパッケージが公開されたか確認
- [ ] ローカルで `git tag --list` が正しく表示されるか確認

---

## トラブルシューティング

### 問題 1: semantic-release が "no new version" と表示

**原因**: 最新タグ以降にリリース対象のコミットがない

**解決**:
```bash
# feat または fix のコミットを作成
git commit --allow-empty -m "feat: trigger release"
git push origin master
```

### 問題 2: npm publish が失敗

**原因**: OIDC 認証が失敗している

**解決**:
1. GitHub の repository settings で OIDC が有効か確認
2. npm の Trusted Publishers 設定を確認![img.png](img.png)
3. `id-token: write` パーミッションが設定されているか確認

### 問題 3: タグが作成されるが GitHub Release が作成されない

**原因**: `@semantic-release/github` プラグインの設定問題

**解決**:
- `GITHUB_TOKEN` が正しく設定されているか確認
- `contents: write` パーミッションがあるか確認

---

## 参考資料

- [semantic-release ドキュメント](https://semantic-release.gitbook.io/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Actions - npm publish with provenance](https://docs.github.com/en/actions/publishing-packages/publishing-nodejs-packages)

---

## まとめ

1. **Biome 設定を修正** (警告を解消)
2. **初回タグ v0.1.0 を手動作成** (semantic-release の起点を設定)
3. **次回のコミットで自動リリースを確認** (正常動作を検証)

この順序で作業を進めることで、リリースCIが正常に動作し、タグによるバージョン管理が可能になります。
