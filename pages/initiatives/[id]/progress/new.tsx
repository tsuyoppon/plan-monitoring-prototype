import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { ProgressInputUserOption } from '@/types';
import {
  MAX_NEXT_ACTION_LENGTH,
  MAX_PROGRESS_EVALUATION_LENGTH,
  PROGRESS_STATUSES,
  ProgressLogFormErrors,
  validateProgressLog,
} from '@/lib/progressValidation';

const LEAVE_CONFIRM_MESSAGE = '現在の入力内容は保存されません。前の画面に戻りますか？';

const getTodayDateValue = () => {
  const date = new Date();
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
};

export default function NewProgressLog() {
  const router = useRouter();
  const { id } = router.query;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inputUserOptions, setInputUserOptions] = useState<ProgressInputUserOption[]>([]);
  const [isLoadingInputUsers, setIsLoadingInputUsers] = useState(true);
  
  const [formData, setFormData] = useState({
    fiscalYear: new Date().getFullYear(),
    fiscalQuarter: 1,
    progressStatus: '',
    progressEvaluation: '',
    nextAction: '',
    inputBy: '',
    inputAt: getTodayDateValue(),
  });
  const [errors, setErrors] = useState<ProgressLogFormErrors>({});


  useEffect(() => {
    const fetchInputUserOptions = async () => {
      try {
        const res = await fetch('/api/users/progress-input-options');
        if (!res.ok) {
          throw new Error('Failed to fetch progress input users');
        }

        const users = (await res.json()) as ProgressInputUserOption[];
        setInputUserOptions(users);
        setFormData((prev) => {
          if (prev.inputBy || users.length === 0) {
            return prev;
          }

          return { ...prev, inputBy: users[0].displayName };
        });
      } catch (error) {
        console.error(error);
        alert('入力者の取得に失敗しました');
      } finally {
        setIsLoadingInputUsers(false);
      }
    };

    fetchInputUserOptions();
  }, []);

  useEffect(() => {
    router.beforePopState(() => {
      if (isSubmitting) {
        return true;
      }

      return window.confirm(LEAVE_CONFIRM_MESSAGE);
    });

    return () => {
      router.beforePopState(() => true);
    };
  }, [router, isSubmitting]);

  const handleBack = () => {
    if (!window.confirm(LEAVE_CONFIRM_MESSAGE)) {
      return;
    }

    if (id) {
      router.push(`/initiatives/${id}`);
      return;
    }

    router.push('/initiatives');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const value = e.target.name === 'fiscalYear' || e.target.name === 'fiscalQuarter' 
      ? parseInt(e.target.value) 
      : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateProgressLog(formData);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }
    setIsSubmitting(true);
    const res = await fetch(`/api/initiatives/${id}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    if (res.ok) {
      router.push(`/initiatives/${id}`);
    } else {
      setIsSubmitting(false);
      alert('作成に失敗しました');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">進捗状況入力</h1>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
        <div className="flex gap-4">
          <div className="w-1/2">
            <label className="block mb-1">年度</label>
            <input type="number" name="fiscalYear" value={formData.fiscalYear} onChange={handleChange} className="border w-full p-2" required />
            {errors.fiscalYear && <p className="text-red-500 text-sm mt-1">{errors.fiscalYear}</p>}
          </div>
          <div className="w-1/2">
            <label className="block mb-1">四半期 (1-4)</label>
            <select name="fiscalQuarter" value={formData.fiscalQuarter} onChange={handleChange} className="border w-full p-2" required>
              {[1, 2, 3, 4].map(q => <option key={q} value={q}>Q{q}</option>)}
            </select>
            {errors.fiscalQuarter && <p className="text-red-500 text-sm mt-1">{errors.fiscalQuarter}</p>}
          </div>
        </div>
        <div>
          <label className="block mb-1">状況</label>
          <select name="progressStatus" value={formData.progressStatus} onChange={handleChange} className="border w-full p-2" required>
            <option value="">選択してください</option>
            {PROGRESS_STATUSES.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          {errors.progressStatus && <p className="text-red-500 text-sm mt-1">{errors.progressStatus}</p>}
        </div>
        <div>
          <label className="block mb-1">進捗</label>
          <textarea
            name="progressEvaluation"
            value={formData.progressEvaluation}
            onChange={handleChange}
            className="border w-full p-2"
            rows={4}
            maxLength={MAX_PROGRESS_EVALUATION_LENGTH}
            required
          />
          {errors.progressEvaluation && <p className="text-red-500 text-sm mt-1">{errors.progressEvaluation}</p>}
        </div>
        <div>
          <label className="block mb-1">今後のアクション</label>
          <textarea
            name="nextAction"
            value={formData.nextAction}
            onChange={handleChange}
            className="border w-full p-2"
            maxLength={MAX_NEXT_ACTION_LENGTH}
            required
          />
          {errors.nextAction && <p className="text-red-500 text-sm mt-1">{errors.nextAction}</p>}
        </div>
        <div>
          <label className="block mb-1">入力者</label>
          <select
            name="inputBy"
            value={formData.inputBy}
            onChange={handleChange}
            className="border w-full p-2"
            required
            disabled={isLoadingInputUsers || inputUserOptions.length === 0}
          >
            <option value="">選択してください</option>
            {inputUserOptions.map((user) => (
              <option key={user.id} value={user.displayName}>{user.displayName}</option>
            ))}
          </select>
          {inputUserOptions.length === 0 && !isLoadingInputUsers && (
            <p className="text-red-500 text-sm mt-1">入力者として選択できる登録名がありません。</p>
          )}
          {errors.inputBy && <p className="text-red-500 text-sm mt-1">{errors.inputBy}</p>}
        </div>
        <div>
          <label className="block mb-1">入力日時</label>
          <input
            type="date"
            name="inputAt"
            value={formData.inputAt}
            onChange={handleChange}
            className="border w-full p-2"
            required
          />
          {errors.inputAt && <p className="text-red-500 text-sm mt-1">{errors.inputAt}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">保存</button>
          <button
            type="button"
            onClick={handleBack}
            className="border border-gray-300 px-4 py-2 rounded"
          >
            戻る
          </button>
        </div>
      </form>
    </div>
  );
}
