import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <main className="flex flex-col items-center justify-center w-full flex-1 px-20 text-center">
        <h1 className="text-6xl font-bold">
          Plan Monitoring Prototype
        </h1>

        <p className="mt-3 text-2xl">
          施策管理と進捗ログ管理
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <Link href="/initiatives" className="text-blue-600 hover:underline text-xl">
            施策一覧へ &rarr;
          </Link>
          <Link href="/initiatives/summary" className="text-blue-600 hover:underline text-xl">
            進捗状況まとめへ &rarr;
          </Link>
        </div>
      </main>
    </div>
  );
}
