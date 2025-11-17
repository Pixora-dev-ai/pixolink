import React, { useState, useEffect } from 'react';
import { FaClock, FaSpinner, FaCircleCheck, FaCircleXmark, FaTrash, FaRotateRight, FaMagnifyingGlass } from 'react-icons/fa6';
import * as adminService from '../../../services/adminService';
import { getGuardian } from '../logic-guardian';

const guardian = getGuardian();
const logger = guardian.logger;

interface QueueManagementTabProps {
  currentUserId: string;
}

export default function QueueManagementTab({ currentUserId }: QueueManagementTabProps) {
  const [queueItems, setQueueItems] = useState<adminService.QueueItemAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<adminService.QueueItemAdmin | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');

  useEffect(() => {
    loadQueueItems();
    // Auto refresh every 30 seconds
    const interval = setInterval(loadQueueItems, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadQueueItems = async () => {
    try {
      setLoading(true);
      const data = await adminService.getAllQueueItems(200, 0);
      setQueueItems(data);
    } catch (error) {
      logger.error('Failed to load queue items', { error });
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (queueId: number) => {
    try {
      await adminService.retryQueueItem(queueId);
      await loadQueueItems();
    } catch (error) {
      logger.error('Failed to retry queue item', { error });
      alert('فشل إعادة المحاولة');
    }
  };

  const handleDeleteClick = (item: adminService.QueueItemAdmin) => {
    setSelectedItem(item);
    setShowDeleteModal(true);
    setDeleteReason('');
  };

  const handleDeleteConfirm = async () => {
    if (!selectedItem || !deleteReason.trim()) {
      alert('يرجى إدخال سبب الحذف');
      return;
    }

    try {
      await adminService.deleteQueueItem(selectedItem.id, currentUserId, deleteReason);
      setShowDeleteModal(false);
      setSelectedItem(null);
      setDeleteReason('');
      await loadQueueItems();
    } catch (error) {
      logger.error('Failed to delete queue item', { error });
      alert('فشل حذف العنصر');
    }
  };

  const filteredItems = queueItems.filter(item => {
    const matchesSearch = 
      item.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.model_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || item.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  const stats = {
    pending: queueItems.filter(q => q.status === 'pending').length,
    processing: queueItems.filter(q => q.status === 'processing').length,
    completed: queueItems.filter(q => q.status === 'completed').length,
    failed: queueItems.filter(q => q.status === 'failed').length,
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <FaClock size={16} />;
      case 'processing': return (
        <div className="animate-spin">
          <FaSpinner size={16} />
        </div>
      );
      case 'completed': return <FaCircleCheck size={16} />;
      case 'failed': return <FaCircleXmark size={16} />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-300';
      case 'processing': return 'bg-blue-500/20 text-blue-300';
      case 'completed': return 'bg-green-500/20 text-green-300';
      case 'failed': return 'bg-red-500/20 text-red-300';
      default: return 'bg-gray-500/20 text-gray-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'قيد الانتظار';
      case 'processing': return 'جاري المعالجة';
      case 'completed': return 'مكتمل';
      case 'failed': return 'فشل';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-yellow-100 text-sm">قيد الانتظار</span>
            <div className="text-yellow-200">
              <FaClock size={20} />
            </div>
          </div>
          <div className="text-3xl font-bold">{stats.pending}</div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-blue-100 text-sm">جاري المعالجة</span>
            <div className="text-blue-200 animate-spin">
              <FaSpinner size={20} />
            </div>
          </div>
          <div className="text-3xl font-bold">{stats.processing}</div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-green-100 text-sm">مكتملة</span>
            <div className="text-green-200">
              <FaCircleCheck size={20} />
            </div>
          </div>
          <div className="text-3xl font-bold">{stats.completed}</div>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-red-100 text-sm">فاشلة</span>
            <div className="text-red-200">
              <FaCircleXmark size={20} />
            </div>
          </div>
          <div className="text-3xl font-bold">{stats.failed}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="ابحث عن طلب، مستخدم، أو نموذج..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white placeholder-white/40 focus:outline-none focus:border-purple-500"
          />
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
            <FaMagnifyingGlass size={18} />
          </div>
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
        >
          <option value="all">جميع الحالات</option>
          <option value="pending">قيد الانتظار</option>
          <option value="processing">جاري المعالجة</option>
          <option value="completed">مكتملة</option>
          <option value="failed">فاشلة</option>
        </select>

        <button
          onClick={loadQueueItems}
          className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 px-6 py-3 rounded-xl transition-colors flex items-center gap-2"
        >
          <FaRotateRight size={16} />
          تحديث
        </button>
      </div>

      {/* Queue Table */}
      {loading ? (
        <div className="text-center py-12 text-white/60">جاري التحميل...</div>
      ) : (
        <div className="bg-white/5 rounded-xl overflow-hidden border border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-6 py-4 text-right text-xs font-medium text-white/60 uppercase">ID</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-white/60 uppercase">المستخدم</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-white/60 uppercase">النموذج</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-white/60 uppercase">الطلب</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-white/60 uppercase">الحالة</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-white/60 uppercase">التاريخ</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-white/60 uppercase">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-white/80 text-sm">#{item.id}</td>
                    <td className="px-6 py-4 text-white/80 text-sm">
                      {item.user_name || item.user_email || 'غير معروف'}
                    </td>
                    <td className="px-6 py-4">
                      <code className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs">
                        {item.model_name || `Model #${item.model_id}`}
                      </code>
                    </td>
                    <td className="px-6 py-4 text-white/80 text-sm max-w-xs truncate">
                      {item.prompt}
                    </td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                        {getStatusIcon(item.status)}
                        {getStatusText(item.status)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-white/60 text-sm">
                      {new Date(item.created_at).toLocaleDateString('ar-SA', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {item.status === 'failed' && (
                          <button
                            onClick={() => handleRetry(item.id)}
                            className="text-blue-400 hover:text-blue-300 transition-colors"
                            title="إعادة المحاولة"
                          >
                            <FaRotateRight size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteClick(item)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                          title="حذف"
                        >
                          <FaTrash size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredItems.length === 0 && (
            <div className="text-center py-12 text-white/40">
              لا توجد عناصر مطابقة للبحث
            </div>
          )}
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedItem && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-b from-gray-900 to-black border border-red-500/30 rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">حذف من الطابور</h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-white/60 hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="mb-6">
              <p className="text-white/80 mb-2">
                هل أنت متأكد من حذف الطلب <strong className="text-white">#{selectedItem.id}</strong>؟
              </p>
              <div className="bg-white/5 rounded-lg p-3 mb-3">
                <p className="text-white/60 text-sm mb-1">الطلب:</p>
                <p className="text-white text-sm">{selectedItem.prompt}</p>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-white/80 mb-2 text-sm">
                سبب الحذف <span className="text-red-400">*</span>
              </label>
              <textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="اكتب سبب حذف هذا الطلب..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-red-500 resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl font-medium transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={!deleteReason.trim()}
                className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-3 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
