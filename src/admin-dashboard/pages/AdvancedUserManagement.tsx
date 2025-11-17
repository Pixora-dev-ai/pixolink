import React, { useState, useEffect } from 'react';
import { FaUsers, FaSearch, FaFilter, FaDownload, FaPlus, FaEdit, FaTrash, FaEye, FaShieldAlt, FaCoins, FaHistory, FaCheck, FaTimes, FaSpinner } from 'react-icons/fa';
import { getGuardian } from '../logic-guardian';
import * as adminService from '../../../services/adminService';
import { BulkAddCreditsModal } from '../components/BulkAddCreditsModal';
import { BulkChangeRoleModal } from '../components/BulkChangeRoleModal';

const guardian = getGuardian();
const logger = guardian.logger;

interface User {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  plan: 'free' | 'studio' | 'pro' | 'agency';
  credits_balance: number;
  is_admin: boolean;
  backup_enabled: boolean;
  created_at: string;
  subscription_status: string | null;
  total_credits_added: number | null;
  total_credits_used: number | null;
}

const AdvancedUserManagement: React.FC = () => {
  // State management
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showAddCreditsModal, setShowAddCreditsModal] = useState(false);
  const [showChangeRoleModal, setShowChangeRoleModal] = useState(false);

  // Filter state
  const [filters, setFilters] = useState({
    plan: '' as 'free' | 'studio' | 'pro' | 'agency' | '',
    minCredits: '',
    maxCredits: '',
    isAdmin: '' as 'true' | 'false' | '',
    subscriptionStatus: '',
    startDate: '',
    endDate: ''
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(20);

  // Load users
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
  const data = await adminService.advancedUserSearch({ limit: 1000, offset: 0 });
      setUsers(data);
      logger.info('Users loaded', { count: data.length });
    } catch (err) {
      logger.error('Failed to load users', { error: err });
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      await loadUsers();
      return;
    }

    try {
      setLoading(true);
      const data = await adminService.searchUsers(searchQuery);
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = async () => {
    try {
      setLoading(true);
      const filterParams: any = {};

      if (filters.plan) filterParams.plan = filters.plan;
      if (filters.minCredits) filterParams.minCredits = parseInt(filters.minCredits);
      if (filters.maxCredits) filterParams.maxCredits = parseInt(filters.maxCredits);
      if (filters.isAdmin) filterParams.isAdmin = filters.isAdmin === 'true';
      if (filters.subscriptionStatus) filterParams.subscriptionStatus = filters.subscriptionStatus;
      if (filters.startDate) filterParams.startDate = filters.startDate;
      if (filters.endDate) filterParams.endDate = filters.endDate;

      const data = await adminService.advancedUserSearch(filterParams);
      setUsers(data);
      setShowFilters(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Filter failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedUsers.size === paginatedUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(paginatedUsers.map(u => u.id)));
    }
  };

  const handleExport = async () => {
    try {
      const csv = await adminService.exportUsersToCSV();
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  };

  const handleExportSelected = () => {
    try {
      const selectedData = users.filter(u => selectedUsers.has(u.id));
      const csv = [
        'Email,Full Name,Plan,Credits,Admin,Created',
        ...selectedData.map(u => 
          `${u.email || 'N/A'},${u.full_name || 'N/A'},${u.plan},${u.credits_balance},${u.is_admin ? 'Yes' : 'No'},${new Date(u.created_at).toLocaleDateString()}`
        )
      ].join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users_selected_${selectedUsers.size}_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      logger.info('Exported selected users', { count: selectedUsers.size });
    } catch (err) {
      logger.error('Failed to export selected users', { error: err });
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  };

  const handleBulkActionComplete = () => {
    // Reload users after bulk action
    loadUsers();
    // Clear selection
    setSelectedUsers(new Set());
  };

  // Pagination logic
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const paginatedUsers = users.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(users.length / usersPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // Plan badge color
  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'free': return 'bg-gray-600';
      case 'studio': return 'bg-blue-600';
      case 'pro': return 'bg-purple-600';
      case 'agency': return 'bg-pink-600';
      default: return 'bg-gray-600';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-600/20 rounded-lg">
            <FaUsers size={24} color="#c084fc" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">User Management</h1>
            <p className="text-gray-400">Manage and monitor all platform users</p>
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
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-4">
          <div className="text-gray-400 text-sm mb-1">Total Users</div>
          <div className="text-2xl font-bold text-white">{users.length}</div>
        </div>
        <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-4">
          <div className="text-gray-400 text-sm mb-1">Selected</div>
          <div className="text-2xl font-bold text-purple-400">{selectedUsers.size}</div>
        </div>
        <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-4">
          <div className="text-gray-400 text-sm mb-1">Admin Users</div>
          <div className="text-2xl font-bold text-green-400">
            {users.filter(u => u.is_admin).length}
          </div>
        </div>
        <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-4">
          <div className="text-gray-400 text-sm mb-1">Active Subscriptions</div>
          <div className="text-2xl font-bold text-blue-400">
            {users.filter(u => u.subscription_status === 'active').length}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <FaSearch size={16} />
            </div>
            <input
              type="text"
              placeholder="Search by email or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full bg-gray-700 text-white pl-10 pr-4 py-2 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Search
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Advanced Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Plan</label>
              <select
                value={filters.plan}
                onChange={(e) => setFilters({...filters, plan: e.target.value as any})}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600"
              >
                <option value="">All Plans</option>
                <option value="free">Free</option>
                <option value="studio">Studio</option>
                <option value="pro">Pro</option>
                <option value="agency">Agency</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Min Credits</label>
              <input
                type="number"
                value={filters.minCredits}
                onChange={(e) => setFilters({...filters, minCredits: e.target.value})}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Max Credits</label>
              <input
                type="number"
                value={filters.maxCredits}
                onChange={(e) => setFilters({...filters, maxCredits: e.target.value})}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600"
                placeholder="10000"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Admin Status</label>
              <select
                value={filters.isAdmin}
                onChange={(e) => setFilters({...filters, isAdmin: e.target.value as any})}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600"
              >
                <option value="">All Users</option>
                <option value="true">Admins Only</option>
                <option value="false">Non-Admins</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={handleApplyFilters}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              Apply Filters
            </button>
            <button
              onClick={() => {
                setFilters({
                  plan: '',
                  minCredits: '',
                  maxCredits: '',
                  isAdmin: '',
                  subscriptionStatus: '',
                  startDate: '',
                  endDate: ''
                });
                loadUsers();
              }}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* Bulk Actions Bar */}
      {selectedUsers.size > 0 && (
        <div className="bg-purple-600/20 border border-purple-500/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-white font-semibold">{selectedUsers.size} user(s) selected</div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddCreditsModal(true)}
                disabled={selectedUsers.size === 0}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <div><FaCoins size={16} /></div>
                <span>Add Credits</span>
              </button>
              <button
                onClick={() => setShowChangeRoleModal(true)}
                disabled={selectedUsers.size === 0}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <div><FaShieldAlt size={16} /></div>
                <span>Change Role</span>
              </button>
              <button
                onClick={handleExportSelected}
                disabled={selectedUsers.size === 0}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <div><FaDownload size={16} /></div>
                <span>Export Selected</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="text-purple-400 animate-spin">
            <FaSpinner size={32} />
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-400">
            <FaTimes size={16} />
            <span>{error}</span>
          </div>
        </div>
      ) : (
        <div className="bg-gray-800/60 border border-gray-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-700/50 border-b border-gray-600">
                  <th className="p-4 text-left">
                    <input
                      type="checkbox"
                      checked={selectedUsers.size === paginatedUsers.length && paginatedUsers.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 cursor-pointer"
                    />
                  </th>
                  <th className="p-4 text-left text-gray-300 font-semibold">Email</th>
                  <th className="p-4 text-left text-gray-300 font-semibold">Name</th>
                  <th className="p-4 text-left text-gray-300 font-semibold">Plan</th>
                  <th className="p-4 text-left text-gray-300 font-semibold">Credits</th>
                  <th className="p-4 text-left text-gray-300 font-semibold">Admin</th>
                  <th className="p-4 text-left text-gray-300 font-semibold">Joined</th>
                  <th className="p-4 text-left text-gray-300 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((user) => (
                  <tr key={user.id} className="border-b border-gray-700 hover:bg-gray-700/30 transition-colors">
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(user.id)}
                        onChange={() => handleSelectUser(user.id)}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td className="p-4 text-white">{user.email || 'N/A'}</td>
                    <td className="p-4 text-gray-300">{user.full_name || 'N/A'}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${getPlanColor(user.plan)}`}>
                        {user.plan.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-gray-300">{user.credits_balance.toLocaleString()}</td>
                    <td className="p-4">
                      {user.is_admin ? (
                        <span className="text-green-400 flex items-center gap-1">
                          <FaCheck size={14} /> Yes
                        </span>
                      ) : (
                        <span className="text-gray-500">No</span>
                      )}
                    </td>
                    <td className="p-4 text-gray-400 text-sm">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowUserModal(true);
                          }}
                          className="p-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <FaEye size={14} />
                        </button>
                        <button
                          className="p-2 bg-green-600/20 hover:bg-green-600/40 text-green-400 rounded-lg transition-colors"
                          title="Add Credits"
                        >
                          <FaCoins size={14} />
                        </button>
                        <button
                          className="p-2 bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-400 rounded-lg transition-colors"
                          title="View History"
                        >
                          <FaHistory size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="bg-gray-700/30 px-6 py-4 flex items-center justify-between">
            <div className="text-gray-400 text-sm">
              Showing {indexOfFirstUser + 1} to {Math.min(indexOfLastUser, users.length)} of {users.length} users
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => paginate(currentPage - 1)}
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
                    onClick={() => paginate(pageNum)}
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
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Details Modal (Placeholder) */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-2xl w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">User Details</h2>
              <button
                onClick={() => setShowUserModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <FaTimes size={20} />
              </button>
            </div>
            <div className="space-y-4 text-white">
              <p><strong>Email:</strong> {selectedUser.email}</p>
              <p><strong>Name:</strong> {selectedUser.full_name}</p>
              <p><strong>Plan:</strong> {selectedUser.plan}</p>
              <p><strong>Credits:</strong> {selectedUser.credits_balance}</p>
              <p><strong>Admin:</strong> {selectedUser.is_admin ? 'Yes' : 'No'}</p>
              <p><strong>Joined:</strong> {new Date(selectedUser.created_at).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Add Credits Modal */}
      {showAddCreditsModal && (
        <BulkAddCreditsModal
          selectedUserIds={Array.from(selectedUsers)}
          selectedUserEmails={users.filter(u => selectedUsers.has(u.id)).map(u => u.email || 'N/A')}
          onClose={() => setShowAddCreditsModal(false)}
          onSuccess={handleBulkActionComplete}
        />
      )}

      {/* Bulk Change Role Modal */}
      {showChangeRoleModal && (
        <BulkChangeRoleModal
          selectedUserIds={Array.from(selectedUsers)}
          selectedUserEmails={users.filter(u => selectedUsers.has(u.id)).map(u => u.email || 'N/A')}
          onClose={() => setShowChangeRoleModal(false)}
          onSuccess={handleBulkActionComplete}
        />
      )}
    </div>
  );
};

export default AdvancedUserManagement;
