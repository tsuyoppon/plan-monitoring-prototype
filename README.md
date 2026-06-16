# Plan Monitoring Prototype

施策管理と進捗ログ管理のプロトタイプアプリケーション。

## 技術スタック
- Next.js (Pages Router)
- TypeScript
- Prisma
- PostgreSQL
- Tailwind CSS

## ローカル開発の起動方法

1. リポジトリをクローン
2. 依存関係をインストール
   ```bash
   npm install
   ```
3. 環境変数を設定
   `.env` ファイルを作成し、以下の変数を設定してください。
   ```env
   DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
   NEXTAUTH_SECRET="任意の長いランダム文字列"
   NEXTAUTH_URL="http://localhost:3000"
   SEED_ADMIN_EMAIL="admin@example.com"
   SEED_ADMIN_PASSWORD="8文字以上の初期管理者パスワード"
   RESEND_API_KEY="re_xxxxxxxxx"
   REMINDER_EMAIL_FROM="Plan Monitoring <noreply@example.com>"
   REMINDER_EMAIL_REPLY_TO="contact@example.com"
   ```
   `REMINDER_EMAIL_REPLY_TO` は任意です。リマインドメール配信には Resend のAPIキーと、Resendで認証済みドメインの送信元アドレスを設定してください。
4. データベースのマイグレーション
   ```bash
   npx prisma migrate dev --name init
   ```
5. 開発サーバーを起動
   ```bash
   npm run dev
   ```
6. ブラウザでアクセス
   http://localhost:3000/initiatives

## Railway デプロイ方法

1. GitHub リポジトリを Railway に接続
2. PostgreSQL サービスを作成し、アプリの `DATABASE_URL` に接続文字列を設定
3. Variables に以下を設定
   - `DATABASE_URL`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL`
   - `SEED_ADMIN_EMAIL`
   - `SEED_ADMIN_PASSWORD`
   - `RESEND_API_KEY`
   - `REMINDER_EMAIL_FROM`
   - `REMINDER_EMAIL_REPLY_TO`（任意）
4. Resend側で送信元ドメインを認証し、`REMINDER_EMAIL_FROM` には認証済みドメインのメールアドレスを設定
5. デプロイ後、本番DBへPrismaマイグレーションを適用

## ディレクトリ構造
- `pages/api`: API Routes (バックエンドロジック)
- `pages/initiatives`: フロントエンドページ
- `prisma`: DBスキーマ定義
- `lib`: ユーティリティ (Prisma Clientなど)
