import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaBullhorn, 
  FaPlus, 
  FaPenToSquare, 
  FaTrash, 
  FaToggleOn, 
  FaToggleOff,
  FaEye,
  FaHandPointer,
  FaChartLine,
  FaFilter,
  FaStar,
  FaCalendar,
  FaBullseye,
  FaFloppyDisk,
  FaXmark
} from 'react-icons/fa6';
import { supabase } from "../../services/supabase";
import { useAuth } from "../../contexts/AuthContext";

interface SponsoredAd {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  video_url: string | null;
  cta_text: string;
  cta_url: string;
  ad_type: 'banner' | 'card' | 'video' | 'carousel' | 'native';
  category: 'product' | 'service' | 'event' | 'announcement' | 'partnership' | 'promotion' | 'feature';
  priority: number;
  position: 'home' | 'studio' | 'models' | 'sidebar' | 'all';
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  is_featured: boolean;
  max_impressions: number | null;
  max_clicks: number | null;
  total_impressions: number;
  total_clicks: number;
  total_conversions: number;
  click_through_rate: number;
  created_at: string;
  updated_at: string;
}

const AdminAdsManager: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [ads, setAds] = useState<SponsoredAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAd, setEditingAd] = useState<SponsoredAd | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_url: '',
    cta_text: 'Learn More',
    cta_url: '',
    ad_type: 'card' as const,
    category: 'feature' as const,
    priority: 50,
    position: 'home' as const,
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    is_active: true,
    is_featured: false,
    max_impressions: null as number | null,
    max_clicks: null as number | null,
  });

  const fetchAds = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sponsored_ads')
        .select('*')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAds(data || []);
    } catch (error) {
      console.error('Error fetching ads:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!profile?.is_admin) {
      navigate('/app/home');
      return;
    }
    fetchAds();
  }, [profile, navigate, fetchAds]);

  const handleCreateAd = async () => {
    try {
      const { error } = await (supabase as any)
        .from('sponsored_ads')
        .insert([{
          ...formData,
          created_by: profile?.id,
          end_date: formData.end_date || null,
        }]);

      if (error) throw error;

      setShowCreateModal(false);
      resetForm();
      fetchAds();
    } catch (error) {
      console.error('Error creating ad:', error);
      alert('Failed to create ad');
    }
  };

  const handleUpdateAd = async () => {
    if (!editingAd) return;

    try {
      const { error } = await (supabase as any)
        .from('sponsored_ads')
        .update({
          ...formData,
          updated_by: profile?.id,
          end_date: formData.end_date || null,
        })
        .eq('id', editingAd.id);

      if (error) throw error;

      setEditingAd(null);
      resetForm();
      fetchAds();
    } catch (error) {
      console.error('Error updating ad:', error);
      alert('Failed to update ad');
    }
  };

  const handleDeleteAd = async (id: string) => {
    if (!confirm('Are you sure you want to delete this ad?')) return;

    try {
      const { error } = await (supabase as any)
        .from('sponsored_ads')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchAds();
    } catch (error) {
      console.error('Error deleting ad:', error);
      alert('Failed to delete ad');
    }
  };

  const handleToggleActive = async (ad: SponsoredAd) => {
    try {
      const { error } = await (supabase as any)
        .from('sponsored_ads')
        .update({ is_active: !ad.is_active })
        .eq('id', ad.id);

      if (error) throw error;
      fetchAds();
    } catch (error) {
      console.error('Error toggling ad status:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      image_url: '',
      cta_text: 'Learn More',
      cta_url: '',
      ad_type: 'card',
      category: 'feature',
      priority: 50,
      position: 'home',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      is_active: true,
      is_featured: false,
      max_impressions: null,
      max_clicks: null,
    });
  };

  const startEdit = (ad: SponsoredAd) => {
    setEditingAd(ad);
    setFormData({
      title: ad.title,
      description: ad.description,
      image_url: ad.image_url || '',
      cta_text: ad.cta_text,
      cta_url: ad.cta_url,
      ad_type: ad.ad_type,
      category: ad.category,
      priority: ad.priority,
      position: ad.position,
      start_date: ad.start_date.split('T')[0],
      end_date: ad.end_date ? ad.end_date.split('T')[0] : '',
      is_active: ad.is_active,
      is_featured: ad.is_featured,
      max_impressions: ad.max_impressions,
      max_clicks: ad.max_clicks,
    });
    setShowCreateModal(true);
  };

  const filteredAds = ads.filter(ad => {
    if (filterStatus !== 'all') {
      if (filterStatus === 'active' && !ad.is_active) return false;
      if (filterStatus === 'inactive' && ad.is_active) return false;
    }
    if (filterCategory !== 'all' && ad.category !== filterCategory) return false;
    return true;
  });

  const totalStats = {
    totalAds: ads.length,
    activeAds: ads.filter(a => a.is_active).length,
    totalImpressions: ads.reduce((sum, a) => sum + a.total_impressions, 0),
    totalClicks: ads.reduce((sum, a) => sum + a.total_clicks, 0),
    avgCTR: ads.length > 0 
      ? (ads.reduce((sum, a) => sum + a.click_through_rate, 0) / ads.length).toFixed(2)
      : 0,
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
                <div className="w-8 h-8">
                  <div className="text-purple-400"><FaBullhorn /></div>
                </div>
                Sponsored Ads Manager
              </h1>
              <p className="text-gray-400 mt-2">
                Create and manage sponsored advertisements for your users
              </p>
            </div>
            <button
              onClick={() => {
                setEditingAd(null);
                resetForm();
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-lg"
            >
              <div className="w-5 h-5">
                <FaPlus />
              </div>
              Create New Ad
            </button>
          </div>

          {/* Stats Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <div className="w-4 h-4">
                  <FaBullhorn />
                </div>
                <span className="text-sm">Total Ads</span>
              </div>
              <div className="text-2xl font-bold">{totalStats.totalAds}</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-400 mb-2">
                <div className="w-4 h-4">
                  <FaToggleOn />
                </div>
                <span className="text-sm">Active Ads</span>
              </div>
              <div className="text-2xl font-bold text-green-400">{totalStats.activeAds}</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-400 mb-2">
                <div className="w-4 h-4">
                  <FaEye />
                </div>
                <span className="text-sm">Total Views</span>
              </div>
              <div className="text-2xl font-bold text-blue-400">{totalStats.totalImpressions.toLocaleString()}</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-purple-400 mb-2">
                <div className="w-4 h-4">
                  <FaHandPointer />
                </div>
                <span className="text-sm">Total Clicks</span>
              </div>
              <div className="text-2xl font-bold text-purple-400">{totalStats.totalClicks.toLocaleString()}</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-yellow-400 mb-2">
                <div className="w-4 h-4">
                  <FaChartLine />
                </div>
                <span className="text-sm">Avg CTR</span>
              </div>
              <div className="text-2xl font-bold text-yellow-400">{totalStats.avgCTR}%</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5">
                <div className="text-gray-400"><FaFilter /></div>
              </div>
              <span className="text-sm text-gray-400">Filters:</span>
            </div>
            {/* Unified dark inputs: replaced bg-gray-750 (custom) with bg-gray-800 to ensure consistent theme contrast */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent focus:bg-gray-800"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent focus:bg-gray-800"
            >
              <option value="all">All Categories</option>
              <option value="feature">Feature</option>
              <option value="promotion">Promotion</option>
              <option value="event">Event</option>
              <option value="announcement">Announcement</option>
              <option value="partnership">Partnership</option>
              <option value="product">Product</option>
              <option value="service">Service</option>
            </select>
            <div className="text-sm text-gray-400">
              Showing {filteredAds.length} of {ads.length} ads
            </div>
          </div>
        </div>

        {/* Ads Table */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Ad Details</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Category</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Performance</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Schedule</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredAds.map((ad) => (
                  <tr key={ad.id} className="hover:bg-gray-800 transition-colors">
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleActive(ad)}
                        className="flex items-center gap-2"
                      >
                        {ad.is_active ? (
                          <>
                            <div className="w-5 h-5">
                              <div className="text-green-400 text-2xl"><FaToggleOn /></div>
                            </div>
                            <span className="text-xs text-green-400 font-semibold">Active</span>
                          </>
                        ) : (
                          <>
                            <div className="w-5 h-5">
                              <div className="text-gray-500 text-2xl"><FaToggleOff /></div>
                            </div>
                            <span className="text-xs text-gray-500">Inactive</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        {ad.image_url && (
                          <img
                            src={ad.image_url}
                            alt={ad.title}
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-white">{ad.title}</h3>
                            {ad.is_featured && (
                              <div className="w-4 h-4">
                                <div className="text-yellow-400"><FaStar /></div>
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-gray-400 line-clamp-1">{ad.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs bg-purple-600/20 text-purple-400 px-2 py-1 rounded">
                              Priority: {ad.priority}
                            </span>
                            <span className="text-xs bg-gray-700 text-gray-400 px-2 py-1 rounded capitalize">
                              {ad.ad_type}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-600/20 to-pink-600/20 text-purple-300 capitalize">
                        {ad.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4">
                            <div className="text-blue-400"><FaEye /></div>
                          </div>
                          <span className="text-gray-400">{ad.total_impressions.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4">
                            <div className="text-purple-400"><FaHandPointer /></div>
                          </div>
                          <span className="text-gray-400">{ad.total_clicks.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4">
                            <div className="text-green-400"><FaChartLine /></div>
                          </div>
                          <span className="text-gray-400">{ad.click_through_rate}% CTR</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-400">
                        <div>Start: {new Date(ad.start_date).toLocaleDateString()}</div>
                        {ad.end_date && (
                          <div>End: {new Date(ad.end_date).toLocaleDateString()}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => startEdit(ad)}
                          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <div className="w-5 h-5">
                            <div className="text-blue-400"><FaPenToSquare /></div>
                          </div>
                        </button>
                        <button
                          onClick={() => handleDeleteAd(ad.id)}
                          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <div className="w-5 h-5">
                            <div className="text-red-400"><FaTrash /></div>
                          </div>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredAds.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              No ads found. Create your first ad to get started!
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">
                  {editingAd ? 'Edit Ad' : 'Create New Ad'}
                </h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingAd(null);
                    resetForm();
                  }}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <div className="w-6 h-6">
                    <FaXmark />
                  </div>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent focus:bg-gray-800"
                    placeholder="e.g., New Feature Available!"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description *</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent focus:bg-gray-800"
                    rows={3}
                    placeholder="Describe your ad..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Image URL</label>
                  <input
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent focus:bg-gray-800"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">CTA Text *</label>
                    <input
                      type="text"
                      value={formData.cta_text}
                      onChange={(e) => setFormData({ ...formData, cta_text: e.target.value })}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent focus:bg-gray-800"
                      placeholder="Learn More"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">CTA URL *</label>
                    <input
                      type="url"
                      value={formData.cta_url}
                      onChange={(e) => setFormData({ ...formData, cta_url: e.target.value })}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent focus:bg-gray-800"
                      placeholder="/app/studio"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Ad Type</label>
                    <select
                      value={formData.ad_type}
                      onChange={(e) => setFormData({ ...formData, ad_type: e.target.value as any })}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent focus:bg-gray-800"
                    >
                      <option value="banner">Banner</option>
                      <option value="card">Card</option>
                      <option value="video">Video</option>
                      <option value="carousel">Carousel</option>
                      <option value="native">Native</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent focus:bg-gray-800"
                    >
                      <option value="feature">Feature</option>
                      <option value="promotion">Promotion</option>
                      <option value="event">Event</option>
                      <option value="announcement">Announcement</option>
                      <option value="partnership">Partnership</option>
                      <option value="product">Product</option>
                      <option value="service">Service</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Position</label>
                    <select
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value as any })}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent focus:bg-gray-800"
                    >
                      <option value="home">Home</option>
                      <option value="studio">Studio</option>
                      <option value="models">Models</option>
                      <option value="sidebar">Sidebar</option>
                      <option value="all">All Pages</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Priority (0-100, higher = more visible)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                    className="w-full"
                  />
                  <div className="text-sm text-gray-400 mt-1">Priority: {formData.priority}</div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Start Date</label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent focus:bg-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">End Date (Optional)</label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent focus:bg-gray-800"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-700 bg-gray-800 text-purple-600 focus:ring-2 focus:ring-purple-500"
                    />
                    <span className="text-sm font-medium">Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_featured}
                      onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-700 bg-gray-800 text-purple-600 focus:ring-2 focus:ring-purple-500"
                    />
                    <span className="text-sm font-medium">Featured</span>
                  </label>
                </div>

                <div className="flex items-center gap-4 pt-4 border-t border-gray-700">
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingAd(null);
                      resetForm();
                    }}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={editingAd ? handleUpdateAd : handleCreateAd}
                    disabled={!formData.title || !formData.description || !formData.cta_url}
                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition-all"
                  >
                    <div className="w-5 h-5">
                      <FaFloppyDisk />
                    </div>
                    {editingAd ? 'Update Ad' : 'Create Ad'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAdsManager;
