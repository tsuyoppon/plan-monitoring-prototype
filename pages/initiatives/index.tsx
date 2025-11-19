import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Initiative } from '@/types';

export default function InitiativesList() {
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);

  useEffect(() => {
    fetch('/api/initiatives')
      .then((res) => res.json())
      .then((data) => setInitiatives(data));
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">施策一覧</h1>
      <Link href="/initiatives/new" className="bg-blue-500 text-white px-4 py-2 rounded mb-4 inline-block">
        新規施策作成
      </Link>
      <div className="grid gap-4">
        {initiatives.map((initiative) => (
          <div key={initiative.id} className="border p-4 rounded shadow">
            <h2 className="text-xl font-semibold">
              <Link href={`/initiatives/${initiative.id}`} className="text-blue-600 hover:underline">
                {initiative.measureName}
              </Link>
            </h2>
            <p className="text-gray-600">ドメイン: {initiative.domain}</p>
            <p className="text-gray-600">部署: {initiative.department}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
