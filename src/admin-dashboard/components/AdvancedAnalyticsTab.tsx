import React, { useState, useEffect } from 'react';
import { FaChartLine, FaUsers, FaCube, FaCoins, FaDownload, FaClockRotateLeft } from 'react-icons/fa6';
import * as adminService from '../../../services/adminService';
import { getGuardian } from '../logic-guardian';

const guardian = getGuardian();
const logger = guardian.logger;

export default function AdvancedAnalyticsTab() {
  const [analytics, setAnalytics] = useState<adminService.AdvancedAnalytics | null>(null);
  const [auditLog, setAuditLog] = useState<adminService.AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [days, setDays] = useState(30);

  useEffect(() => {
    loadAnalytics();
    loadAuditLog();
  }, [days]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const data = await adminService.getAdvancedAnalytics(days);
      setAnalytics(data);
    } catch (error) {
      logger.error('Failed to load analytics', { error });
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLog = async () => {
    try {
      const data = await adminService.getAuditLog(50, 0);
      setAuditLog(data);
    } catch (error) {
      logger.error('Failed to load audit log', { error });
    }
  };

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const csv = await adminService.exportUsersToCSV();
      
      // Create download link
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `users_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      logger.error('Failed to export CSV', { error });
      alert('فشل تصدير البيانات');
    } finally {
      setExporting(false);
    }
  };

  const getActionText = (action: string) => {
    const actions: Record<string, string> = {
      'add_credits': 'إضافة رصيد',
      'deduct_credits': 'خصم رصيد',
      'delete_model': 'حذف نموذج',
      'delete_queue_item': 'حذف من الطابور',
      'update_user': 'تحديث مستخدم',
      'update_subscription': 'تحديث اشتراك',
      'toggle_admin': 'تعديل صلاحية إدارية',
    };
    return actions[action] || action;
  };

  if (loading || !analytics) {
    return <div className="text-center py-12 text-white/60">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-purple-400">
            <FaChartLine size={24} />
          </div>
          <h3 className="text-xl font-bold text-white">التحليلات المتقدمة</h3>
        </div>
        
        <div className="flex items-center gap-3">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-purple-500"
          >
            <option value={7}>آخر 7 أيام</option>
            <option value={30}>آخر 30 يوم</option>
            <option value={90}>آخر 90 يوم</option>
            <option value={365}>آخر سنة</option>
          </select>

          <button
            onClick={handleExportCSV}
            disabled={exporting}
            className="bg-green-500/20 hover:bg-green-500/30 text-green-300 px-4 py-2 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <FaDownload size={16} />
            {exporting ? 'جاري التصدير...' : 'تصدير CSV'}
          </button>
        </div>
      </div>

      {/* Top Users */}
      <div className="bg-white/5 rounded-xl border border-white/10 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="text-yellow-400">
            <FaUsers size={20} />
          </div>
          <h4 className="text-lg font-bold text-white">أكثر المستخدمين نشاطاً</h4>
        </div>
        
        <div className="space-y-3">
          {analytics.topUsers.slice(0, 5).map((user, index) => (
            <div key={user.user_id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                  index === 0 ? 'bg-yellow-500 text-black' :
                  index === 1 ? 'bg-gray-300 text-black' :
                  index === 2 ? 'bg-orange-600 text-white' :
                  'bg-purple-500/30 text-purple-300'
                }`}>
                  {index + 1}
                </div>
                <div>
                  <div className="text-white font-medium">{user.full_name || 'مستخدم'}</div>
                  <div className="text-white/60 text-sm">{user.email}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-white font-bold">{user.total_credits_used.toLocaleString()}</div>
                <div className="text-white/60 text-sm">نقطة مستخدمة</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Model Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white/5 rounded-xl border border-white/10 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-blue-400">
              <FaCube size={20} />
            </div>
            <h4 className="text-lg font-bold text-white">إحصائيات النماذج</h4>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <span className="text-white/80">إجمالي النماذج</span>
              <span className="text-white font-bold text-xl">{analytics.modelStats.total_models}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <span className="text-white/80">نماذج عامة</span>
              <span className="text-white font-bold text-xl">{analytics.modelStats.public_models}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <span className="text-white/80">نماذج نشطة</span>
              <span className="text-white font-bold text-xl">{analytics.modelStats.active_models}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <span className="text-white/80">متوسط الصور لكل نموذج</span>
              <span className="text-white font-bold text-xl">
                {analytics.modelStats.avg_images_per_model.toFixed(1)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white/5 rounded-xl border border-white/10 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-green-400">
              <FaCoins size={20} />
            </div>
            <h4 className="text-lg font-bold text-white">إحصائيات الطابور</h4>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
              <span className="text-yellow-300">قيد الانتظار</span>
              <span className="text-yellow-300 font-bold text-xl">{analytics.queueStats.total_pending}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <span className="text-blue-300">جاري المعالجة</span>
              <span className="text-blue-300 font-bold text-xl">{analytics.queueStats.total_processing}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-500/10 rounded-lg border border-red-500/20">
              <span className="text-red-300">فاشلة</span>
              <span className="text-red-300 font-bold text-xl">{analytics.queueStats.total_failed}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Log */}
      <div className="bg-white/5 rounded-xl border border-white/10 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="text-orange-400">
            <FaClockRotateLeft size={20} />
          </div>
          <h4 className="text-lg font-bold text-white">سجل الإجراءات الإدارية</h4>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-medium text-white/60 uppercase">الإجراء</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-white/60 uppercase">المسؤول</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-white/60 uppercase">التفاصيل</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-white/60 uppercase">التاريخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {auditLog.map((log) => (
                <tr key={log.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs font-medium">
                      {getActionText(log.action)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/80 text-sm">
                    {log.admin_name || log.admin_email || 'غير معروف'}
                  </td>
                  <td className="px-4 py-3 text-white/60 text-sm max-w-xs truncate">
                    {log.details ? JSON.stringify(log.details) : '-'}
                  </td>
                  <td className="px-4 py-3 text-white/60 text-sm">
                    {log.created_at && new Date(log.created_at).toLocaleDateString('ar-SA', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {auditLog.length === 0 && (
            <div className="text-center py-8 text-white/40">
              لا توجد إجراءات مسجلة
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
