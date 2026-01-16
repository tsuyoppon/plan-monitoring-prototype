import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

type InitiativeFormData = {
  domain: string;
  measureName: string;
  detail: string;
  goal: string;
  kpi: string;
  startDate: string;
  endDate: string;
  department: string;
  scheduleText: string;
};

const emptyForm: InitiativeFormData = {
  domain: '',
  measureName: '',
  detail: '',
  goal: '',
  kpi: '',
  startDate: '',
  endDate: '',
  department: '',
  scheduleText: '',
};

const normalizeDate = (value?: string | null) => {
  if (!value) return '';
  return value.split('T')[0];
};

export default function EditInitiative() {
  const router = useRouter();
  const { id } = router.query;
  const [formData, setFormData] = useState<InitiativeFormData>(emptyForm);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    fetch(`/api/initiatives/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setFormData({
          domain: data.domain ?? '',
          measureName: data.measureName ?? '',
          detail: data.detail ?? '',
          goal: data.goal ?? '',
          kpi: data.kpi ?? '',
          startDate: normalizeDate(data.startDate),
          endDate: normalizeDate(data.endDate),
          department: data.department ?? '',
          scheduleText: data.scheduleText ?? '',
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/initiatives/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    if (res.ok) {
      router.push(`/initiatives/${id}`);
    } else {
      alert('更新に失敗しました');
    }
  };

  if (isLoading) {
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <Link href={`/initiatives/${id}`} className="text-blue-500 mb-4 inline-block">&larr; 戻る</Link>
      <h1 className="text-2xl font-bold mb-4">施策基本情報を編集</h1>
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
        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">更新</button>
      </form>
    </div>
  );
}
