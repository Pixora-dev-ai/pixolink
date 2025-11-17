import React, { useEffect, useState } from 'react';
import { supabase } from '../../../services/supabase';
import { FaEdit, FaCheck, FaTimes, FaClock } from 'react-icons/fa';
import { MEMBERSHIP_DISPLAY_AR, MembershipType } from '../../membership';

interface CreditRate {
  id: number;
  membership_type: string;
  base_rate: number;
  promo_rate?: number;
  promo_start?: string;
  promo_end?: string;
}

const CreditRatesManager: React.FC = () => {
  const [rates, setRates] = useState<CreditRate[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editBase, setEditBase] = useState<number>(0);
  const [editPromo, setEditPromo] = useState<number | null>(null);
  const [editStart, setEditStart] = useState<string>('');
  const [editEnd, setEditEnd] = useState<string>('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRates();
  }, []);

  const fetchRates = async () => {
    setError('');
    const { data, error } = await supabase.from('credit_rates').select('*').order('membership_type');
    if (error) setError(error.message);
    setRates(data || []);
  };

  const startEdit = (rate: CreditRate) => {
    setEditingId(rate.id);
    setEditBase(rate.base_rate);
    setEditPromo(rate.promo_rate || null);
    setEditStart(rate.promo_start ? rate.promo_start.slice(0, 16) : '');
    setEditEnd(rate.promo_end ? rate.promo_end.slice(0, 16) : '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditBase(0);
    setEditPromo(null);
    setEditStart('');
    setEditEnd('');
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setError('');
    const updateObj: Partial<CreditRate> = {
      base_rate: editBase,
      promo_rate: editPromo || undefined,
      promo_start: editPromo && editStart ? new Date(editStart).toISOString() : undefined,
      promo_end: editPromo && editEnd ? new Date(editEnd).toISOString() : undefined,
    };
    const { error } = await supabase.from('credit_rates').update(updateObj).eq('id', editingId);
    if (error) setError(error.message);
    await fetchRates();
    cancelEdit();
  };

  return (
    <div className="bg-purple-900/30 rounded-xl p-6 space-y-6">
      <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
        <FaEdit /> إدارة أسعار الكريديت لكل فئة
      </h2>
      {error && <div className="text-red-400 mb-2">{error}</div>}
      <table className="w-full text-center bg-purple-900/10 rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-purple-800/40">
            <th className="p-3 text-white">الفئة</th>
            <th className="p-3 text-white">سعر الكريديت الأساسي</th>
            <th className="p-3 text-white">العرض المؤقت</th>
            <th className="p-3 text-white">مدة العرض</th>
            <th className="p-3 text-white">تحكم</th>
          </tr>
        </thead>
        <tbody>
          {rates.map(rate => (
            <tr key={rate.id} className="border-b border-purple-700">
              <td className="p-3 text-lg text-purple-200 font-bold">
                {MEMBERSHIP_DISPLAY_AR[rate.membership_type as MembershipType] || rate.membership_type}
              </td>
              <td className="p-3">
                {editingId === rate.id ? (
                  <input type="number" min={1} value={editBase} onChange={e => setEditBase(Number(e.target.value))} className="w-20 px-2 py-1 rounded bg-purple-950 text-white" />
                ) : (
                  <span className="text-white">كل 1 جنيه = <span className="font-bold text-yellow-400">{rate.base_rate}</span> كريديت</span>
                )}
              </td>
              <td className="p-3">
                {editingId === rate.id ? (
                  <input type="number" min={1} value={editPromo || ''} onChange={e => setEditPromo(e.target.value ? Number(e.target.value) : null)} className="w-20 px-2 py-1 rounded bg-yellow-900 text-yellow-300" placeholder="مثلاً 100" />
                ) : rate.promo_rate ? (
                  <span className="font-bold text-yellow-400 animate-pulse">{rate.promo_rate} كريديت</span>
                ) : (
                  <span className="text-gray-400">لا يوجد عرض</span>
                )}
              </td>
              <td className="p-3">
                {editingId === rate.id ? (
                  <>
                    <input type="datetime-local" value={editStart} onChange={e => setEditStart(e.target.value)} className="w-40 px-2 py-1 rounded bg-purple-950 text-white mb-1" />
                    <input type="datetime-local" value={editEnd} onChange={e => setEditEnd(e.target.value)} className="w-40 px-2 py-1 rounded bg-purple-950 text-white" />
                  </>
                ) : rate.promo_rate && rate.promo_start && rate.promo_end ? (
                  <span className="text-yellow-300 flex items-center gap-1">
                    <FaClock />
                    {new Date(rate.promo_start).toLocaleDateString()} - {new Date(rate.promo_end).toLocaleDateString()}
                  </span>
                ) : (
                  <span className="text-gray-400">---</span>
                )}
              </td>
              <td className="p-3">
                {editingId === rate.id ? (
                  <>
                    <button onClick={saveEdit} className="px-3 py-1 bg-green-600 text-white rounded-lg mr-2"><FaCheck /></button>
                    <button onClick={cancelEdit} className="px-3 py-1 bg-red-600 text-white rounded-lg"><FaTimes /></button>
                  </>
                ) : (
                  <button onClick={() => startEdit(rate)} className="px-3 py-1 bg-purple-700 text-white rounded-lg"><FaEdit /></button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 text-sm text-gray-300">
        <FaClock className="inline mr-1" /> يمكنك إضافة عرض مؤقت لأي فئة وسيظهر للأعضاء بشكل محفز مع مؤثرات بصرية.
      </div>
    </div>
  );
};

export default CreditRatesManager;
