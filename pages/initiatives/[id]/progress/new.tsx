import { useState } from 'react';
import { useRouter } from 'next/router';
import {
  MAX_NEXT_ACTION_LENGTH,
  MAX_PROGRESS_EVALUATION_LENGTH,
  ProgressLogFormErrors,
  validateProgressLog,
} from '@/lib/progressValidation';

export default function NewProgressLog() {
  const router = useRouter();
  const { id } = router.query;
  
  const [formData, setFormData] = useState({
    fiscalYear: new Date().getFullYear(),
    fiscalQuarter: 1,
    progressStatus: '',
    progressEvaluation: '',
    nextAction: '',
    nextActionDueDate: '',
  });
  const [errors, setErrors] = useState<ProgressLogFormErrors>({});

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
    const res = await fetch(`/api/initiatives/${id}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    if (res.ok) {
      router.push(`/initiatives/${id}`);
    } else {
      alert('作成に失敗しました');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">進捗ログ追加</h1>
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
          <label className="block mb-1">進捗ステータス</label>
          <select name="progressStatus" value={formData.progressStatus} onChange={handleChange} className="border w-full p-2" required>
            <option value="">選択してください</option>
            <option value="順調">順調</option>
            <option value="遅れあり">遅れあり</option>
            <option value="未着手">未着手</option>
            <option value="完了">完了</option>
          </select>
          {errors.progressStatus && <p className="text-red-500 text-sm mt-1">{errors.progressStatus}</p>}
        </div>
        <div>
          <label className="block mb-1">進捗評価・詳細</label>
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
          <label className="block mb-1">次のアクション</label>
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
          <label className="block mb-1">アクション期限</label>
          <input type="date" name="nextActionDueDate" value={formData.nextActionDueDate} onChange={handleChange} className="border w-full p-2" required />
          {errors.nextActionDueDate && <p className="text-red-500 text-sm mt-1">{errors.nextActionDueDate}</p>}
        </div>
        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">保存</button>
      </form>
    </div>
  );
}
