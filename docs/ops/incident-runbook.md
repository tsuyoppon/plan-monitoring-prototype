# Incident Runbook (Plan Monitoring Prototype)

最終更新: 2026-04-01
対象: 本番運用時の障害切り分け、デプロイ後確認、再発防止

## 1. システム前提

- アプリ: Next.js (Pages Router) + TypeScript
- 認証: NextAuth (Credentials, JWT session)
- DB: PostgreSQL (Railway)
- ORM: Prisma
- 本番起動: standalone 構成

## 2. 障害の一次分類

まず、以下のどちらかに分類する。

- 502系: アプリ到達性/起動系の問題
- 401系 (`CredentialsSignin`): 認証情報不整合の問題

この分類を誤ると調査時間が大幅に増える。

## 3. 502系の標準対応

### 3.1 よくある原因

- start コマンドと standalone 運用の不整合
- bind 先不整合 (`HOSTNAME=0.0.0.0` 未設定)
- static/public 配信物の不足

### 3.2 確認手順

- Railway Deploy Logs で起動失敗有無を確認
- Railway HTTP Logs で全パス失敗になっていないか確認
- `/auth/login` と `/api/auth/csrf` の応答確認
- `/_next/static/chunks/*` が 404 になっていないか確認

### 3.3 修正時の要点

- standalone サーバー起動前提の start を維持
- `HOSTNAME=0.0.0.0` を維持
- `.next/static` と `public` の配信経路を維持

## 4. 401系の標準対応

### 4.1 よくある原因

- メールアドレス/パスワード誤り
- DBの `passwordHash` 不正 (形式/長さ)
- 環境変数不整合 (`NEXTAUTH_URL`, `NEXTAUTH_SECRET`)

### 4.2 確認手順

- `/api/auth/callback/credentials` のステータス確認
- 該当ユーザーの `isActive`, `email`, `passwordHash` を確認
- bcrypt hash の妥当性 (60文字) を確認
- 実際に参照されているDB接続先を確認

## 5. デプロイ前後チェックリスト

### 5.1 デプロイ前

- 環境変数が対象環境向けであること
- `DATABASE_URL` の向き先確認
- Prisma schema 変更時は migration/generate 実行
- `npm run build` 成功確認

### 5.2 デプロイ直後

- `/auth/login` が 200
- `/api/auth/csrf` が 200
- `/api/auth/session` が期待通り
- 主要 API (`/api/initiatives`, `/api/initiatives/{id}`) が正常
- static chunk が 200

## 6. DB/Prisma運用の注意

- schema変更後に client 未再生成だと実行時エラーが起こりうる
- migration適用先DBを誤ると「ローカルで正常/本番で異常」が発生する
- 変更後は API 実行ログで列不一致エラーの有無を必ず確認

## 7. 権限運用 (RBAC)

- viewer: 閲覧のみ
- editor: 進捗入力/編集のみ
- admin: 施策管理 + ユーザー管理

注意点:

- UI制御だけでなく API 側の `requireRole` が最終防衛線

## 8. 監視ログの見方

- 単発の `connection reset by peer` は一時的なことがある
- 同一時間帯で連続発生 + エンドポイント異常が重なる場合は調査対象
- Deploy Logs + HTTP Logs + DB状態をセットで見る

## 9. 既知の改善余地

- 施策APIの入力バリデーション強化
- progress log の整合性制約強化 (version/isLatest)
- callbackUrl のバリデーション強化
- 管理者アカウント復旧手順の明文化

## 10. 運用SOP (短縮版)

- 手順1: 502系/401系に分類
- 手順2: 該当分類のチェックリストを上から実施
- 手順3: 最小修正で復旧
- 手順4: `/auth/login`, `/api/auth/session`, `/_next/static/chunks/*` を再確認
- 手順5: 再発防止メモをこのRunbookに反映
