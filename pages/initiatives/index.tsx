import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Initiative } from '@/types';

export default function InitiativesList() {
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [searchParams, setSearchParams] = useState({
    domain: '',
    department: '',
    measureName: '',
    status: '',
  });

  const fetchInitiatives = (params = {}) => {
    const query = new URLSearchParams(params).toString();
    fetch(`/api/initiatives?${query}`)
      .then((res) => res.json())
      .then((data) => setInitiatives(data));
  };

  useEffect(() => {
    fetchInitiatives();
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setSearchParams({ ...searchParams, [e.target.name]: e.target.value });
  };

  const handleSearch = () => {
    // Remove empty params
    const params = Object.fromEntries(
      Object.entries(searchParams).filter(([_, v]) => v !== '')
    );
    fetchInitiatives(params);
  };

  const handleReset = () => {
    setSearchParams({
      domain: '',
      department: '',
      measureName: '',
      status: '',
    });
    fetchInitiatives();
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">施策一覧</h1>
      
      <div className="bg-gray-100 p-4 rounded mb-6">
        <h2 className="font-bold mb-2">検索条件</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <input
            type="text"
            name="domain"
            placeholder="ドメイン"
            value={searchParams.domain}
            onChange={handleSearchChange}
            className="border p-2 rounded"
          />
          <input
            type="text"
            name="department"
            placeholder="部署"
            value={searchParams.department}
            onChange={handleSearchChange}
            className="border p-2 rounded"
          />
          <input
            type="text"
            name="measureName"
            placeholder="施策名"
            value={searchParams.measureName}
            onChange={handleSearchChange}
            className="border p-2 rounded"
          />
          <select
            name="status"
            value={searchParams.status}
            onChange={handleSearchChange}
            className="border p-2 rounded"
          >
            <option value="">ステータス（全て）</option>
            <option value="順調">順調</option>
            <option value="遅れあり">遅れあり</option>
            <option value="未着手">未着手</option>
            <option value="完了">完了</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSearch} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            検索
          </button>
          <button onClick={handleReset} className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">
            全表示（リセット）
          </button>
        </div>
      </div>

      <Link href="/initiatives/new" className="bg-green-500 text-white px-4 py-2 rounded mb-4 inline-block">
        新規施策作成
      </Link>
      <div className="grid gap-4">
        {initiatives.map((initiative) => (
          <div key={initiative.id} className="border p-4 rounded shadow bg-white">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-semibold">
                  <Link href={`/initiatives/${initiative.id}`} className="text-blue-600 hover:underline">
                    {initiative.measureName}
                  </Link>
                </h2>
                <p className="text-gray-600">ドメイン: {initiative.domain}</p>
                <p className="text-gray-600">部署: {initiative.department}</p>
              </div>
              {initiative.progressLogs && initiative.progressLogs.length > 0 && (
                <span className="bg-gray-200 px-2 py-1 rounded text-sm">
                  {initiative.progressLogs[0].progressStatus}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
