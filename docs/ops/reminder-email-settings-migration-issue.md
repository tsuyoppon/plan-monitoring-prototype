# リマインドメール設定取得失敗時の対応メモ

## 発生日

2026-06-18

## 事象

管理者向けのユーザー管理画面で、以下の表示不具合が発生した。

- リマインドメール定型文のサンプルが空になる
- メール送付先ユーザーの選択肢が表示されない
- 対象施策の選択肢が表示されない
- 画面上部に「リマインドメール設定の取得に失敗しました。」と表示される

## 原因

リマインドメール設定に件名を保存するため、`reminder_email_settings.subject` カラムを追加した。

対象環境の DB に以下の migration が未適用の状態でアプリだけが新しいコードになったため、`/api/admin/reminder/settings` が Prisma 経由で存在しない `subject` カラムを参照し、API が失敗した。

```text
prisma/migrations/20260618023000_add_reminder_email_subject/migration.sql
```

また、管理画面の初期表示では以下 3 つの API をまとめて取得していた。

- `/api/users`
- `/api/initiatives`
- `/api/admin/reminder/settings`

このうち settings API が失敗すると、ユーザー一覧と施策一覧の反映処理まで中断されていた。そのため、実際にはユーザー・施策 API が壊れていなくても、送付先ユーザーと対象施策の選択肢が空に見えた。

## 復旧方法

Railway の対象 Project / Environment / Service が正しいことを確認してから、Railway 環境上で migration を適用する。

```bash
railway status
railway run npx prisma migrate deploy
```

今回の復旧時は、以下の migration が適用されて解消した。

```text
Applying migration `20260618023000_add_reminder_email_subject`
All migrations have been successfully applied.
```

Prisma 実行時に以下の警告が出る場合があるが、migration 成功自体には影響しない。

```text
warn The configuration property `package.json#prisma` is deprecated and will be removed in Prisma 7.
warn The Prisma config file in prisma.config.ts overrides the deprecated `package.json#prisma` property in package.json.
```

## 再発防止として実装した内容

`pages/admin/users.tsx` で、リマインドメール設定の取得だけが失敗しても、ユーザー一覧と施策一覧は表示されるようにした。

- 定型文の初期値をクライアント側にも保持
- `/api/users` と `/api/initiatives` の成功時は先に state へ反映
- `/api/admin/reminder/settings` が失敗した場合は、定型文だけ初期値を表示し、送付先ユーザーと対象施策の選択は利用可能にする

`pages/api/admin/reminder/settings.ts` では、DB 例外時に JSON エラーを返すようにした。

- `GET` と `PUT` に `try/catch` を追加
- サーバーログに詳細を出力
- UI 側には日本語のエラーメッセージを返却

## 次回同様の問題が起きた場合の確認手順

1. 画面上部のエラーメッセージを確認する。
2. ブラウザの Network タブで失敗している API を確認する。
3. settings API だけが失敗している場合は、DB migration の未適用を疑う。
4. Railway の対象環境を確認する。

```bash
railway status
```

5. 未適用 migration を確認・適用する。

```bash
railway run npx prisma migrate status
railway run npx prisma migrate deploy
```

6. アプリを再読み込みして、定型文・送付先ユーザー・対象施策が表示されることを確認する。

## 注意点

本番または共有 DB に対しては、`npx prisma migrate dev` ではなく `npx prisma migrate deploy` を使う。

ローカルの `npx prisma migrate deploy` が接続先や環境変数の問題で失敗する場合は、Railway CLI 経由で対象環境の環境変数を使って実行する。
