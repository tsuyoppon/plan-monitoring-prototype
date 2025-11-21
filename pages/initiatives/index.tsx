import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Initiative } from '@/types';

export default function InitiativesList() {
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [domainOptions, setDomainOptions] = useState<string[]>([]);
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);
  const [searchParams, setSearchParams] = useState({
    domain: '',
    department: '',
    measureName: '',
    status: '',
  });
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: '',
    direction: 'asc',
  });

  const fetchInitiatives = async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    try {
      const res = await fetch(`/api/initiatives?${query}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setInitiatives(data);
        return data;
      } else {
        console.error('Failed to fetch initiatives:', data);
        setInitiatives([]);
        return [];
      }
    } catch (error) {
      console.error('Error fetching initiatives:', error);
      setInitiatives([]);
      return [];
    }
  };

  useEffect(() => {
    fetchInitiatives().then((data) => {
      if (data && data.length > 0) {
        const domains = Array.from(new Set(data.map((i: Initiative) => i.domain).filter(Boolean))) as string[];
        const departments = Array.from(new Set(data.map((i: Initiative) => i.department).filter(Boolean))) as string[];
        setDomainOptions(domains);
        setDepartmentOptions(departments);
      }
    });
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

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSortConfig((prev) => ({ ...prev, [name]: value }));
  };

  const sortedInitiatives = [...initiatives].sort((a, b) => {
    if (!sortConfig.key) return 0;

    let aValue: string | undefined = '';
    let bValue: string | undefined = '';

    if (sortConfig.key === 'domain') {
      aValue = a.domain || '';
      bValue = b.domain || '';
    } else if (sortConfig.key === 'department') {
      aValue = a.department || '';
      bValue = b.department || '';
    } else if (sortConfig.key === 'status') {
      aValue = a.progressLogs?.[0]?.progressStatus || '';
      bValue = b.progressLogs?.[0]?.progressStatus || '';
    }

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">施策一覧</h1>
      
      <div className="bg-gray-100 p-4 rounded mb-6">
        <div className="mb-4 border-b border-gray-300 pb-4">
          <h2 className="font-bold mb-2">並び替え</h2>
          <div className="flex gap-4">
            <select
              name="key"
              value={sortConfig.key}
              onChange={handleSortChange}
              className="border p-2 rounded"
            >
              <option value="">並び替えキーを選択</option>
              <option value="domain">領域</option>
              <option value="department">担当</option>
              <option value="status">ステータス</option>
            </select>
            <select
              name="direction"
              value={sortConfig.direction}
              onChange={handleSortChange}
              className="border p-2 rounded"
            >
              <option value="asc">昇順</option>
              <option value="desc">降順</option>
            </select>
          </div>
        </div>

        <h2 className="font-bold mb-2">検索条件</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <select
            name="domain"
            value={searchParams.domain}
            onChange={handleSearchChange}
            className="border p-2 rounded"
          >
            <option value="">領域（全て）</option>
            {domainOptions.map((domain) => (
              <option key={domain} value={domain}>
                {domain}
              </option>
            ))}
          </select>
          <select
            name="department"
            value={searchParams.department}
            onChange={handleSearchChange}
            className="border p-2 rounded"
          >
            <option value="">担当（全て）</option>
            {departmentOptions.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
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
        {sortedInitiatives.map((initiative) => (
          <div key={initiative.id} className="border p-4 rounded shadow bg-white">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-semibold">
                  <Link href={`/initiatives/${initiative.id}`} className="text-blue-600 hover:underline">
                    {initiative.measureName}
                  </Link>
                </h2>
                <p className="text-gray-600">領域: {initiative.domain}</p>
                <p className="text-gray-600">担当: {initiative.department}</p>
              </div>
              {initiative.progressLogs && initiative.progressLogs.length > 0 && (
                <div className="flex flex-col items-end gap-1">
                  <span className="bg-gray-200 px-2 py-1 rounded text-sm">
                    {initiative.progressLogs[0].progressStatus}
                  </span>
                  <span className="text-xs text-gray-500">
                    {initiative.progressLogs[0].fiscalYear}年 {initiative.progressLogs[0].fiscalQuarter}Q
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
