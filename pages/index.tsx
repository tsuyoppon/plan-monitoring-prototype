import Link from 'next/link';

const referenceMaterialUrl = '/reference-materials/20260512Chukikeikaku_test.pdf';
const titleButtonClassName =
  'inline-flex h-14 w-72 items-center justify-center rounded-lg border border-gray-900 bg-white px-6 text-xl font-semibold text-gray-900 shadow-sm transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <main className="flex flex-col items-center justify-center w-full flex-1 px-20 text-center">
        <h1 className="text-6xl font-bold leading-tight">
          <span className="block">日本バドミントン協会</span>
          <span className="block">中期計画進捗管理システム（β版）</span>
        </h1>

        <div className="mt-8 flex flex-col items-center gap-4">
          <Link
            href="/initiatives"
            className={titleButtonClassName}
          >
            施策一覧へ &rarr;
          </Link>
          <Link
            href="/initiatives/summary"
            className={titleButtonClassName}
          >
            進捗状況まとめへ &rarr;
          </Link>
          <a
            href={referenceMaterialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={titleButtonClassName}
          >
            参考資料へ &rarr;
          </a>
        </div>
      </main>
    </div>
  );
}
