import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaGift, 
  FaPlus, 
  FaPenToSquare, 
  FaTrash, 
  FaToggleOn, 
  FaToggleOff,
  FaEye,
  FaTrophy,
  FaChartLine,
  FaFilter,
  FaStar,
  FaCalendar,
  FaBullseye,
  FaFloppyDisk,
  FaXmark,
  FaCrown,
  FaMedal
} from 'react-icons/fa6';
import { supabase } from "../../services/supabase";
import { useAuth } from "../../contexts/AuthContext";

interface Reward {
  id: string;
  type: 'gift' | 'contest' | 'promotion' | 'achievement' | 'bonus';
  title: string;
  description: string;
  image_url: string | null;
  icon: string | null;
  reward_type: 'credits' | 'subscription' | 'feature_unlock' | 'badge' | null;
  reward_amount: number | null;
  reward_data: any;
  target_plan: string[] | null;
  target_users: string[] | null;
  action_label: string | null;
  action_url: string | null;
  priority: number;
  is_active: boolean;
  is_featured: boolean;
  badge_text: string | null;
  start_date: string;
  end_date: string | null;
  max_claims: number | null;
  current_claims: number;
  claim_limit_per_user: number;
  created_at: string;
  updated_at: string;
}

const AdminRewardsManager: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterType, setFilterType] = useState<string>('all');

  // Form state
  const [formData, setFormData] = useState({
    type: 'gift' as const,
    title: '',
    description: '',
    image_url: '',
    icon: 'FaGift',
    reward_type: 'credits' as const,
    reward_amount: 100,
    action_label: 'Claim Now',
    action_url: '',
    priority: 50,
    is_active: true,
    is_featured: false,
    badge_text: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    max_claims: null as number | null,
    claim_limit_per_user: 1,
    target_plan: [] as string[],
  });

  const fetchRewards = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('rewards')
        .select('*')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRewards(data || []);
    } catch (error) {
      console.error('Error fetching rewards:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!profile?.is_admin) {
      navigate('/app/home');
      return;
    }
    fetchRewards();
  }, [profile, navigate, fetchRewards]);

  const handleCreateReward = async () => {
    try {
      const { error } = await supabase
        .from('rewards')
        .insert([{
          ...formData,
          created_by: profile?.id,
          end_date: formData.end_date || null,
          target_plan: formData.target_plan.length > 0 ? formData.target_plan : null,
        }]);

      if (error) throw error;

      setShowCreateModal(false);
      resetForm();
      fetchRewards();
    } catch (error) {
      console.error('Error creating reward:', error);
      alert('Failed to create reward');
    }
  };

  const handleUpdateReward = async () => {
    if (!editingReward) return;

    try {
      const { error } = await supabase
        .from('rewards')
        .update({
          ...formData,
          end_date: formData.end_date || null,
          target_plan: formData.target_plan.length > 0 ? formData.target_plan : null,
        })
        .eq('id', editingReward.id);

      if (error) throw error;

      setEditingReward(null);
      resetForm();
      fetchRewards();
    } catch (error) {
      console.error('Error updating reward:', error);
      alert('Failed to update reward');
    }
  };

  const handleDeleteReward = async (id: string) => {
    if (!confirm('Are you sure you want to delete this reward?')) return;

    try {
      const { error } = await supabase
        .from('rewards')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchRewards();
    } catch (error) {
      console.error('Error deleting reward:', error);
      alert('Failed to delete reward');
    }
  };

  const handleToggleActive = async (reward: Reward) => {
    try {
      const { error } = await supabase
        .from('rewards')
        .update({ is_active: !reward.is_active })
        .eq('id', reward.id);

      if (error) throw error;
      fetchRewards();
    } catch (error) {
      console.error('Error toggling reward status:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'gift',
      title: '',
      description: '',
      image_url: '',
      icon: 'FaGift',
      reward_type: 'credits',
      reward_amount: 100,
      action_label: 'Claim Now',
      action_url: '',
      priority: 50,
      is_active: true,
      is_featured: false,
      badge_text: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      max_claims: null,
      claim_limit_per_user: 1,
      target_plan: [],
    });
  };

  const openEditModal = (reward: Reward) => {
    setEditingReward(reward);
    setFormData({
      type: reward.type,
      title: reward.title,
      description: reward.description,
      image_url: reward.image_url || '',
      icon: reward.icon || 'FaGift',
      reward_type: reward.reward_type || 'credits',
      reward_amount: reward.reward_amount || 100,
      action_label: reward.action_label || 'Claim Now',
      action_url: reward.action_url || '',
      priority: reward.priority,
      is_active: reward.is_active,
      is_featured: reward.is_featured,
      badge_text: reward.badge_text || '',
      start_date: reward.start_date.split('T')[0],
      end_date: reward.end_date ? reward.end_date.split('T')[0] : '',
      max_claims: reward.max_claims,
      claim_limit_per_user: reward.claim_limit_per_user,
      target_plan: reward.target_plan || [],
    });
    setShowCreateModal(true);
  };

  const filteredRewards = rewards.filter(reward => {
    if (filterStatus !== 'all' && reward.is_active !== (filterStatus === 'active')) return false;
    if (filterType !== 'all' && reward.type !== filterType) return false;
    return true;
  });

  const totalStats = {
    totalRewards: rewards.length,
    activeRewards: rewards.filter(r => r.is_active).length,
    totalClaims: rewards.reduce((sum, r) => sum + r.current_claims, 0),
    featuredRewards: rewards.filter(r => r.is_featured).length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-800 rounded w-1/3"></div>
            <div className="h-64 bg-gray-800 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <FaGift className="text-purple-400" />
                Rewards & Offers Manager
              </h1>
              <p className="text-gray-400 mt-2">
                Create and manage rewards, contests, and promotional offers
              </p>
            </div>
            <button
              onClick={() => {
                setEditingReward(null);
                resetForm();
                setShowCreateModal(true);
              }}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all"
            >
              <FaPlus />
              Create New Reward
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Rewards</p>
                  <p className="text-2xl font-bold mt-1">{totalStats.totalRewards}</p>
                </div>
                <FaGift className="text-purple-400 text-3xl" />
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Active</p>
                  <p className="text-2xl font-bold mt-1 text-green-400">{totalStats.activeRewards}</p>
                </div>
                <FaToggleOn className="text-green-400 text-3xl" />
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Claims</p>
                  <p className="text-2xl font-bold mt-1 text-blue-400">{totalStats.totalClaims}</p>
                </div>
                <FaChartLine className="text-blue-400 text-3xl" />
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Featured</p>
                  <p className="text-2xl font-bold mt-1 text-yellow-400">{totalStats.featuredRewards}</p>
                </div>
                <FaStar className="text-yellow-400 text-3xl" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-gray-800 rounded-lg p-4 flex flex-wrap gap-4 mb-6">
            <div className="flex items-center gap-2">
              <FaFilter className="text-gray-400" />
              <span className="text-sm text-gray-400">Filters:</span>
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
            >
              <option value="all">All Types</option>
              <option value="gift">Gift</option>
              <option value="contest">Contest</option>
              <option value="promotion">Promotion</option>
              <option value="achievement">Achievement</option>
              <option value="bonus">Bonus</option>
            </select>
          </div>
        </div>

        {/* Rewards Table */}
        <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-750 border-b border-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Reward Details</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Type & Reward</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Claims</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Schedule</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredRewards.map((reward) => (
                  <tr key={reward.id} className="hover:bg-gray-750 transition-colors">
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleActive(reward)}
                        className="flex items-center gap-2"
                      >
                        {reward.is_active ? (
                          <FaToggleOn className="text-green-400 text-2xl" />
                        ) : (
                          <FaToggleOff className="text-gray-500 text-2xl" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        {reward.image_url && (
                          <img src={reward.image_url} alt={reward.title} className="w-12 h-12 rounded object-cover" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-white truncate">{reward.title}</h3>
                            {reward.is_featured && <FaStar className="text-yellow-400 text-sm flex-shrink-0" />}
                          </div>
                          <p className="text-sm text-gray-400 truncate mt-1">{reward.description}</p>
                          <div className="flex gap-2 mt-2">
                            <span className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300">
                              Priority: {reward.priority}
                            </span>
                            {reward.badge_text && (
                              <span className="text-xs px-2 py-1 rounded bg-purple-600 text-white">
                                {reward.badge_text}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          reward.type === 'gift' ? 'bg-purple-500/20 text-purple-400' :
                          reward.type === 'contest' ? 'bg-orange-500/20 text-orange-400' :
                          reward.type === 'promotion' ? 'bg-blue-500/20 text-blue-400' :
                          reward.type === 'achievement' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-green-500/20 text-green-400'
                        }`}>
                          {reward.type}
                        </span>
                        <p className="text-sm text-gray-400">
                          {reward.reward_type === 'credits' && `${reward.reward_amount} Credits`}
                          {reward.reward_type === 'subscription' && `${reward.reward_amount} Days Sub`}
                          {reward.reward_type === 'badge' && 'Badge Reward'}
                          {reward.reward_type === 'feature_unlock' && 'Feature Unlock'}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{reward.current_claims} / {reward.max_claims || '∞'}</p>
                        <p className="text-xs text-gray-400">Per user: {reward.claim_limit_per_user}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1 text-sm">
                        <p className="text-gray-400">
                          <FaCalendar className="inline text-xs mr-1" />
                          {new Date(reward.start_date).toLocaleDateString()}
                        </p>
                        {reward.end_date && (
                          <p className="text-gray-400">
                            → {new Date(reward.end_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditModal(reward)}
                          className="p-2 hover:bg-gray-700 rounded transition-colors"
                          title="Edit"
                        >
                          <FaPenToSquare className="text-blue-400" />
                        </button>
                        <button
                          onClick={() => handleDeleteReward(reward.id)}
                          className="p-2 hover:bg-gray-700 rounded transition-colors"
                          title="Delete"
                        >
                          <FaTrash className="text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {filteredRewards.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <FaGift className="mx-auto text-6xl mb-4 opacity-50" />
            <p>No rewards found</p>
          </div>
        )}

        {/* Create/Edit Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-gray-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <FaGift className="text-purple-400" />
                  {editingReward ? 'Edit Reward' : 'Create New Reward'}
                </h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingReward(null);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <FaXmark className="text-2xl" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Basic Information */}
                <div>
                  <label className="block text-sm font-medium mb-2">Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="e.g., Double Credits Weekend"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description *</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    rows={3}
                    placeholder="Describe your reward..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Image URL</label>
                  <input
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                {/* Type and Reward Configuration */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="gift">Gift</option>
                      <option value="contest">Contest</option>
                      <option value="promotion">Promotion</option>
                      <option value="achievement">Achievement</option>
                      <option value="bonus">Bonus</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Reward Type</label>
                    <select
                      value={formData.reward_type}
                      onChange={(e) => setFormData({ ...formData, reward_type: e.target.value as any })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="credits">Credits</option>
                      <option value="subscription">Subscription Days</option>
                      <option value="badge">Badge</option>
                      <option value="feature_unlock">Feature Unlock</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Reward Amount</label>
                  <input
                    type="number"
                    value={formData.reward_amount}
                    onChange={(e) => setFormData({ ...formData, reward_amount: parseInt(e.target.value) })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-purple-500"
                    placeholder="100"
                  />
                </div>

                {/* CTA */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Action Label</label>
                    <input
                      type="text"
                      value={formData.action_label}
                      onChange={(e) => setFormData({ ...formData, action_label: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500"
                      placeholder="Claim Now"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Action URL</label>
                    <input
                      type="text"
                      value={formData.action_url}
                      onChange={(e) => setFormData({ ...formData, action_url: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500"
                      placeholder="/app/studio"
                    />
                  </div>
                </div>

                {/* Priority and Badge */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Priority: {formData.priority}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Badge Text</label>
                    <input
                      type="text"
                      value={formData.badge_text}
                      onChange={(e) => setFormData({ ...formData, badge_text: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500"
                      placeholder="NEW, HOT, LIMITED"
                    />
                  </div>
                </div>

                {/* Scheduling */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Start Date *</label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">End Date</label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {/* Limits */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Max Total Claims</label>
                    <input
                      type="number"
                      value={formData.max_claims || ''}
                      onChange={(e) => setFormData({ ...formData, max_claims: e.target.value ? parseInt(e.target.value) : null })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-purple-500"
                      placeholder="Unlimited"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Claims Per User</label>
                    <input
                      type="number"
                      value={formData.claim_limit_per_user}
                      onChange={(e) => setFormData({ ...formData, claim_limit_per_user: parseInt(e.target.value) })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {/* Target Plans */}
                <div>
                  <label className="block text-sm font-medium mb-2">Target Plans (leave empty for all)</label>
                  <div className="flex gap-3 flex-wrap">
                    {['free', 'studio', 'pro', 'agency'].map(plan => (
                      <label key={plan} className="flex items-center gap-2 bg-gray-700 px-4 py-2 rounded-lg cursor-pointer hover:bg-gray-600">
                        <input
                          type="checkbox"
                          checked={formData.target_plan.includes(plan)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, target_plan: [...formData.target_plan, plan] });
                            } else {
                              setFormData({ ...formData, target_plan: formData.target_plan.filter(p => p !== plan) });
                            }
                          }}
                          className="form-checkbox text-purple-600"
                        />
                        <span className="capitalize">{plan}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Toggles */}
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="form-checkbox text-purple-600"
                    />
                    <span>Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_featured}
                      onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                      className="form-checkbox text-purple-600"
                    />
                    <span>Featured</span>
                  </label>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={editingReward ? handleUpdateReward : handleCreateReward}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all"
                  >
                    <FaFloppyDisk />
                    {editingReward ? 'Update Reward' : 'Create Reward'}
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingReward(null);
                      resetForm();
                    }}
                    className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminRewardsManager;
