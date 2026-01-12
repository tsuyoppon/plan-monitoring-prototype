import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Initiative } from '@/types';

const STATUS_LABELS = ['完了', '順調', '遅れあり', '未着手', '未設定'] as const;

type StatusLabel = typeof STATUS_LABELS[number];

const getStatusLabel = (initiative: Initiative): StatusLabel => {
  const status = initiative.progressLogs?.[0]?.progressStatus;
  return (status as StatusLabel) ?? '未設定';
};

export default function InitiativesSummary() {
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const fetchInitiatives = async () => {
      setIsLoading(true);
      setErrorMessage('');
      try {
        const res = await fetch('/api/initiatives');
        const data = await res.json();
        if (Array.isArray(data)) {
          setInitiatives(data);
        } else {
          setInitiatives([]);
          setErrorMessage('施策データの取得に失敗しました。');
        }
      } catch (error) {
        console.error('Failed to fetch initiatives:', error);
        setInitiatives([]);
        setErrorMessage('施策データの取得に失敗しました。');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitiatives();
  }, []);

  const domains = useMemo(() => {
    const uniqueDomains = new Set(
      initiatives.map((initiative) => initiative.domain).filter(Boolean)
    );
    return Array.from(uniqueDomains).sort((a, b) => a.localeCompare(b, 'ja'));
  }, [initiatives]);

  const matrix = useMemo(() => {
    const grouped: Record<string, Record<StatusLabel, Initiative[]>> = {};

    domains.forEach((domain) => {
      grouped[domain] = STATUS_LABELS.reduce((acc, status) => {
        acc[status] = [];
        return acc;
      }, {} as Record<StatusLabel, Initiative[]>);
    });

    initiatives.forEach((initiative) => {
      const domain = initiative.domain;
      if (!domain || !grouped[domain]) {
        return;
      }
      const statusLabel = getStatusLabel(initiative);
      grouped[domain][statusLabel].push(initiative);
    });

    return grouped;
  }, [domains, initiatives]);

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">進捗状況まとめ</h1>
          <p className="text-sm text-gray-600 mt-1">最新の進捗ステータスで施策を分類しています。</p>
        </div>
        <div className="flex gap-4 text-sm">
          <Link href="/initiatives" className="text-blue-600 hover:underline">
            施策一覧へ戻る
          </Link>
        </div>
      </div>

      {isLoading ? (
        <p className="text-gray-600">読み込み中...</p>
      ) : errorMessage ? (
        <p className="text-red-600">{errorMessage}</p>
      ) : initiatives.length === 0 ? (
        <p className="text-gray-600">施策が登録されていません。</p>
      ) : (
        <div className="overflow-auto border rounded-lg">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-3 py-2 text-left">進捗</th>
                {domains.map((domain) => (
                  <th key={domain} className="border px-3 py-2 text-left min-w-[160px]">
                    {domain}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {STATUS_LABELS.map((status) => (
                <tr key={status} className="align-top">
                  <td className="border px-3 py-2 font-semibold bg-gray-50 min-w-[140px]">
                    {status}
                  </td>
                  {domains.map((domain) => (
                    <td key={domain} className="border px-3 py-2 min-w-[200px]">
                      {matrix[domain][status].length === 0 ? (
                        <span className="text-gray-400">該当なし</span>
                      ) : (
                        <ul className="space-y-1">
                          {matrix[domain][status].map((initiative) => (
                            <li key={initiative.id}>
                              <Link
                                href={`/initiatives/${initiative.id}`}
                                className="text-blue-600 hover:underline"
                              >
                                {initiative.measureName}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
