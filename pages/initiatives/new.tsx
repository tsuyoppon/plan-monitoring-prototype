import { useState } from 'react';
import { useRouter } from 'next/router';

export default function NewInitiative() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    domain: '',
    measureName: '',
    detail: '',
    goal: '',
    kpi: '',
    startDate: '',
    endDate: '',
    department: '',
    scheduleText: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/initiatives', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    if (res.ok) {
      router.push('/initiatives');
    } else {
      alert('作成に失敗しました');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">新規施策作成</h1>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
        <div>
          <label className="block mb-1">ドメイン</label>
          <input name="domain" value={formData.domain} onChange={handleChange} className="border w-full p-2" required />
        </div>
        <div>
          <label className="block mb-1">施策名</label>
          <input name="measureName" value={formData.measureName} onChange={handleChange} className="border w-full p-2" required />
        </div>
        <div>
          <label className="block mb-1">詳細</label>
          <textarea name="detail" value={formData.detail} onChange={handleChange} className="border w-full p-2" />
        </div>
        <div>
          <label className="block mb-1">ゴール</label>
          <textarea name="goal" value={formData.goal} onChange={handleChange} className="border w-full p-2" />
        </div>
        <div>
          <label className="block mb-1">KPI</label>
          <input name="kpi" value={formData.kpi} onChange={handleChange} className="border w-full p-2" />
        </div>
        <div>
          <label className="block mb-1">開始日</label>
          <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} className="border w-full p-2" />
        </div>
        <div>
          <label className="block mb-1">終了日</label>
          <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} className="border w-full p-2" />
        </div>
        <div>
          <label className="block mb-1">部署</label>
          <input name="department" value={formData.department} onChange={handleChange} className="border w-full p-2" />
        </div>
        <div>
          <label className="block mb-1">スケジュール詳細</label>
          <textarea name="scheduleText" value={formData.scheduleText} onChange={handleChange} className="border w-full p-2" />
        </div>
        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">作成</button>
      </form>
    </div>
  );
}
