import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Initiative } from '@/types';

type FetchParams = Record<string, string>;

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
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);

  const fetchInitiatives = useCallback(async (params: FetchParams = {}) => {
    const requestParams = { ...params };
    // If showing deleted items, add deleted=true to params
    if (showDeleted) {
      requestParams.deleted = 'true';
    }
    const query = new URLSearchParams(requestParams).toString();
    console.log('Fetching initiatives with params:', requestParams); // Debug log

    try {
      const res = await fetch(`/api/initiatives?${query}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setInitiatives(data);

        // Update options only when fetching full list (no search filters)
        // Check if any search related keys are present in the original params
        // Note: 'deleted' is a view mode, not a search filter for this purpose
        const searchFilters = { ...requestParams };
        delete searchFilters.deleted;
        if (Object.keys(searchFilters).length === 0) {
          const uniqueDomains = Array.from(new Set(data.map((item: Initiative) => item.domain).filter(Boolean))) as string[];
          const uniqueDepartments = Array.from(new Set(data.map((item: Initiative) => item.department).filter(Boolean))) as string[];
          setDomainOptions(uniqueDomains);
          setDepartmentOptions(uniqueDepartments);
        }

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
  }, [showDeleted]);

  useEffect(() => {
  // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchInitiatives();
  }, [fetchInitiatives]); // Re-fetch when showDeleted changes

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setSearchParams({ ...searchParams, [e.target.name]: e.target.value });
  };

  const handleSearch = () => {
    // Remove empty params
    const params = Object.fromEntries(
      Object.entries(searchParams).filter(([, value]) => value !== '')
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
    // We need to pass empty params explicitly, but fetchInitiatives handles showDeleted internally
    fetchInitiatives({});
  };

  const handleDelete = async (id: number) => {
    if (!confirm('本当にこの施策を削除しますか？')) return;
    try {
      const res = await fetch(`/api/initiatives/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchInitiatives(searchParams);
      } else {
        alert('削除に失敗しました');
      }
    } catch (error) {
      console.error(error);
      alert('削除に失敗しました');
    }
  };

  const handleRestore = async (id: number) => {
    if (!confirm('この施策を復元しますか？')) return;
    try {
      const res = await fetch(`/api/initiatives/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true }),
      });
      if (res.ok) {
        fetchInitiatives(searchParams);
      } else {
        alert('復元に失敗しました');
      }
    } catch (error) {
      console.error(error);
      alert('復元に失敗しました');
    }
  };

  const toggleDeleteMode = () => {
    setIsDeleteMode(!isDeleteMode);
    setShowDeleted(false); // Exit trash view if entering delete mode
  };

  const toggleTrashView = () => {
    setShowDeleted(!showDeleted);
    setIsDeleteMode(false); // Exit delete mode if entering trash view
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
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">
          {showDeleted ? 'ゴミ箱（削除済み施策）' : '施策一覧'}
        </h1>
        <div className="flex gap-2">
          {!showDeleted && (
            <Link
              href="/initiatives/summary"
              className="px-4 py-2 rounded text-white bg-blue-600 hover:bg-blue-700"
            >
              進捗状況まとめ
            </Link>
          )}
          {!showDeleted && (
            <button
              onClick={toggleDeleteMode}
              className={`px-4 py-2 rounded text-white ${
                isDeleteMode ? 'bg-red-600' : 'bg-gray-500 hover:bg-gray-600'
              }`}
            >
              {isDeleteMode ? '削除モード終了' : '施策の削除'}
            </button>
          )}
          <button
            onClick={toggleTrashView}
            className={`px-4 py-2 rounded text-white ${
              showDeleted ? 'bg-blue-600' : 'bg-gray-500 hover:bg-gray-600'
            }`}
          >
            {showDeleted ? '一覧に戻る' : 'ゴミ箱を見る'}
          </button>
        </div>
      </div>
      
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
          <div key={initiative.id} className="border p-4 rounded shadow bg-white relative">
            {isDeleteMode && !showDeleted && (
              <button
                onClick={() => handleDelete(initiative.id)}
                className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 z-10"
              >
                削除
              </button>
            )}
            {showDeleted && (
              <button
                onClick={() => handleRestore(initiative.id)}
                className="absolute top-4 right-4 bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 z-10"
              >
                復元
              </button>
            )}
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
