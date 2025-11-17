import React, { useState, useEffect } from 'react';
import { FaBell, FaPlus, FaFilter, FaDownload, FaEye, FaTrash, FaToggleOn, FaToggleOff, FaChartBar, FaUsers, FaEnvelope } from 'react-icons/fa';
import { getGuardian } from '../logic-guardian';
import { supabase } from '../../../services/supabase';
import { NotificationAnalyticsWidget } from '../../../components/notifications/NotificationAnalyticsWidget';

const guardian = getGuardian();
const logger = guardian.logger;

interface NotificationStats {
  totalNotifications: number;
  activeNotifications: number;
  totalReceipts: number;
  readRate: number;
  sentToday: number;
  avgReadTime: number;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  target: 'all' | 'subscribers' | 'free_users' | 'specific';
  target_user_ids: string[] | null;
  action_url: string | null;
  created_by: string;
  created_at: string;
  expires_at: string | null;
  is_active: boolean;
  creator_email?: string;
  receipt_count?: number;
  read_count?: number;
}

interface NotificationReceipt {
  id: string;
  user_id: string;
  notification_id: string;
  read_at: string | null;
  action_taken: string | null;
  created_at: string;
  user_email?: string;
  notification_title?: string;
}

const NotificationsManagement: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [receipts, setReceipts] = useState<NotificationReceipt[]>([]);
  const [stats, setStats] = useState<NotificationStats>({
    totalNotifications: 0,
    activeNotifications: 0,
    totalReceipts: 0,
    readRate: 0,
    sentToday: 0,
    avgReadTime: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'notifications' | 'receipts'>('notifications');
  const [showFilters, setShowFilters] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'all' | 'info' | 'warning' | 'success' | 'error'>('all');
  const [targetFilter, setTargetFilter] = useState<'all' | 'subscribers' | 'free_users' | 'specific'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Batch operations state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingNotification, setEditingNotification] = useState<Notification | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'info' as 'info' | 'warning' | 'success' | 'error',
    target: 'all' as 'all' | 'subscribers' | 'free_users' | 'specific',
    target_user_ids: [] as string[],
    action_url: '',
    expires_at: ''
  });

  useEffect(() => {
    loadData();
  }, [activeTab, typeFilter, targetFilter, statusFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      await loadStats();

      if (activeTab === 'notifications') {
        await loadNotifications();
      } else {
        await loadReceipts();
      }

      logger.info('Notifications data loaded', { tab: activeTab });
    } catch (err) {
      logger.error('Failed to load notifications data', { error: err });
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    // Get notification counts
    const { data: notificationsData, error: notifError } = await supabase
      .from('admin_notifications')
      .select('is_active, created_at');

    if (notifError) throw notifError;

    // Get receipt counts
    const { data: receiptsData, error: receiptsError } = await supabase
      .from('notification_receipts')
      .select('read_at, created_at');

    if (receiptsError) throw receiptsError;

    const totalNotifications = notificationsData?.length || 0;
    const activeNotifications = notificationsData?.filter(n => n.is_active).length || 0;
    const totalReceipts = receiptsData?.length || 0;
    const readReceipts = receiptsData?.filter(r => r.read_at).length || 0;
    const readRate = totalReceipts > 0 ? Math.round((readReceipts / totalReceipts) * 100) : 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sentToday = notificationsData?.filter(n => new Date(n.created_at) >= today).length || 0;

    // Calculate average read time (hours)
    const readTimes = receiptsData
      ?.filter(r => r.read_at)
      .map(r => {
        const created = new Date(r.created_at).getTime();
        const read = new Date(r.read_at!).getTime();
        return (read - created) / (1000 * 60 * 60); // hours
      }) || [];
    const avgReadTime = readTimes.length > 0
      ? Math.round(readTimes.reduce((a, b) => a + b, 0) / readTimes.length)
      : 0;

    setStats({
      totalNotifications,
      activeNotifications,
      totalReceipts,
      readRate,
      sentToday,
      avgReadTime
    });
  };

  const loadNotifications = async () => {
    let query = supabase
      .from('admin_notifications')
      .select(`
        id,
        title,
        message,
        type,
        target,
        target_user_ids,
        action_url,
        created_by,
        created_at,
        expires_at,
        is_active,
        profiles:created_by (
          email
        )
      `)
      .order('created_at', { ascending: false });

    if (typeFilter !== 'all') {
      query = query.eq('type', typeFilter);
    }

    if (targetFilter !== 'all') {
      query = query.eq('target', targetFilter);
    }

    if (statusFilter !== 'all') {
      query = query.eq('is_active', statusFilter === 'active');
    }

    const { data, error } = await query.limit(500);

    if (error) throw error;

    // Get receipt counts for each notification
    const notificationIds = data?.map(n => n.id) || [];
    const { data: receiptCounts } = await supabase
      .from('notification_receipts')
      .select('notification_id, read_at')
      .in('notification_id', notificationIds);

    const countMap = new Map<string, { total: number; read: number }>();
    receiptCounts?.forEach(rc => {
      const current = countMap.get(rc.notification_id) || { total: 0, read: 0 };
      countMap.set(rc.notification_id, {
        total: current.total + 1,
        read: current.read + (rc.read_at ? 1 : 0)
      });
    });

    const transformedNotifications: Notification[] = (data || []).map((n: any) => ({
      ...n,
      creator_email: n.profiles?.email,
      receipt_count: countMap.get(n.id)?.total || 0,
      read_count: countMap.get(n.id)?.read || 0
    }));

    setNotifications(transformedNotifications);
  };

  const loadReceipts = async () => {
    const { data, error } = await supabase
      .from('notification_receipts')
      .select(`
        id,
        user_id,
        notification_id,
        read_at,
        action_taken,
        created_at,
        profiles:user_id (
          email
        ),
        admin_notifications:notification_id (
          title
        )
      `)
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) throw error;

    const transformedReceipts: NotificationReceipt[] = (data || []).map((r: any) => ({
      ...r,
      user_email: r.profiles?.email,
      notification_title: r.admin_notifications?.title
    }));

    setReceipts(transformedReceipts);
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('admin_notifications')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      logger.info('Notification status toggled', { id, newStatus: !currentStatus });
      await loadData();
    } catch (err) {
      logger.error('Failed to toggle notification', { error: err });
      setError(err instanceof Error ? err.message : 'Failed to toggle status');
    }
  };

  const handleOpenModal = (mode: 'create' | 'edit', notification?: Notification) => {
    setModalMode(mode);
    if (mode === 'edit' && notification) {
      setEditingNotification(notification);
      setFormData({
        title: notification.title,
        message: notification.message,
        type: notification.type,
        target: notification.target,
        target_user_ids: notification.target_user_ids || [],
        action_url: notification.action_url || '',
        expires_at: notification.expires_at ? new Date(notification.expires_at).toISOString().slice(0, 16) : ''
      });
    } else {
      setEditingNotification(null);
      setFormData({
        title: '',
        message: '',
        type: 'info',
        target: 'all',
        target_user_ids: [],
        action_url: '',
        expires_at: ''
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingNotification(null);
    setFormData({
      title: '',
      message: '',
      type: 'info',
      target: 'all',
      target_user_ids: [],
      action_url: '',
      expires_at: ''
    });
  };

  const handleSubmitNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate action_url if provided
      if (formData.action_url && formData.action_url.trim()) {
        const url = formData.action_url.trim();
        // Allow relative paths starting with / or absolute URLs
        if (!url.startsWith('/') && !url.startsWith('http://') && !url.startsWith('https://')) {
          setError('Action URL must be a relative path (starting with /) or an absolute URL');
          return;
        }
      }

      const data: any = {
        title: formData.title.trim(),
        message: formData.message.trim(),
        type: formData.type,
        target: formData.target,
        target_user_ids: formData.target === 'specific' ? formData.target_user_ids : null,
        action_url: formData.action_url.trim() || null,
        expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null
      };

      if (modalMode === 'create') {
        const { error } = await supabase
          .from('admin_notifications')
          .insert([data]);
        
        if (error) throw error;
        logger.info('Notification created', { data });
      } else if (editingNotification) {
        const { error } = await supabase
          .from('admin_notifications')
          .update(data)
          .eq('id', editingNotification.id);
        
        if (error) throw error;
        logger.info('Notification updated', { id: editingNotification.id, data });
      }

      handleCloseModal();
      await loadData();
    } catch (err) {
      logger.error('Failed to save notification', { error: err });
      setError(err instanceof Error ? err.message : 'Failed to save notification');
    }
  };

  const handleDeleteNotification = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This will also delete all associated receipts.`)) {
      return;
    }

    try {
      // First delete all receipts
      const { error: receiptsError } = await supabase
        .from('notification_receipts')
        .delete()
        .eq('notification_id', id);

      if (receiptsError) throw receiptsError;

      // Then delete the notification
      const { error } = await supabase
        .from('admin_notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;

      logger.info('Notification deleted', { id, title });
      await loadData();
    } catch (err) {
      logger.error('Failed to delete notification', { error: err });
      setError(err instanceof Error ? err.message : 'Failed to delete notification');
    }
  };

  // Batch operations
  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([]);
    } else {
      const currentPageIds = paginatedItems.map((item: any) => item.id);
      setSelectedIds(currentPageIds);
    }
    setSelectAll(!selectAll);
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;

    if (!confirm(`Are you sure you want to delete ${selectedIds.length} notification(s)? This will also delete all associated receipts.`)) {
      return;
    }

    try {
      // Delete all receipts for selected notifications
      const { error: receiptsError } = await supabase
        .from('notification_receipts')
        .delete()
        .in('notification_id', selectedIds);

      if (receiptsError) throw receiptsError;

      // Delete all selected notifications
      const { error } = await supabase
        .from('admin_notifications')
        .delete()
        .in('id', selectedIds);

      if (error) throw error;

      logger.info('Batch delete completed', { count: selectedIds.length });
      setSelectedIds([]);
      setSelectAll(false);
      await loadData();
    } catch (err) {
      logger.error('Failed to batch delete notifications', { error: err });
      setError(err instanceof Error ? err.message : 'Failed to batch delete notifications');
    }
  };

  const handleBatchToggleActive = async (active: boolean) => {
    if (selectedIds.length === 0) return;

    try {
      const { error } = await supabase
        .from('admin_notifications')
        .update({ is_active: active })
        .in('id', selectedIds);

      if (error) throw error;

      logger.info('Batch toggle active completed', { count: selectedIds.length, active });
      setSelectedIds([]);
      setSelectAll(false);
      await loadData();
    } catch (err) {
      logger.error('Failed to batch toggle active', { error: err });
      setError(err instanceof Error ? err.message : 'Failed to batch toggle active');
    }
  };

  const handleExport = () => {
    try {
      let csv = '';

      if (activeTab === 'notifications') {
        csv = [
          'Title,Type,Target,Active,Receipts,Read,Read Rate,Created,Expires',
          ...filteredItems.map((n: Notification) => {
            const readRate = n.receipt_count > 0
              ? `${Math.round((n.read_count! / n.receipt_count) * 100)}%`
              : 'N/A';
            return `"${n.title}",${n.type},${n.target},${n.is_active},${n.receipt_count},${n.read_count},${readRate},${new Date(n.created_at).toLocaleString()},${n.expires_at ? new Date(n.expires_at).toLocaleString() : 'Never'}`;
          })
        ].join('\n');
      } else {
        csv = [
          'User,Notification,Read,Action,Sent,Read At',
          ...filteredItems.map((r: NotificationReceipt) =>
            `${r.user_email || 'N/A'},"${r.notification_title || 'N/A'}",${r.read_at ? 'Yes' : 'No'},${r.action_taken || 'None'},${new Date(r.created_at).toLocaleString()},${r.read_at ? new Date(r.read_at).toLocaleString() : 'Unread'}`
          )
        ].join('\n');
      }

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeTab}_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      logger.info('Exported notifications data', { type: activeTab });
    } catch (err) {
      logger.error('Failed to export', { error: err });
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  };

  const filteredItems = activeTab === 'notifications' ? notifications : receipts;

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'info': return 'bg-blue-600/20 text-blue-400';
      case 'warning': return 'bg-yellow-600/20 text-yellow-400';
      case 'success': return 'bg-green-600/20 text-green-400';
      case 'error': return 'bg-red-600/20 text-red-400';
      default: return 'bg-gray-600/20 text-gray-400';
    }
  };

  const getTargetBadge = (target: string) => {
    switch (target) {
      case 'all': return { text: 'All Users', color: 'bg-purple-600/20 text-purple-400' };
      case 'subscribers': return { text: 'Subscribers', color: 'bg-indigo-600/20 text-indigo-400' };
      case 'free_users': return { text: 'Free Users', color: 'bg-gray-600/20 text-gray-400' };
      case 'specific': return { text: 'Specific', color: 'bg-pink-600/20 text-pink-400' };
      default: return { text: target, color: 'bg-gray-600/20 text-gray-400' };
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-600/20 rounded-lg">
            <FaBell size={24} color="#c084fc" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Notifications Management</h1>
            <p className="text-gray-400">Manage system notifications and announcements</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <div><FaFilter size={16} /></div>
            <span>Filters</span>
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <div><FaDownload size={16} /></div>
            <span>Export</span>
          </button>
          <button
            onClick={() => handleOpenModal('create')}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <div><FaPlus size={16} /></div>
            <span>New Notification</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 border border-purple-700/50 rounded-lg p-4">
          <div className="text-purple-400 text-sm mb-1 flex items-center gap-2">
            <FaBell size={12} />
            <span>Total Sent</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats.totalNotifications}</div>
        </div>

        <div className="bg-gradient-to-br from-green-900/40 to-green-800/20 border border-green-700/50 rounded-lg p-4">
          <div className="text-green-400 text-sm mb-1 flex items-center gap-2">
            <FaToggleOn size={12} />
            <span>Active</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats.activeNotifications}</div>
        </div>

        <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 border border-blue-700/50 rounded-lg p-4">
          <div className="text-blue-400 text-sm mb-1 flex items-center gap-2">
            <FaEnvelope size={12} />
            <span>Deliveries</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats.totalReceipts}</div>
        </div>

        <div className="bg-gradient-to-br from-indigo-900/40 to-indigo-800/20 border border-indigo-700/50 rounded-lg p-4">
          <div className="text-indigo-400 text-sm mb-1 flex items-center gap-2">
            <FaChartBar size={12} />
            <span>Read Rate</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats.readRate}%</div>
        </div>

        <div className="bg-gradient-to-br from-yellow-900/40 to-yellow-800/20 border border-yellow-700/50 rounded-lg p-4">
          <div className="text-yellow-400 text-sm mb-1">Sent Today</div>
          <div className="text-2xl font-bold text-white">{stats.sentToday}</div>
        </div>

        <div className="bg-gradient-to-br from-pink-900/40 to-pink-800/20 border border-pink-700/50 rounded-lg p-4">
          <div className="text-pink-400 text-sm mb-1">Avg Read Time</div>
          <div className="text-2xl font-bold text-white">{stats.avgReadTime}h</div>
        </div>
      </div>

      {/* Analytics Widget */}
      <NotificationAnalyticsWidget className="mt-6" />

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-800/60 border border-gray-700 rounded-lg p-2 mt-6">\n        <button
          onClick={() => { setActiveTab('notifications'); setCurrentPage(1); }}
          className={`flex-1 px-6 py-3 rounded-lg transition-all flex items-center justify-center gap-2 ${
            activeTab === 'notifications'
              ? 'bg-purple-600 text-white shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
          }`}
        >
          <FaBell size={18} />
          <span className="font-semibold">Notifications ({stats.totalNotifications})</span>
        </button>
        <button
          onClick={() => { setActiveTab('receipts'); setCurrentPage(1); }}
          className={`flex-1 px-6 py-3 rounded-lg transition-all flex items-center justify-center gap-2 ${
            activeTab === 'receipts'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
          }`}
        >
          <FaUsers size={18} />
          <span className="font-semibold">Delivery Log ({stats.totalReceipts})</span>
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && activeTab === 'notifications' && (
        <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Notification Filters</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600"
              >
                <option value="all">All Types</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="success">Success</option>
                <option value="error">Error</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Target</label>
              <select
                value={targetFilter}
                onChange={(e) => setTargetFilter(e.target.value as any)}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600"
              >
                <option value="all">All Targets</option>
                <option value="subscribers">Subscribers</option>
                <option value="free_users">Free Users</option>
                <option value="specific">Specific Users</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
          <div className="text-red-400">{error}</div>
        </div>
      )}

      {/* Batch Operations Bar */}
      {activeTab === 'notifications' && selectedIds.length > 0 && (
        <div className="bg-purple-900/30 border border-purple-700/50 rounded-lg p-4 flex items-center justify-between">
          <div className="text-purple-300 font-medium">
            {selectedIds.length} notification(s) selected
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleBatchToggleActive(true)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <div><FaToggleOn size={16} /></div>
              <span>Activate</span>
            </button>
            <button
              onClick={() => handleBatchToggleActive(false)}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <div><FaToggleOff size={16} /></div>
              <span>Deactivate</span>
            </button>
            <button
              onClick={handleBatchDelete}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <div><FaTrash size={16} /></div>
              <span>Delete Selected</span>
            </button>
          </div>
        </div>
      )}

      {/* Content Table */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="text-purple-400 text-lg">Loading {activeTab}...</div>
        </div>
      ) : (
        <div className="bg-gray-800/60 border border-gray-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            {activeTab === 'notifications' ? (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-700/50 border-b border-gray-600">
                    <th className="p-4 text-left">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={handleToggleSelectAll}
                        className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-purple-600 focus:ring-purple-500"
                      />
                    </th>
                    <th className="p-4 text-left text-gray-300 font-semibold">Title</th>
                    <th className="p-4 text-left text-gray-300 font-semibold">Type</th>
                    <th className="p-4 text-left text-gray-300 font-semibold">Target</th>
                    <th className="p-4 text-left text-gray-300 font-semibold">Status</th>
                    <th className="p-4 text-left text-gray-300 font-semibold">Deliveries</th>
                    <th className="p-4 text-left text-gray-300 font-semibold">Read Rate</th>
                    <th className="p-4 text-left text-gray-300 font-semibold">Created</th>
                    <th className="p-4 text-left text-gray-300 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((notif: Notification) => {
                    const readRate = notif.receipt_count > 0
                      ? Math.round((notif.read_count! / notif.receipt_count) * 100)
                      : 0;
                    const targetBadge = getTargetBadge(notif.target);
                    
                    return (
                      <tr key={notif.id} className="border-b border-gray-700 hover:bg-gray-700/30 transition-colors">
                        <td className="p-4">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(notif.id)}
                            onChange={() => handleToggleSelect(notif.id)}
                            className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-purple-600 focus:ring-purple-500"
                          />
                        </td>
                        <td className="p-4">
                          <div className="text-white font-medium">{notif.title}</div>
                          <div className="text-gray-400 text-xs mt-1 line-clamp-1">{notif.message}</div>
                        </td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(notif.type)}`}>
                            {notif.type.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${targetBadge.color}`}>
                            {targetBadge.text}
                          </span>
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => handleToggleActive(notif.id, notif.is_active)}
                            className="flex items-center gap-2"
                          >
                            {notif.is_active ? (
                              <div className="text-green-400"><FaToggleOn size={20} /></div>
                            ) : (
                              <div className="text-gray-500"><FaToggleOff size={20} /></div>
                            )}
                          </button>
                        </td>
                        <td className="p-4 text-blue-400 font-bold">{notif.receipt_count || 0}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-700 rounded-full h-2">
                              <div
                                className="bg-indigo-500 h-2 rounded-full"
                                style={{ width: `${readRate}%` }}
                              />
                            </div>
                            <span className="text-indigo-400 text-sm font-medium">{readRate}%</span>
                          </div>
                        </td>
                        <td className="p-4 text-gray-400 text-sm">
                          {new Date(notif.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleOpenModal('edit', notif)}
                              className="p-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded-lg transition-colors"
                              title="Edit Notification"
                            >
                              <FaEye size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteNotification(notif.id, notif.title)}
                              className="p-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <FaTrash size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-700/50 border-b border-gray-600">
                    <th className="p-4 text-left text-gray-300 font-semibold">User</th>
                    <th className="p-4 text-left text-gray-300 font-semibold">Notification</th>
                    <th className="p-4 text-left text-gray-300 font-semibold">Status</th>
                    <th className="p-4 text-left text-gray-300 font-semibold">Action</th>
                    <th className="p-4 text-left text-gray-300 font-semibold">Sent</th>
                    <th className="p-4 text-left text-gray-300 font-semibold">Read At</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((receipt: NotificationReceipt) => (
                    <tr key={receipt.id} className="border-b border-gray-700 hover:bg-gray-700/30 transition-colors">
                      <td className="p-4 text-blue-400">{receipt.user_email || 'N/A'}</td>
                      <td className="p-4 text-white">{receipt.notification_title || 'N/A'}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          receipt.read_at
                            ? 'bg-green-600/20 text-green-400'
                            : 'bg-gray-600/20 text-gray-400'
                        }`}>
                          {receipt.read_at ? 'READ' : 'UNREAD'}
                        </span>
                      </td>
                      <td className="p-4 text-gray-400 text-sm">{receipt.action_taken || 'None'}</td>
                      <td className="p-4 text-gray-400 text-sm">
                        {new Date(receipt.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-gray-400 text-sm">
                        {receipt.read_at ? new Date(receipt.read_at).toLocaleString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          <div className="bg-gray-700/30 px-6 py-4 flex items-center justify-between">
            <div className="text-gray-400 text-sm">
              Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredItems.length)} of {filteredItems.length} {activeTab}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                Previous
              </button>
              {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                const pageNum = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
                if (pageNum > totalPages) return null;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      currentPage === pageNum
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-white'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <div className="text-purple-400"><FaBell /></div>
                {modalMode === 'create' ? 'Create New Notification' : 'Edit Notification'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-400"
              >
                <div><FaTrash size={18} /></div>
              </button>
            </div>

            <form onSubmit={handleSubmitNotification} className="p-6 space-y-6">
              {/* Title */}
              <div>
                <label className="block text-gray-300 font-medium mb-2">
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Notification title"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-gray-300 font-medium mb-2">
                  Message <span className="text-red-400">*</span>
                </label>
                <textarea
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  placeholder="Notification message"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-gray-300 font-medium mb-2">
                  Type <span className="text-red-400">*</span>
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="info">Info</option>
                  <option value="success">Success</option>
                  <option value="warning">Warning</option>
                  <option value="error">Error</option>
                </select>
              </div>

              {/* Target */}
              <div>
                <label className="block text-gray-300 font-medium mb-2">
                  Target <span className="text-red-400">*</span>
                </label>
                <select
                  value={formData.target}
                  onChange={(e) => setFormData({ ...formData, target: e.target.value as any })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Users</option>
                  <option value="subscribers">Subscribers Only</option>
                  <option value="free_users">Free Users Only</option>
                  <option value="specific">Specific Users</option>
                </select>
              </div>

              {/* Action URL */}
              <div>
                <label className="block text-gray-300 font-medium mb-2">
                  Action URL (Deep Link)
                </label>
                <input
                  type="text"
                  value={formData.action_url}
                  onChange={(e) => setFormData({ ...formData, action_url: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="/app/dashboard or https://example.com"
                />
                <p className="mt-2 text-sm text-gray-400">
                  Optional. Use relative path (e.g., /app/dashboard) or absolute URL (e.g., https://example.com).
                  When users click the notification, they&apos;ll be navigated to this URL.
                </p>
              </div>

              {/* Expires At */}
              <div>
                <label className="block text-gray-300 font-medium mb-2">
                  Expires At
                </label>
                <input
                  type="datetime-local"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="mt-2 text-sm text-gray-400">
                  Optional. Leave empty for notifications that don&apos;t expire.
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                >
                  {modalMode === 'create' ? 'Create Notification' : 'Update Notification'}
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsManagement;
