import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type RouteTypeFilter = '' | 'page' | 'api';

type AccessFilters = {
  from: string;
  to: string;
  userId: string;
  routeType: RouteTypeFilter;
  path: string;
};

type AccessSummary = {
  kpis: {
    totalAccesses: number;
    activeUsers: number;
    apiErrors: number;
    latestAccessAt: string | null;
  };
  dailyAccesses: Array<{ date: string; total: number; page: number; api: number; errors: number }>;
  routeTypeCounts: Array<{ routeType: string; count: number }>;
  topPaths: Array<{ path: string; count: number }>;
  topUsers: Array<{
    userId: number | null;
    email: string | null;
    displayName: string | null;
    role: string | null;
    count: number;
  }>;
  userOptions: Array<{
    id: number;
    email: string;
    displayName: string | null;
    role: string;
    isActive: boolean;
  }>;
};

type AccessLog = {
  id: number;
  userId: number | null;
  emailSnapshot: string | null;
  displayNameSnapshot: string | null;
  roleSnapshot: string | null;
  method: string;
  path: string;
  routeType: string;
  statusCode: number | null;
  ipAddress: string | null;
  userAgent: string | null;
  referer: string | null;
  createdAt: string;
};

type AccessLogsResponse = {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  logs: AccessLog[];
};

type ApiError = {
  error?: string;
};

const PIE_COLORS = ['#2563eb', '#16a34a', '#f97316', '#dc2626'];

const toDateInputValue = (date: Date) => date.toISOString().slice(0, 10);

const getInitialFilters = (): AccessFilters => {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 29);

  return {
    from: toDateInputValue(from),
    to: toDateInputValue(to),
    userId: '',
    routeType: '',
    path: '',
  };
};

const formatDateTime = (value: string | null) => {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value));
};

const getUserLabel = (user: {
  email?: string | null;
  displayName?: string | null;
  role?: string | null;
}) => {
  const name = user.displayName || user.email || '不明なユーザー';
  return user.role ? `${name} (${user.role})` : name;
};

const getStatusClassName = (statusCode: number | null) => {
  if (!statusCode) {
    return 'text-gray-500';
  }
  if (statusCode >= 500) {
    return 'font-semibold text-red-700';
  }
  if (statusCode >= 400) {
    return 'font-semibold text-orange-700';
  }
  return 'text-gray-700';
};

const buildQueryString = (filters: AccessFilters, page?: number) => {
  const params = new URLSearchParams();
  params.set('from', filters.from);
  params.set('to', filters.to);
  if (filters.userId) params.set('userId', filters.userId);
  if (filters.routeType) params.set('routeType', filters.routeType);
  if (filters.path.trim()) params.set('path', filters.path.trim());
  if (page) params.set('page', String(page));
  return params.toString();
};

