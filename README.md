# Plan Monitoring Prototype

施策管理と進捗ログ管理のプロトタイプアプリケーション。

## 技術スタック
- Next.js (Pages Router)
- TypeScript
- Prisma
- Supabase (PostgreSQL)
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
   DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"
   NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT_REF].supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="[ANON_KEY]"
   ```
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

## Vercel デプロイ方法

1. GitHub リポジトリを Vercel にインポート
2. Build Settings はデフォルトのままでOK
   - Framework Preset: Next.js
   - Build Command: `next build` (または `npm run build`)
   - Install Command: `npm install`
3. Environment Variables に上記 `.env` と同じ変数を設定
   - `DATABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy

## ディレクトリ構造
- `pages/api`: API Routes (バックエンドロジック)
- `pages/initiatives`: フロントエンドページ
- `prisma`: DBスキーマ定義
- `lib`: ユーティリティ (Prisma Clientなど)
