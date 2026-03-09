import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

import { APP_ROLES, AppRole } from '@/types/auth';
import { AppUser } from '@/types';

type ApiError = {
  error?: string;
};

type CreateUserForm = {
  email: string;
  password: string;
  displayName: string;
  department: string;
  role: AppRole;
};

const initialCreateUserForm: CreateUserForm = {
  email: '',
  password: '',
  displayName: '',
  department: '',
  role: 'viewer',
};

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingById, setIsSavingById] = useState<Record<number, boolean>>({});
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [createForm, setCreateForm] = useState<CreateUserForm>(initialCreateUserForm);

  const myUserId = session?.user.id;

  const fetchUsers = useCallback(async () => {
    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/users');
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as ApiError;
        throw new Error(payload.error ?? 'ユーザー一覧の取得に失敗しました。');
      }

      const data = (await res.json()) as AppUser[];
      setUsers(data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'ユーザー一覧の取得に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => a.id - b.id);
  }, [users]);

  const updateUser = async (id: number, payload: Partial<Pick<AppUser, 'role' | 'isActive'>>) => {
    setErrorMessage('');
    setSuccessMessage('');
    setIsSavingById((prev) => ({ ...prev, [id]: true }));

    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as ApiError;
        throw new Error(data.error ?? 'ユーザー更新に失敗しました。');
      }

      const updated = (await res.json()) as AppUser;
      setUsers((prev) => prev.map((user) => (user.id === id ? updated : user)));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'ユーザー更新に失敗しました。');
    } finally {
      setIsSavingById((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleCreateChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setCreateForm((prev) => ({ ...prev, [name]: value }));
  };

  const createUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!createForm.email.trim() || !createForm.password.trim()) {
      setErrorMessage('メールアドレスとパスワードは必須です。');
      return;
    }

    if (createForm.password.length < 8) {
      setErrorMessage('パスワードは8文字以上で入力してください。');
      return;
    }

    setIsCreatingUser(true);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: createForm.email.trim(),
          password: createForm.password,
          displayName: createForm.displayName.trim() || null,
          department: createForm.department.trim() || null,
          role: createForm.role,
        }),
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as ApiError;
        throw new Error(payload.error ?? 'ユーザー作成に失敗しました。');
      }

      const createdUser = (await res.json()) as AppUser;
      setUsers((prev) => [...prev, createdUser]);
      setCreateForm(initialCreateUserForm);
      setSuccessMessage('ユーザーを作成しました。');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'ユーザー作成に失敗しました。');
    } finally {
      setIsCreatingUser(false);
    }
  };

  if (isLoading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ユーザー管理</h1>
          <p className="text-sm text-gray-600">管理者向け: 一覧・ロール変更・有効/無効</p>
        </div>
        <Link href="/initiatives" className="rounded border px-3 py-2 hover:bg-gray-100">
          施策一覧へ戻る
        </Link>
      </div>

      {errorMessage && <p className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p>}
      {successMessage && <p className="mb-4 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">{successMessage}</p>}

      <div className="mb-6 rounded border bg-white p-4">
        <h2 className="mb-3 text-lg font-semibold">ユーザー新規作成</h2>
        <form onSubmit={createUser} className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-gray-700">メールアドレス *</span>
            <input
              type="email"
              name="email"
              value={createForm.email}
              onChange={handleCreateChange}
              className="w-full rounded border px-3 py-2"
              required
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-gray-700">パスワード *</span>
            <input
              type="password"
              name="password"
              value={createForm.password}
              onChange={handleCreateChange}
              className="w-full rounded border px-3 py-2"
              minLength={8}
              required
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-gray-700">表示名</span>
            <input
              type="text"
              name="displayName"
              value={createForm.displayName}
              onChange={handleCreateChange}
              className="w-full rounded border px-3 py-2"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-gray-700">部署</span>
            <input
              type="text"
              name="department"
              value={createForm.department}
              onChange={handleCreateChange}
              className="w-full rounded border px-3 py-2"
            />
          </label>

          <label className="text-sm md:col-span-2">
            <span className="mb-1 block text-gray-700">ロール</span>
            <select
              name="role"
              value={createForm.role}
              onChange={handleCreateChange}
              className="w-full rounded border px-3 py-2 md:w-48"
            >
              {APP_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={isCreatingUser}
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCreatingUser ? '作成中...' : 'ユーザーを作成'}
            </button>
          </div>
        </form>
      </div>

      <div className="overflow-x-auto rounded border bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left">
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">メール</th>
              <th className="px-3 py-2">表示名</th>
              <th className="px-3 py-2">部署</th>
              <th className="px-3 py-2">ロール</th>
              <th className="px-3 py-2">有効</th>
            </tr>
          </thead>
          <tbody>
            {sortedUsers.map((user) => {
              const isSelf = user.id === myUserId;
              const isSaving = Boolean(isSavingById[user.id]);

              return (
                <tr key={user.id} className="border-b last:border-b-0">
                  <td className="px-3 py-2">{user.id}</td>
                  <td className="px-3 py-2">{user.email}</td>
                  <td className="px-3 py-2">{user.displayName || '-'}</td>
                  <td className="px-3 py-2">{user.department || '-'}</td>
                  <td className="px-3 py-2">
                    <select
                      value={user.role}
                      disabled={isSaving || isSelf}
                      className="rounded border px-2 py-1 disabled:bg-gray-100"
                      onChange={(event) => updateUser(user.id, { role: event.target.value as AppRole })}
                    >
                      {APP_ROLES.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={user.isActive}
                        disabled={isSaving || isSelf}
                        onChange={(event) => updateUser(user.id, { isActive: event.target.checked })}
                      />
                      <span>{user.isActive ? '有効' : '無効'}</span>
                    </label>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-gray-500">※ 自分自身のロール変更・無効化はできません。</p>
    </div>
  );
}