export default function AdminAccessPage() {
  const [filters, setFilters] = useState<AccessFilters>(getInitialFilters);
  const [appliedFilters, setAppliedFilters] = useState<AccessFilters>(getInitialFilters);
  const [summary, setSummary] = useState<AccessSummary | null>(null);
  const [logsResponse, setLogsResponse] = useState<AccessLogsResponse | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const selectedUser = useMemo(() => {
    if (!summary || !appliedFilters.userId) {
      return null;
    }

    return summary.userOptions.find((user) => String(user.id) === appliedFilters.userId) ?? null;
  }, [summary, appliedFilters.userId]);

  const fetchAccessData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const queryString = buildQueryString(appliedFilters, page);
      const [summaryRes, logsRes] = await Promise.all([
        fetch(`/api/admin/access/summary?${queryString}`),
        fetch(`/api/admin/access/logs?${queryString}`),
      ]);

      if (!summaryRes.ok) {
        const payload = (await summaryRes.json().catch(() => ({}))) as ApiError;
        throw new Error(payload.error ?? 'アクセス集計の取得に失敗しました。');
      }
      if (!logsRes.ok) {
        const payload = (await logsRes.json().catch(() => ({}))) as ApiError;
        throw new Error(payload.error ?? '詳細アクセスログの取得に失敗しました。');
      }

      setSummary((await summaryRes.json()) as AccessSummary);
      setLogsResponse((await logsRes.json()) as AccessLogsResponse);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'アクセス管理データの取得に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  }, [appliedFilters, page]);

  useEffect(() => {
    fetchAccessData();
  }, [fetchAccessData]);

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setAppliedFilters(filters);
  };

  const resetFilters = () => {
    const initialFilters = getInitialFilters();
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
    setPage(1);
  };

  return (
    <div className="mx-auto max-w-7xl p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">アクセス管理</h1>
          <p className="text-sm text-gray-600">管理者向け: 利用状況・ユーザー別アクセス・詳細ログ</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/users" className="rounded border px-3 py-2 text-sm hover:bg-gray-100">
            ユーザー管理
          </Link>
          <Link href="/initiatives" className="rounded border px-3 py-2 text-sm hover:bg-gray-100">
            施策一覧へ戻る
          </Link>
        </div>
      </div>

      {errorMessage && <p className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p>}

      <form onSubmit={applyFilters} className="mb-6 rounded border bg-white p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
          <label className="text-sm">
            <span className="mb-1 block text-gray-700">開始日</span>
            <input
              type="date"
              value={filters.from}
              onChange={(event) => setFilters((prev) => ({ ...prev, from: event.target.value }))}
              className="w-full rounded border px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-gray-700">終了日</span>
            <input
              type="date"
              value={filters.to}
              onChange={(event) => setFilters((prev) => ({ ...prev, to: event.target.value }))}
              className="w-full rounded border px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-gray-700">ユーザー</span>
            <select
              value={filters.userId}
              onChange={(event) => setFilters((prev) => ({ ...prev, userId: event.target.value }))}
              className="w-full rounded border px-3 py-2"
            >
              <option value="">すべて</option>
              {summary?.userOptions.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.displayName || user.email} ({user.role}){user.isActive ? '' : ' / 無効'}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-gray-700">種別</span>
            <select
              value={filters.routeType}
              onChange={(event) => setFilters((prev) => ({ ...prev, routeType: event.target.value as RouteTypeFilter }))}
              className="w-full rounded border px-3 py-2"
            >
              <option value="">すべて</option>
              <option value="page">ページ</option>
              <option value="api">API</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-gray-700">パス検索</span>
            <input
              type="search"
              value={filters.path}
              onChange={(event) => setFilters((prev) => ({ ...prev, path: event.target.value }))}
              className="w-full rounded border px-3 py-2"
              placeholder="/initiatives"
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
            集計を更新
          </button>
          <button type="button" onClick={resetFilters} className="rounded border px-4 py-2 text-sm hover:bg-gray-100">
            リセット
          </button>
        </div>
      </form>

      {isLoading && <p className="mb-4 rounded border bg-white p-4 text-sm text-gray-600">Loading...</p>}

      {summary && (
        <>
          <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="rounded border bg-white p-4">
              <p className="text-sm text-gray-500">総アクセス数</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{summary.kpis.totalAccesses.toLocaleString()}</p>
            </div>
            <div className="rounded border bg-white p-4">
              <p className="text-sm text-gray-500">アクティブユーザー</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{summary.kpis.activeUsers.toLocaleString()}</p>
            </div>
            <div className="rounded border bg-white p-4">
              <p className="text-sm text-gray-500">APIエラー</p>
              <p className="mt-2 text-3xl font-bold text-red-700">{summary.kpis.apiErrors.toLocaleString()}</p>
            </div>
            <div className="rounded border bg-white p-4">
              <p className="text-sm text-gray-500">最終アクセス</p>
              <p className="mt-2 text-base font-semibold text-gray-900">{formatDateTime(summary.kpis.latestAccessAt)}</p>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
            <section className="rounded border bg-white p-4">
              <h2 className="mb-3 text-lg font-semibold">日別アクセス推移</h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={summary.dailyAccesses}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="page" name="ページ" stroke="#2563eb" strokeWidth={2} />
                    <Line type="monotone" dataKey="api" name="API" stroke="#16a34a" strokeWidth={2} />
                    <Line type="monotone" dataKey="errors" name="エラー" stroke="#dc2626" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="rounded border bg-white p-4">
              <h2 className="mb-3 text-lg font-semibold">ページ/API 比率</h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={summary.routeTypeCounts} dataKey="count" nameKey="routeType" outerRadius={95} label>
                      {summary.routeTypeCounts.map((entry, index) => (
                        <Cell key={entry.routeType} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="rounded border bg-white p-4">
              <h2 className="mb-3 text-lg font-semibold">ユーザー別アクセス数</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary.topUsers.map((user) => ({ ...user, name: getUserLabel(user) }))} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" name="アクセス数" fill="#2563eb" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="rounded border bg-white p-4">
              <h2 className="mb-3 text-lg font-semibold">アクセス先上位</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary.topPaths} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis dataKey="path" type="category" width={180} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" name="アクセス数" fill="#16a34a" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          {selectedUser && (
            <section className="mb-6 rounded border bg-white p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold">個別ユーザー分析</h2>
                  <p className="text-sm text-gray-600">
                    {selectedUser.displayName || selectedUser.email} ({selectedUser.email}) / {selectedUser.role}
                  </p>
                </div>
                <span className="rounded border px-3 py-1 text-sm text-gray-700">
                  {selectedUser.isActive ? '有効' : '無効'}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={summary.dailyAccesses}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="total" name="アクセス数" stroke="#2563eb" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50 text-left">
                        <th className="px-3 py-2">よく使う画面/API</th>
                        <th className="px-3 py-2">回数</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.topPaths.slice(0, 6).map((path) => (
                        <tr key={path.path} className="border-b last:border-b-0">
                          <td className="max-w-md break-all px-3 py-2">{path.path}</td>
                          <td className="px-3 py-2">{path.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}
        </>
      )}

      <section className="rounded border bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4">
          <div>
            <h2 className="text-lg font-semibold">詳細アクセスログ</h2>
            <p className="text-sm text-gray-600">
              {logsResponse ? `${logsResponse.total.toLocaleString()}件中 ${logsResponse.logs.length}件を表示` : 'ログを取得中'}
            </p>
          </div>
          {logsResponse && (
            <div className="flex items-center gap-2 text-sm">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={logsResponse.page <= 1}
                className="rounded border px-3 py-1 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                前へ
              </button>
              <span>
                {logsResponse.page} / {logsResponse.totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(logsResponse.totalPages, prev + 1))}
                disabled={logsResponse.page >= logsResponse.totalPages}
                className="rounded border px-3 py-1 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                次へ
              </button>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left">
                <th className="px-3 py-2">日時</th>
                <th className="px-3 py-2">ユーザー</th>
                <th className="px-3 py-2">種別</th>
                <th className="px-3 py-2">メソッド</th>
                <th className="px-3 py-2">パス</th>
                <th className="px-3 py-2">ステータス</th>
                <th className="px-3 py-2">IP</th>
                <th className="px-3 py-2">User-Agent</th>
              </tr>
            </thead>
            <tbody>
              {logsResponse?.logs.map((log) => (
                <tr key={log.id} className="border-b align-top last:border-b-0">
                  <td className="whitespace-nowrap px-3 py-2">{formatDateTime(log.createdAt)}</td>
                  <td className="min-w-48 px-3 py-2">{getUserLabel({ email: log.emailSnapshot, displayName: log.displayNameSnapshot, role: log.roleSnapshot })}</td>
                  <td className="px-3 py-2">{log.routeType === 'page' ? 'ページ' : 'API'}</td>
                  <td className="px-3 py-2">{log.method}</td>
                  <td className="max-w-md break-all px-3 py-2">{log.path}</td>
                  <td className={`px-3 py-2 ${getStatusClassName(log.statusCode)}`}>{log.statusCode ?? '-'}</td>
                  <td className="whitespace-nowrap px-3 py-2">{log.ipAddress ?? '-'}</td>
                  <td className="max-w-lg break-all px-3 py-2 text-xs text-gray-600">{log.userAgent ?? '-'}</td>
                </tr>
              ))}
              {logsResponse?.logs.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-gray-500">
                    条件に一致するアクセスログはありません。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
