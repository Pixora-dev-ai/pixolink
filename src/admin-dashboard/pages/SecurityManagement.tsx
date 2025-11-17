import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabase';
import { logger } from '../../../utils/logger';
import { 
  FaShieldAlt, 
  FaExclamationTriangle, 
  FaHistory, 
  FaUserShield,
  FaDownload,
  FaSearch,
  FaFilter,
  FaChevronLeft,
  FaChevronRight
} from 'react-icons/fa';

interface AuditLog {
  id: string;
  admin_id: string | null;
  action: string;
  details: any;
  created_at: string;
  admin_email?: string;
  admin_full_name?: string;
}

interface SecurityStats {
  totalLogs: number;
  logsToday: number;
  uniqueAdmins: number;
  criticalActions: number;
}

const ITEMS_PER_PAGE = 20;

const SecurityManagement: React.FC = () => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<SecurityStats>({
    totalLogs: 0,
    logsToday: 0,
    uniqueAdmins: 0,
    criticalActions: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Action type colors for badges
  const getActionColor = (action: string): string => {
    const actionLower = action.toLowerCase();
    if (actionLower.includes('delete') || actionLower.includes('remove')) return 'bg-red-500/20 text-red-400 border-red-500/30';
    if (actionLower.includes('create') || actionLower.includes('add')) return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (actionLower.includes('update') || actionLower.includes('edit') || actionLower.includes('change')) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    if (actionLower.includes('login') || actionLower.includes('auth')) return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    if (actionLower.includes('ban') || actionLower.includes('suspend') || actionLower.includes('block')) return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  // Check if action is critical
  const isCriticalAction = (action: string): boolean => {
    const criticalKeywords = ['delete', 'remove', 'ban', 'suspend', 'block', 'revoke'];
    return criticalKeywords.some(keyword => action.toLowerCase().includes(keyword));
  };

  // Load audit logs from database
  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('admin_audit_log')
        .select(`
          id,
          admin_id,
          action,
          details,
          created_at,
          profiles!admin_audit_log_admin_id_fkey(email, full_name)
        `)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const logsWithAdmin = (data || []).map((log: any) => ({
        id: log.id,
        admin_id: log.admin_id,
        action: log.action,
        details: log.details,
        created_at: log.created_at,
        admin_email: log.profiles?.email || 'System',
        admin_full_name: log.profiles?.full_name || 'System'
      }));

      setAuditLogs(logsWithAdmin);
      setFilteredLogs(logsWithAdmin);
      calculateStats(logsWithAdmin);
    } catch (err: any) {
      logger.error('Failed to load audit logs:', err);
      setError(err.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const calculateStats = (logs: AuditLog[]) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const logsToday = logs.filter(log => new Date(log.created_at) >= todayStart).length;
    const uniqueAdmins = new Set(logs.map(log => log.admin_id).filter(Boolean)).size;
    const criticalActions = logs.filter(log => isCriticalAction(log.action)).length;

    setStats({
      totalLogs: logs.length,
      logsToday,
      uniqueAdmins,
      criticalActions
    });
  };

  // Apply filters and search
  useEffect(() => {
    let filtered = [...auditLogs];

    // Action filter
    if (actionFilter !== 'all') {
      filtered = filtered.filter(log => 
        log.action.toLowerCase().includes(actionFilter.toLowerCase())
      );
    }

    // Search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(log =>
        log.action.toLowerCase().includes(query) ||
        log.admin_email?.toLowerCase().includes(query) ||
        log.admin_full_name?.toLowerCase().includes(query) ||
        JSON.stringify(log.details).toLowerCase().includes(query)
      );
    }

    setFilteredLogs(filtered);
    setCurrentPage(1);
  }, [searchQuery, actionFilter, auditLogs]);

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Timestamp', 'Admin Email', 'Admin Name', 'Action', 'Details'];
    const rows = filteredLogs.map(log => [
      new Date(log.created_at).toLocaleString(),
      log.admin_email || 'System',
      log.admin_full_name || 'System',
      log.action,
      JSON.stringify(log.details || {})
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get unique action types for filter
  const actionTypes = ['all', ...Array.from(new Set(auditLogs.map(log => {
    const action = log.action.toLowerCase();
    if (action.includes('create') || action.includes('add')) return 'create';
    if (action.includes('update') || action.includes('edit') || action.includes('change')) return 'update';
    if (action.includes('delete') || action.includes('remove')) return 'delete';
    if (action.includes('login') || action.includes('auth')) return 'auth';
    if (action.includes('ban') || action.includes('suspend')) return 'ban';
    return 'other';
  }))).sort()];

  useEffect(() => {
    loadAuditLogs();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white text-xl">Loading security logs...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <span className="text-red-500 text-3xl">
              <FaShieldAlt />
            </span>
            <h1 className="text-3xl font-bold text-white">Security Dashboard</h1>
          </div>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-lg hover:from-red-700 hover:to-orange-700 transition-all"
          >
            <span><FaDownload /></span>
            Export Audit Log
          </button>
        </div>
        <p className="text-gray-400">Monitor admin actions and security events</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
          <span className="inline-block mr-2"><FaExclamationTriangle /></span>
          {error}
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Logs */}
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-blue-400 text-2xl">
              <FaHistory />
            </span>
            <span className="text-3xl font-bold text-white">{stats.totalLogs}</span>
          </div>
          <h3 className="text-blue-300 font-semibold">Total Audit Logs</h3>
          <p className="text-gray-400 text-sm mt-1">All recorded actions</p>
        </div>

        {/* Logs Today */}
        <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-green-400 text-2xl">
              <FaHistory />
            </span>
            <span className="text-3xl font-bold text-white">{stats.logsToday}</span>
          </div>
          <h3 className="text-green-300 font-semibold">Actions Today</h3>
          <p className="text-gray-400 text-sm mt-1">Last 24 hours</p>
        </div>

        {/* Active Admins */}
        <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-purple-400 text-2xl">
              <FaUserShield />
            </span>
            <span className="text-3xl font-bold text-white">{stats.uniqueAdmins}</span>
          </div>
          <h3 className="text-purple-300 font-semibold">Active Admins</h3>
          <p className="text-gray-400 text-sm mt-1">Unique administrators</p>
        </div>

        {/* Critical Actions */}
        <div className="bg-gradient-to-br from-red-500/10 to-orange-600/5 border border-red-500/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-red-400 text-2xl">
              <FaExclamationTriangle />
            </span>
            <span className="text-3xl font-bold text-white">{stats.criticalActions}</span>
          </div>
          <h3 className="text-red-300 font-semibold">Critical Actions</h3>
          <p className="text-gray-400 text-sm mt-1">Deletions, bans, etc.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div>
            <label className="block text-gray-300 mb-2 text-sm font-medium">
              <span className="inline-block mr-2"><FaSearch /></span>
              Search
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by action, admin, or details..."
              className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/50"
            />
          </div>

          {/* Action Type Filter */}
          <div>
            <label className="block text-gray-300 mb-2 text-sm font-medium">
              <span className="inline-block mr-2"><FaFilter /></span>
              Action Type
            </label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500/50"
            >
              {actionTypes.map(type => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700/50 border-b border-gray-600/50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Timestamp</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Admin</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Action</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/30">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                    No audit logs found
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-700/20 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-300">
                      <div className="flex flex-col">
                        <span className="font-medium">{formatTimestamp(log.created_at)}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex flex-col">
                        <span className="text-white font-medium">{log.admin_full_name}</span>
                        <span className="text-gray-400 text-xs">{log.admin_email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${getActionColor(log.action)}`}>
                        {isCriticalAction(log.action) && (
                          <span className="text-red-400"><FaExclamationTriangle /></span>
                        )}
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      <div className="max-w-md overflow-hidden">
                        <pre className="text-xs whitespace-pre-wrap break-words">
                          {JSON.stringify(log.details || {}, null, 2)}
                        </pre>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-gray-700/30 border-t border-gray-600/50 flex items-center justify-between">
            <div className="text-sm text-gray-400">
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredLogs.length)} of {filteredLogs.length} logs
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                <span><FaChevronLeft /></span>
                Previous
              </button>
              <span className="text-gray-300 px-4">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                Next
                <span><FaChevronRight /></span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SecurityManagement;
