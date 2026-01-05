# npm OIDC + semantic-release 統合修正プラン

## 問題の本質

- npm classic tokens は 2025/12/9 に廃止済み
- OIDC Trusted Publishing が推奨される認証方法
- semantic-release の `@semantic-release/npm` プラグインが OIDC トークンを正しく npm CLI に渡せていない
- `setup-node@v6` が生成する `.npmrc` が OIDC に対応していない

## 調査結果

### 成功している部分
- OIDC token exchange は成功 (`verifyConditions` ステップ)
- `id-token: write` permission は正しく設定済み
- npm Trusted Publisher の設定も完了済み

### 失敗している部分
- `npm publish` 実行時に ENEEDAUTH エラー
- semantic-release が npm CLI を呼び出す際、OIDC 認証情報が渡らない

## 根本原因

`@semantic-release/npm` プラグインは npm CLI を `execa` で呼び出しますが：

```javascript
npm publish <path> --userconfig <temp-npmrc> --tag latest --registry 'https://registry.npmjs.org/'
```

この `temp-npmrc` に OIDC 設定が含まれていない可能性があります。

## 解決策オプション

### オプション A: setup-node を使わず、手動で npm 設定

```yaml
- name: Setup Node.js
  uses: actions/setup-node@v6
  with:
    node-version: 22
    # registry-url を削除（.npmrc 生成を防ぐ）

- name: Configure npm for OIDC
  run: |
    echo "//registry.npmjs.org/:_authToken=\${NPM_TOKEN}" > .npmrc
    echo "provenance=true" >> .npmrc
  env:
    NPM_TOKEN: ${{ secrets.NPM_TOKEN }}  # ← これは OIDC では使えない
```

**問題**: OIDC では `NPM_TOKEN` secret が不要なはずだが、npm CLI はトークンを要求する

### オプション B: semantic-release を諦め、手動 publish

```yaml
- name: Get version from package.json
  id: version
  run: echo "version=$(node -p "require('./package.json').version")" >> $GITHUB_OUTPUT

- name: Create tag
  run: |
    git tag v${{ steps.version.outputs.version }}
    git push origin v${{ steps.version.outputs.version }}

- name: Publish to npm
  run: npm publish --provenance --access public
```

**問題**: semantic-release の自動バージョニング機能を失う

### オプション C: semantic-release/exec を使用してカスタム publish

`.releaserc.json` を修正：

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

**メリット**: semantic-release のバージョニング機能を維持しつつ、npm publish を制御可能

### オプション D: Granular Access Token を使用（暫定対応）

npm で granular access token を作成し、GitHub Secrets に保存：

```yaml
- name: Setup Node.js
  uses: actions/setup-node@v6
  with:
    node-version: 22
    registry-url: 'https://registry.npmjs.org'

- name: Release
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
  run: npx semantic-release
```

**メリット**: 既存の semantic-release 設定がそのまま動く
**デメリット**: OIDC の利点（トークン管理不要）を失う、90日ごとに更新必要

## 推奨アプローチ

**オプション C: semantic-release/exec を使用**

理由：
1. semantic-release の自動バージョニング機能を維持
2. npm publish コマンドを直接制御可能
3. `--provenance` フラグを明示的に渡せる
4. OIDC 認証を活用できる

## 実装手順

1. `@semantic-release/exec` をインストール
2. `.releaserc.json` を修正して publish ステップを override
3. npm の `@semantic-release/npm` プラグインは prepare（package.json 更新）のみ使用
4. 実際の publish は `@semantic-release/exec` で実行

## 検証方法

1. PR をマージして Release workflow をトリガー
2. semantic-release が version を決定
3. `@semantic-release/npm` が package.json を更新
4. `@semantic-release/exec` が `npm publish --provenance` を実行
5. OIDC 認証で npm に publish 成功

## 代替案（オプション D）

OIDC がどうしても動かない場合、暫定対応として Granular Access Token を使用。
- npm で token 作成: https://www.npmjs.com/settings/~/tokens
- "Bypass 2FA for automation" を有効化
- Expiration を 90 days に設定
- GitHub Secrets に `NPM_TOKEN` として保存
