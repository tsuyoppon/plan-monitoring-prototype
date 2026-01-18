import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  MAX_NEXT_ACTION_LENGTH,
  MAX_PROGRESS_EVALUATION_LENGTH,
  ProgressLogFormData,
  ProgressLogFormErrors,
  validateProgressLog,
} from '@/lib/progressValidation';
import { Initiative, ProgressLog } from '@/types';

export default function InitiativeDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [initiative, setInitiative] = useState<Initiative | null>(null);
  const [editingLogId, setEditingLogId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<ProgressLogFormData | null>(null);
  const [editErrors, setEditErrors] = useState<ProgressLogFormErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (id) {
      fetch(`/api/initiatives/${id}`)
        .then((res) => res.json())
        .then((data) => setInitiative(data));
    }
  }, [id]);

  if (!initiative) return <div>Loading...</div>;

  const progressLogs = initiative.progressLogs ?? [];
  const formatDate = (value?: string) => (value ? value.split('T')[0] : '');

  const startEdit = (log: ProgressLog) => {
    setEditingLogId(log.id);
    setEditFormData({
      fiscalYear: log.fiscalYear,
      fiscalQuarter: log.fiscalQuarter,
      progressStatus: log.progressStatus ?? '',
      progressEvaluation: log.progressEvaluation ?? '',
      nextAction: log.nextAction ?? '',
      nextActionDueDate: formatDate(log.nextActionDueDate),
    });
    setEditErrors({});
  };

  const cancelEdit = () => {
    setEditingLogId(null);
    setEditFormData(null);
    setEditErrors({});
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (!editFormData) return;
    const value = e.target.name === 'fiscalYear' || e.target.name === 'fiscalQuarter'
      ? parseInt(e.target.value)
      : e.target.value;
    setEditFormData({ ...editFormData, [e.target.name]: value });
  };

  const handleEditSubmit = async (logId: number) => {
    if (!editFormData || isSaving) return;
    const validationErrors = validateProgressLog(editFormData);
    setEditErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch(`/api/initiatives/${id}/progress`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logId, ...editFormData }),
      });
      if (!res.ok) {
        alert('更新に失敗しました');
        return;
      }
      const updatedLog: ProgressLog = await res.json();
      setInitiative((prev) => {
        if (!prev) return prev;
        const updatedLogs = (prev.progressLogs ?? []).map((log) =>
          log.id === updatedLog.id ? updatedLog : log
        );
        updatedLogs.sort((a, b) => {
          if (a.fiscalYear !== b.fiscalYear) return b.fiscalYear - a.fiscalYear;
          if (a.fiscalQuarter !== b.fiscalQuarter) return b.fiscalQuarter - a.fiscalQuarter;
          return b.versionNo - a.versionNo;
        });
        return { ...prev, progressLogs: updatedLogs };
      });
      cancelEdit();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Link href="/initiatives" className="text-blue-500 mb-4 inline-block">&larr; 一覧に戻る</Link>
      <h1 className="text-2xl font-bold mb-4">{initiative.measureName}</h1>
      
      <div className="bg-white shadow rounded p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">基本情報</h2>
          <Link
            href={`/initiatives/${initiative.id}/edit`}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            基本情報を編集
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><span className="font-bold">ドメイン:</span> {initiative.domain}</div>
          <div><span className="font-bold">部署:</span> {initiative.department}</div>
          <div><span className="font-bold">期間:</span> {initiative.startDate?.split('T')[0]} 〜 {initiative.endDate?.split('T')[0]}</div>
          <div className="col-span-2 whitespace-pre-wrap"><span className="font-bold">詳細:</span> {initiative.detail}</div>
          <div className="col-span-2 whitespace-pre-wrap"><span className="font-bold">ゴール:</span> {initiative.goal}</div>
          <div className="col-span-2 whitespace-pre-wrap"><span className="font-bold">KPI:</span> {initiative.kpi}</div>
          <div className="col-span-2 whitespace-pre-wrap"><span className="font-bold">スケジュール詳細:</span> {initiative.scheduleText}</div>
        </div>
      </div>

      <div className="bg-white shadow rounded p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">進捗（四半期別）</h2>
          <Link href={`/initiatives/${initiative.id}/progress/new`} className="bg-green-500 text-white px-4 py-2 rounded">
            進捗を追加
          </Link>
        </div>

        {progressLogs.length > 0 ? (
          <div className="space-y-6">
            {progressLogs.map((log) => (
              <div key={log.id} className="border rounded p-4">
                {editingLogId === log.id && editFormData ? (
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="w-1/2">
                        <label className="block mb-1">年度</label>
                        <input
                          type="number"
                          name="fiscalYear"
                          value={editFormData.fiscalYear}
                          onChange={handleEditChange}
                          className="border w-full p-2"
                          required
                        />
                        {editErrors.fiscalYear && <p className="text-red-500 text-sm mt-1">{editErrors.fiscalYear}</p>}
                      </div>
                      <div className="w-1/2">
                        <label className="block mb-1">四半期 (1-4)</label>
                        <select
                          name="fiscalQuarter"
                          value={editFormData.fiscalQuarter}
                          onChange={handleEditChange}
                          className="border w-full p-2"
                          required
                        >
                          {[1, 2, 3, 4].map(q => <option key={q} value={q}>Q{q}</option>)}
                        </select>
                        {editErrors.fiscalQuarter && <p className="text-red-500 text-sm mt-1">{editErrors.fiscalQuarter}</p>}
                      </div>
                    </div>
                    <div>
                      <label className="block mb-1">進捗ステータス</label>
                      <select
                        name="progressStatus"
                        value={editFormData.progressStatus}
                        onChange={handleEditChange}
                        className="border w-full p-2"
                        required
                      >
                        <option value="">選択してください</option>
                        <option value="順調">順調</option>
                        <option value="遅れあり">遅れあり</option>
                        <option value="未着手">未着手</option>
                        <option value="完了">完了</option>
                      </select>
                      {editErrors.progressStatus && <p className="text-red-500 text-sm mt-1">{editErrors.progressStatus}</p>}
                    </div>
                    <div>
                      <label className="block mb-1">進捗評価・詳細</label>
                      <textarea
                        name="progressEvaluation"
                        value={editFormData.progressEvaluation}
                        onChange={handleEditChange}
                        className="border w-full p-2"
                        rows={4}
                        maxLength={MAX_PROGRESS_EVALUATION_LENGTH}
                        required
                      />
                      {editErrors.progressEvaluation && (
                        <p className="text-red-500 text-sm mt-1">{editErrors.progressEvaluation}</p>
                      )}
                    </div>
                    <div>
                      <label className="block mb-1">次のアクション</label>
                      <textarea
                        name="nextAction"
                        value={editFormData.nextAction}
                        onChange={handleEditChange}
                        className="border w-full p-2"
                        maxLength={MAX_NEXT_ACTION_LENGTH}
                        required
                      />
                      {editErrors.nextAction && <p className="text-red-500 text-sm mt-1">{editErrors.nextAction}</p>}
                    </div>
                    <div>
                      <label className="block mb-1">アクション期限</label>
                      <input
                        type="date"
                        name="nextActionDueDate"
                        value={editFormData.nextActionDueDate}
                        onChange={handleEditChange}
                        className="border w-full p-2"
                        required
                      />
                      {editErrors.nextActionDueDate && (
                        <p className="text-red-500 text-sm mt-1">{editErrors.nextActionDueDate}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditSubmit(log.id)}
                        className="bg-blue-500 text-white px-4 py-2 rounded"
                        disabled={isSaving}
                      >
                        保存
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="bg-gray-200 text-gray-700 px-4 py-2 rounded"
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center mb-2">
                      <div><span className="font-bold">年度/四半期:</span> {log.fiscalYear}年度 Q{log.fiscalQuarter}</div>
                      <button
                        type="button"
                        onClick={() => startEdit(log)}
                        className="text-sm text-blue-500 hover:underline"
                      >
                        編集
                      </button>
                    </div>
                    <div><span className="font-bold">ステータス:</span> {log.progressStatus}</div>
                    <div className="whitespace-pre-wrap"><span className="font-bold">進捗:</span> {log.progressEvaluation}</div>
                    <div className="whitespace-pre-wrap"><span className="font-bold">次のアクション:</span> {log.nextAction}</div>
                    <div><span className="font-bold">期限:</span> {formatDate(log.nextActionDueDate)}</div>
                  </>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">進捗ログはまだありません。</p>
        )}
      </div>
    </div>
  );
}
