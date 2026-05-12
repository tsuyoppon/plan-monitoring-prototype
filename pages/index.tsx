import Link from 'next/link';

const referenceMaterialUrl = '/reference-materials/20260512Chukikeikaku_test.pdf';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <main className="flex flex-col items-center justify-center w-full flex-1 px-20 text-center">
        <h1 className="text-6xl font-bold leading-tight">
          <span className="block">日本バドミントン協会</span>
          <span className="block">中期計画進捗管理システム（β版）</span>
        </h1>

        <div className="mt-6 flex flex-col gap-2">
          <Link href="/initiatives" className="text-blue-600 hover:underline text-xl">
            施策一覧へ &rarr;
          </Link>
          <Link href="/initiatives/summary" className="text-blue-600 hover:underline text-xl">
            進捗状況まとめへ &rarr;
          </Link>
          <a
            href={referenceMaterialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline text-xl"
          >
            参考資料へ &rarr;
          </a>
        </div>
      </main>
    </div>
  );
}
