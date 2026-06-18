import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

import { APP_ROLES, AppRole } from '@/types/auth';
import { AppUser, Initiative } from '@/types';

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

type ReminderSettings = {
  subject: string;
  introText: string;
  closingText: string;
};

type ReminderForm = {
  userId: string;
  initiativeIds: string[];
};

type ReminderPreview = {
  subject: string;
  body: string;
  recipientName: string;
  recipientEmail: string;
  initiativeCount: number;
};

type EditUserForm = {
  email: string;
  password: string;
  displayName: string;
  department: string;
  role: AppRole;
  isActive: boolean;
};

const initialCreateUserForm: CreateUserForm = {
  email: '',
  password: '',
  displayName: '',
  department: '',
  role: 'viewer',
};

const DEFAULT_REMINDER_SUBJECT = '【リマインド】施策の最新進捗状況';
const DEFAULT_REMINDER_INTRO_TEXT = '以下の施策について、最新の進捗状況をお知らせします。内容をご確認ください。';
const DEFAULT_REMINDER_CLOSING_TEXT = '以上、よろしくお願いいたします。\nお問い合わせ先: monitoring@example.com';

const initialReminderSettings: ReminderSettings = {
  subject: DEFAULT_REMINDER_SUBJECT,
  introText: DEFAULT_REMINDER_INTRO_TEXT,
  closingText: DEFAULT_REMINDER_CLOSING_TEXT,
};

