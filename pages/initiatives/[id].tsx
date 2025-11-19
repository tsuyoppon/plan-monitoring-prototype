import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Initiative } from '@/types';

export default function InitiativeDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [initiative, setInitiative] = useState<Initiative | null>(null);

  useEffect(() => {
    if (id) {
      fetch(`/api/initiatives/${id}`)
        .then((res) => res.json())
        .then((data) => setInitiative(data));
    }
  }, [id]);

  if (!initiative) return <div>Loading...</div>;

  const latestLog = initiative.progressLogs?.[0];

  return (
    <div className="container mx-auto p-4">
      <Link href="/initiatives" className="text-blue-500 mb-4 inline-block">&larr; 一覧に戻る</Link>
      <h1 className="text-2xl font-bold mb-4">{initiative.measureName}</h1>
      
      <div className="bg-white shadow rounded p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">基本情報</h2>
        <div className="grid grid-cols-2 gap-4">
          <div><span className="font-bold">ドメイン:</span> {initiative.domain}</div>
          <div><span className="font-bold">部署:</span> {initiative.department}</div>
          <div><span className="font-bold">期間:</span> {initiative.startDate?.split('T')[0]} 〜 {initiative.endDate?.split('T')[0]}</div>
          <div><span className="font-bold">KPI:</span> {initiative.kpi}</div>
          <div className="col-span-2"><span className="font-bold">詳細:</span> {initiative.detail}</div>
          <div className="col-span-2"><span className="font-bold">ゴール:</span> {initiative.goal}</div>
        </div>
      </div>

      <div className="bg-white shadow rounded p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">最新進捗</h2>
          <Link href={`/initiatives/${initiative.id}/progress/new`} className="bg-green-500 text-white px-4 py-2 rounded">
            進捗を追加
          </Link>
        </div>
        
        {latestLog ? (
          <div className="space-y-2">
            <div><span className="font-bold">年度/四半期:</span> {latestLog.fiscalYear}年度 Q{latestLog.fiscalQuarter}</div>
            <div><span className="font-bold">ステータス:</span> {latestLog.progressStatus}</div>
            <div><span className="font-bold">評価:</span> {latestLog.progressEvaluation}</div>
            <div><span className="font-bold">次のアクション:</span> {latestLog.nextAction}</div>
            <div><span className="font-bold">期限:</span> {latestLog.nextActionDueDate?.split('T')[0]}</div>
          </div>
        ) : (
          <p className="text-gray-500">進捗ログはまだありません。</p>
        )}
      </div>
    </div>
  );
}
