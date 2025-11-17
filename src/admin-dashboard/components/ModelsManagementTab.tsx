import React, { useState, useEffect } from 'react';
import { FaCube, FaTrash, FaGlobe, FaLock, FaEye, FaMagnifyingGlass } from 'react-icons/fa6';
import * as adminService from '../../../services/adminService';
import { getGuardian } from '../logic-guardian';

const guardian = getGuardian();
const logger = guardian.logger;

interface ModelsManagementTabProps {
  currentUserId: string;
}

export default function ModelsManagementTab({ currentUserId }: ModelsManagementTabProps) {
  const [models, setModels] = useState<adminService.ModelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModel, setSelectedModel] = useState<adminService.ModelData | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      setLoading(true);
      const data = await adminService.getAllModels(100, 0);
      setModels(data);
    } catch (error) {
      logger.error('Failed to load models', { error });
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePublic = async (modelId: number, currentStatus: boolean) => {
    try {
      await adminService.toggleModelPublicStatus(modelId, !currentStatus);
      await loadModels();
    } catch (error) {
      logger.error('Failed to toggle model public status', { error });
      alert('فشل تحديث حالة النموذج');
    }
  };

  const handleDeleteClick = (model: adminService.ModelData) => {
    setSelectedModel(model);
    setShowDeleteModal(true);
    setDeleteReason('');
  };

  const handleDeleteConfirm = async () => {
    if (!selectedModel || !deleteReason.trim()) {
      alert('يرجى إدخال سبب الحذف');
      return;
    }

    try {
      await adminService.deleteModel(selectedModel.id, currentUserId, deleteReason);
      setShowDeleteModal(false);
      setSelectedModel(null);
      setDeleteReason('');
      await loadModels();
    } catch (error) {
      logger.error('Failed to delete model', { error });
      alert('فشل حذف النموذج');
    }
  };

  const filteredModels = models.filter(model =>
    model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    model.trigger_keyword.toLowerCase().includes(searchQuery.toLowerCase()) ||
    model.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    model.user_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: models.length,
    public: models.filter(m => m.is_public).length,
    private: models.filter(m => !m.is_public).length,
    active: models.filter(m => m.status === 'active').length,
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-purple-100 text-sm">إجمالي النماذج</span>
            <div className="text-purple-200">
              <FaCube size={20} />
            </div>
          </div>
          <div className="text-3xl font-bold">{stats.total}</div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-green-100 text-sm">نماذج عامة</span>
            <div className="text-green-200">
              <FaGlobe size={20} />
            </div>
          </div>
          <div className="text-3xl font-bold">{stats.public}</div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-blue-100 text-sm">نماذج خاصة</span>
            <div className="text-blue-200">
              <FaLock size={20} />
            </div>
          </div>
          <div className="text-3xl font-bold">{stats.private}</div>
        </div>

        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-indigo-100 text-sm">نماذج نشطة</span>
            <div className="text-indigo-200">
              <FaEye size={20} />
            </div>
          </div>
          <div className="text-3xl font-bold">{stats.active}</div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="ابحث عن نموذج، مستخدم، أو كلمة مفتاحية..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white placeholder-white/40 focus:outline-none focus:border-purple-500"
        />
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
          <FaMagnifyingGlass size={18} />
        </div>
      </div>

      {/* Models Table */}
      {loading ? (
        <div className="text-center py-12 text-white/60">جاري التحميل...</div>
      ) : (
        <div className="bg-white/5 rounded-xl overflow-hidden border border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-6 py-4 text-right text-xs font-medium text-white/60 uppercase">الاسم</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-white/60 uppercase">الكلمة المفتاحية</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-white/60 uppercase">المستخدم</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-white/60 uppercase">عدد الصور</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-white/60 uppercase">الحالة</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-white/60 uppercase">العرض</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-white/60 uppercase">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredModels.map((model) => (
                  <tr key={model.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-white">{model.name}</td>
                    <td className="px-6 py-4">
                      <code className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-sm">
                        {model.trigger_keyword}
                      </code>
                    </td>
                    <td className="px-6 py-4 text-white/80 text-sm">
                      {model.user_name || model.user_email || 'غير معروف'}
                    </td>
                    <td className="px-6 py-4 text-white/80">{model.image_count}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        model.status === 'active' ? 'bg-green-500/20 text-green-300' :
                        model.status === 'training' ? 'bg-yellow-500/20 text-yellow-300' :
                        'bg-gray-500/20 text-gray-300'
                      }`}>
                        {model.status === 'active' ? 'نشط' : 
                         model.status === 'training' ? 'تدريب' : 'غير نشط'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleTogglePublic(model.id, model.is_public)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          model.is_public 
                            ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30' 
                            : 'bg-gray-500/20 text-gray-300 hover:bg-gray-500/30'
                        }`}
                      >
                        {model.is_public ? 'عام' : 'خاص'}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleDeleteClick(model)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        <FaTrash size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredModels.length === 0 && (
            <div className="text-center py-12 text-white/40">
              لا توجد نماذج مطابقة للبحث
            </div>
          )}
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedModel && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-b from-gray-900 to-black border border-red-500/30 rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">حذف النموذج</h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-white/60 hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="mb-6">
              <p className="text-white/80 mb-2">
                هل أنت متأكد من حذف النموذج: <strong className="text-white">{selectedModel.name}</strong>؟
              </p>
              <p className="text-red-400 text-sm">
                تحذير: هذا الإجراء لا يمكن التراجع عنه وسيتم حذف جميع البيانات المتعلقة بالنموذج.
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-white/80 mb-2 text-sm">
                سبب الحذف <span className="text-red-400">*</span>
              </label>
              <textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="اكتب سبب حذف هذا النموذج..."
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
                حذف النموذج
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