const initialReminderForm: ReminderForm = {
  userId: '',
  initiativeIds: [],
};

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [reminderSettings, setReminderSettings] = useState<ReminderSettings>(initialReminderSettings);
  const [reminderForm, setReminderForm] = useState<ReminderForm>(initialReminderForm);
  const [reminderPreview, setReminderPreview] = useState<ReminderPreview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingById, setIsSavingById] = useState<Record<number, boolean>>({});
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [isSavingReminderSettings, setIsSavingReminderSettings] = useState(false);
  const [isPreviewingReminder, setIsPreviewingReminder] = useState(false);
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [createForm, setCreateForm] = useState<CreateUserForm>(initialCreateUserForm);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditUserForm | null>(null);
  const [showEditPassword, setShowEditPassword] = useState(false);

  const myUserId = session?.user.id;

  const fetchAdminData = useCallback(async () => {
    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      const [usersRes, initiativesRes, settingsRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/initiatives'),
        fetch('/api/admin/reminder/settings'),
      ]);

      if (!usersRes.ok) {
        const payload = (await usersRes.json().catch(() => ({}))) as ApiError;
        throw new Error(payload.error ?? 'ユーザー一覧の取得に失敗しました。');
      }
      if (!initiativesRes.ok) {
        const payload = (await initiativesRes.json().catch(() => ({}))) as ApiError;
        throw new Error(payload.error ?? '施策一覧の取得に失敗しました。');
      }
      setUsers((await usersRes.json()) as AppUser[]);
      setInitiatives((await initiativesRes.json()) as Initiative[]);

      if (!settingsRes.ok) {
        const payload = (await settingsRes.json().catch(() => ({}))) as ApiError;
        setReminderSettings(initialReminderSettings);
        setErrorMessage(payload.error ?? 'リマインドメール設定の取得に失敗しました。定型文は初期値を表示しています。');
        return;
      }

      setReminderSettings((await settingsRes.json()) as ReminderSettings);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '管理者データの取得に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => a.id - b.id);
  }, [users]);

  const activeReminderUsers = useMemo(() => sortedUsers.filter((user) => user.isActive), [sortedUsers]);

  const sortedInitiatives = useMemo(() => {
    return [...initiatives].sort((a, b) => a.id - b.id);
  }, [initiatives]);

  const handleReminderSettingsChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setReminderSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleReminderUserChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setReminderPreview(null);
    setReminderForm((prev) => ({ ...prev, userId: event.target.value }));
  };

  const handleReminderInitiativeChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = event.target;
    setReminderPreview(null);
    setReminderForm((prev) => ({
      ...prev,
      initiativeIds: checked ? [...prev.initiativeIds, value] : prev.initiativeIds.filter((id) => id !== value),
    }));
  };

  const saveReminderSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!reminderSettings.subject.trim() || !reminderSettings.introText.trim() || !reminderSettings.closingText.trim()) {
      setErrorMessage('メールタイトル、案内文、末尾文・問い合わせ先は必須です。');
      return;
    }

    setIsSavingReminderSettings(true);
    try {
      const res = await fetch('/api/admin/reminder/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reminderSettings),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as ApiError;
        throw new Error(payload.error ?? 'リマインドメール設定の保存に失敗しました。');
      }
      setReminderSettings((await res.json()) as ReminderSettings);
      setReminderPreview(null);
      setSuccessMessage('リマインドメール設定を保存しました。');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'リマインドメール設定の保存に失敗しました。');
    } finally {
      setIsSavingReminderSettings(false);
    }
  };

  const previewReminder = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    if (!reminderForm.userId || reminderForm.initiativeIds.length === 0) {
      setReminderPreview(null);
      setErrorMessage('送付先ユーザーと対象施策を選択してください。');
      return;
    }

    setIsPreviewingReminder(true);
    try {
      const res = await fetch('/api/admin/reminder/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: Number(reminderForm.userId),
          initiativeIds: reminderForm.initiativeIds.map((initiativeId) => Number(initiativeId)),
        }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as ApiError;
        throw new Error(payload.error ?? 'リマインドメールプレビューの取得に失敗しました。');
      }
      setReminderPreview((await res.json()) as ReminderPreview);
    } catch (error) {
      setReminderPreview(null);
      setErrorMessage(error instanceof Error ? error.message : 'リマインドメールプレビューの取得に失敗しました。');
    } finally {
      setIsPreviewingReminder(false);
    }
  };

  const sendReminder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!reminderForm.userId || reminderForm.initiativeIds.length === 0) {
      setErrorMessage('送付先ユーザーと対象施策を選択してください。');
      return;
    }

    setIsSendingReminder(true);
    try {
      const res = await fetch('/api/admin/reminder/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: Number(reminderForm.userId),
          initiativeIds: reminderForm.initiativeIds.map((initiativeId) => Number(initiativeId)),
        }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as ApiError;
        throw new Error(payload.error ?? 'リマインドメール送信に失敗しました。');
      }
      setReminderForm(initialReminderForm);
      setReminderPreview(null);
      setSuccessMessage('リマインドメールを送信しました。');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'リマインドメール送信に失敗しました。');
    } finally {
      setIsSendingReminder(false);
    }
  };

  const startEdit = (user: AppUser) => {
    setErrorMessage('');
    setSuccessMessage('');
    setEditingUserId(user.id);
    setShowEditPassword(false);
    setEditForm({
      email: user.email,
      password: '',
      displayName: user.displayName ?? '',
      department: user.department ?? '',
      role: user.role,
      isActive: user.isActive,
    });
  };

  const cancelEdit = () => {
    setEditingUserId(null);
    setEditForm(null);
    setShowEditPassword(false);
  };

  const handleEditChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!editForm) {
      return;
    }

    const { name, value, type } = event.target;
    const nextValue = type === 'checkbox' ? (event.target as HTMLInputElement).checked : value;
    setEditForm((prev) => (prev ? { ...prev, [name]: nextValue } : prev));
  };

  const updateUser = async (id: number, payload: {
    email?: string;
    displayName?: string | null;
    department?: string | null;
    role?: AppRole;
    isActive?: boolean;
    password?: string;
  }) => {
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
      setSuccessMessage('ユーザー情報を更新しました。');
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'ユーザー更新に失敗しました。');
      return false;
    } finally {
      setIsSavingById((prev) => ({ ...prev, [id]: false }));
    }
  };

  const saveEditUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editForm || editingUserId === null) {
      return;
    }

    const email = editForm.email.trim();
    if (!email) {
      setErrorMessage('メールアドレスは必須です。');
      return;
    }

    if (editForm.password && editForm.password.length < 8) {
      setErrorMessage('パスワードは8文字以上で入力してください。');
      return;
    }

    const isUpdated = await updateUser(editingUserId, {
      email,
      displayName: editForm.displayName.trim() || null,
      department: editForm.department.trim() || null,
      role: editForm.role,
      isActive: editForm.isActive,
      password: editForm.password || undefined,
    });

    if (isUpdated) {
      cancelEdit();
    }
  };

  const deleteUser = async (id: number) => {
    setErrorMessage('');
    setSuccessMessage('');

    if (!confirm('このユーザーを削除しますか？この操作は元に戻せません。')) {
      return;
    }

    setIsSavingById((prev) => ({ ...prev, [id]: true }));

    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as ApiError;
        throw new Error(data.error ?? 'ユーザー削除に失敗しました。');
      }

      setUsers((prev) => prev.filter((user) => user.id !== id));
      if (editingUserId === id) {
        cancelEdit();
      }
      setSuccessMessage('ユーザーを削除しました。');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'ユーザー削除に失敗しました。');
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


      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded border bg-white p-4">
          <h2 className="mb-3 text-lg font-semibold">リマインドメール定型文</h2>
          <form onSubmit={saveReminderSettings} className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block text-gray-700">メールタイトル *</span>
              <input
                type="text"
                name="subject"
                value={reminderSettings.subject}
                onChange={handleReminderSettingsChange}
                className="w-full rounded border px-3 py-2"
                required
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-gray-700">宛先後の案内文 *</span>
              <textarea
                name="introText"
                value={reminderSettings.introText}
                onChange={handleReminderSettingsChange}
                className="min-h-28 w-full rounded border px-3 py-2"
                required
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-gray-700">末尾の挨拶文・問い合わせ先 *</span>
              <textarea
                name="closingText"
                value={reminderSettings.closingText}
                onChange={handleReminderSettingsChange}
                className="min-h-28 w-full rounded border px-3 py-2"
                required
              />
            </label>
            <button
              type="submit"
              disabled={isSavingReminderSettings}
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSavingReminderSettings ? '保存中...' : '定型文を保存'}
            </button>
          </form>
        </div>

        <div className="rounded border bg-white p-4">
          <h2 className="mb-3 text-lg font-semibold">リマインドメール送信</h2>
          <p className="mb-3 text-sm text-gray-600">選択したユーザー宛に、選択した複数施策の最新進捗状況を含むメールを送信します。</p>
          <form onSubmit={sendReminder} className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block text-gray-700">送付先ユーザー *</span>
              <select name="userId" value={reminderForm.userId} onChange={handleReminderUserChange} className="w-full rounded border px-3 py-2" required>
                <option value="">選択してください</option>
                {activeReminderUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.displayName || user.email} ({user.email})
                  </option>
                ))}
              </select>
            </label>
            <fieldset className="block text-sm">
              <legend className="mb-1 block text-gray-700">対象施策 *</legend>
              <div className="max-h-48 space-y-2 overflow-y-auto rounded border px-3 py-2">
                {sortedInitiatives.map((initiative) => {
                  const initiativeId = String(initiative.id);
                  return (
                    <label key={initiative.id} className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        name="initiativeIds"
                        value={initiativeId}
                        checked={reminderForm.initiativeIds.includes(initiativeId)}
                        onChange={handleReminderInitiativeChange}
                        className="mt-1"
                      />
                      <span>
                        {initiative.measureName}（{initiative.domain}）
                      </span>
                    </label>
                  );
                })}
              </div>
              <p className="mt-1 text-xs text-gray-500">複数選択できます。</p>
            </fieldset>
            {reminderPreview && (
              <div className="space-y-2 rounded border border-gray-200 bg-gray-50 p-3 text-sm">
                <div>
                  <p className="mb-1 font-semibold text-gray-700">件名</p>
                  <p className="whitespace-pre-wrap break-words rounded border bg-white px-3 py-2">{reminderPreview.subject}</p>
                </div>
                <div>
                  <p className="mb-1 font-semibold text-gray-700">本文</p>
                  <pre className="max-h-80 overflow-y-auto whitespace-pre-wrap break-words rounded border bg-white px-3 py-2 font-sans text-sm leading-6 text-gray-800">{reminderPreview.body}</pre>
                </div>
                <p className="text-xs text-gray-500">
                  宛先: {reminderPreview.recipientName} ({reminderPreview.recipientEmail}) / 対象施策: {reminderPreview.initiativeCount}件
                </p>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={previewReminder}
                disabled={isPreviewingReminder || isSendingReminder}
                className="rounded border border-blue-600 px-4 py-2 text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPreviewingReminder ? 'プレビュー取得中...' : 'プレビュー'}
              </button>
              <button
                type="submit"
                disabled={isSendingReminder || isPreviewingReminder}
                className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSendingReminder ? '送信中...' : 'リマインドメールを送信'}
              </button>
            </div>
          </form>
        </div>
      </div>

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
            <div className="flex gap-2">
              <input
                type={showCreatePassword ? 'text' : 'password'}
                name="password"
                value={createForm.password}
                onChange={handleCreateChange}
                className="w-full rounded border px-3 py-2"
                minLength={8}
                required
              />
              <button
                type="button"
                className="rounded border px-3 py-2 text-xs"
                onClick={() => setShowCreatePassword((prev) => !prev)}
              >
                {showCreatePassword ? '非表示' : '表示'}
              </button>
            </div>
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
              <th className="px-3 py-2">パスワード</th>
              <th className="px-3 py-2">操作</th>
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
                  <td className="px-3 py-2">{user.role}</td>
                  <td className="px-3 py-2">{user.isActive ? '有効' : '無効'}</td>
                  <td className="px-3 py-2">{user.hasPassword ? '設定済み' : '未設定'}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded border px-2 py-1 hover:bg-gray-100"
                        onClick={() => startEdit(user)}
                        disabled={isSaving}
                      >
                        編集
                      </button>
                      <button
                        type="button"
                        className="rounded border border-red-300 px-2 py-1 text-red-700 hover:bg-red-50 disabled:opacity-60"
                        onClick={() => deleteUser(user.id)}
                        disabled={isSaving || isSelf}
                      >
                        削除
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editingUserId !== null && editForm && (
        <div className="mt-6 rounded border bg-white p-4">
          <h2 className="mb-3 text-lg font-semibold">ユーザー編集 (ID: {editingUserId})</h2>
          <form onSubmit={saveEditUser} className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-gray-700">メールアドレス *</span>
              <input
                type="email"
                name="email"
                value={editForm.email}
                onChange={handleEditChange}
                className="w-full rounded border px-3 py-2"
                required
              />
            </label>

            <label className="text-sm">
              <span className="mb-1 block text-gray-700">パスワード (変更時のみ入力)</span>
              <div className="flex gap-2">
                <input
                  type={showEditPassword ? 'text' : 'password'}
                  name="password"
                  value={editForm.password}
                  onChange={handleEditChange}
                  className="w-full rounded border px-3 py-2"
                  minLength={8}
                  placeholder="8文字以上"
                />
                <button
                  type="button"
                  className="rounded border px-3 py-2 text-xs"
                  onClick={() => setShowEditPassword((prev) => !prev)}
                >
                  {showEditPassword ? '非表示' : '表示'}
                </button>
              </div>
            </label>

            <label className="text-sm">
              <span className="mb-1 block text-gray-700">表示名</span>
              <input
                type="text"
                name="displayName"
                value={editForm.displayName}
                onChange={handleEditChange}
                className="w-full rounded border px-3 py-2"
              />
            </label>

            <label className="text-sm">
              <span className="mb-1 block text-gray-700">部署</span>
              <input
                type="text"
                name="department"
                value={editForm.department}
                onChange={handleEditChange}
                className="w-full rounded border px-3 py-2"
              />
            </label>

            <label className="text-sm">
              <span className="mb-1 block text-gray-700">ロール</span>
              <select
                name="role"
                value={editForm.role}
                onChange={handleEditChange}
                className="w-full rounded border px-3 py-2 md:w-48"
                disabled={editingUserId === myUserId}
              >
                {APP_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              <span className="mb-1 block text-gray-700">有効/無効</span>
              <div className="pt-2">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={editForm.isActive}
                    onChange={handleEditChange}
                    disabled={editingUserId === myUserId}
                  />
                  <span>{editForm.isActive ? '有効' : '無効'}</span>
                </label>
              </div>
            </label>

            <div className="md:col-span-2 flex gap-2">
              <button
                type="submit"
                disabled={Boolean(isSavingById[editingUserId])}
                className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                保存
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded border px-4 py-2 hover:bg-gray-100"
              >
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}

      <p className="mt-3 text-xs text-gray-500">※ 自分自身のロール変更・無効化・削除はできません。</p>
    </div>
  );
}
