import React, { useState, useEffect } from 'react';
import { FaImage, FaCube, FaFilter, FaDownload, FaEye, FaTrash, FaChartBar, FaSearch } from 'react-icons/fa';
import { getGuardian } from '../logic-guardian';
import { supabase } from '../../../services/supabase';

const guardian = getGuardian();
const logger = guardian.logger;

interface ContentStats {
  totalModels: number;
  totalImages: number;
  activeModels: number;
  trainingModels: number;
  imagesLast24h: number;
  avgImagesPerModel: number;
}

interface Model {
  id: string;
  user_id: string;
  name: string;
  trigger_word: string;
  status: 'active' | 'training' | 'inactive';
  created_at: string;
  updated_at: string;
  user_email?: string;
  user_name?: string;
  image_count?: number;
}

interface Image {
  id: string;
  user_id: string;
  model_id: string;
  prompt: string;
  negative_prompt: string | null;
  width: number;
  height: number;
  steps: number;
  guidance_scale: number;
  seed: number | null;
  created_at: string;
  user_email?: string;
  model_name?: string;
}

const ContentManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'models' | 'images'>('models');
  const [models, setModels] = useState<Model[]>([]);
  const [images, setImages] = useState<Image[]>([]);
  const [stats, setStats] = useState<ContentStats>({
    totalModels: 0,
    totalImages: 0,
    activeModels: 0,
    trainingModels: 0,
    imagesLast24h: 0,
    avgImagesPerModel: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'training' | 'inactive'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    loadData();
  }, [activeTab, statusFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      // Load statistics
      await loadStats();

      // Load content based on active tab
      if (activeTab === 'models') {
        await loadModels();
      } else {
        await loadImages();
      }

      logger.info('Content data loaded', { tab: activeTab });
    } catch (err) {
      logger.error('Failed to load content data', { error: err });
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    // Get model stats
    const { data: modelsData, error: modelsError } = await supabase
      .from('models_metadata')
      .select('status');

    if (modelsError) throw modelsError;

    // Get image stats
    const { data: imagesData, error: imagesError } = await supabase
      .from('images_metadata')
      .select('created_at, model_id');

    if (imagesError) throw imagesError;

    const totalModels = modelsData?.length || 0;
    const totalImages = imagesData?.length || 0;
    const activeModels = modelsData?.filter(m => m.status === 'active').length || 0;
    const trainingModels = modelsData?.filter(m => m.status === 'training').length || 0;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const imagesLast24h = imagesData?.filter(i => new Date(i.created_at) > yesterday).length || 0;

    const avgImagesPerModel = totalModels > 0 ? Math.round(totalImages / totalModels) : 0;

    setStats({
      totalModels,
      totalImages,
      activeModels,
      trainingModels,
      imagesLast24h,
      avgImagesPerModel
    });
  };

  const loadModels = async () => {
    let query = supabase
      .from('models_metadata')
      .select(`
        id,
        user_id,
        name,
        trigger_word,
        status,
        created_at,
        updated_at,
        profiles:user_id (
          email,
          full_name
        )
      `)
      .order('created_at', { ascending: false });

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query.limit(500);

    if (error) throw error;

    // Get image counts for each model
    const modelIds = data?.map(m => m.id) || [];
    const { data: imageCounts } = await supabase
      .from('images_metadata')
      .select('model_id')
      .in('model_id', modelIds);

    const countMap = new Map<string, number>();
    imageCounts?.forEach(ic => {
      countMap.set(ic.model_id, (countMap.get(ic.model_id) || 0) + 1);
    });

    const transformedModels: Model[] = (data || []).map((m: any) => ({
      ...m,
      user_email: m.profiles?.email,
      user_name: m.profiles?.full_name,
      image_count: countMap.get(m.id) || 0
    }));

    setModels(transformedModels);
  };

  const loadImages = async () => {
    const { data, error } = await supabase
      .from('images_metadata')
      .select(`
        id,
        user_id,
        model_id,
        prompt,
        negative_prompt,
        width,
        height,
        steps,
        guidance_scale,
        seed,
        created_at,
        profiles:user_id (
          email
        ),
        models_metadata:model_id (
          name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) throw error;

    const transformedImages: Image[] = (data || []).map((i: any) => ({
      ...i,
      user_email: i.profiles?.email,
      model_name: i.models_metadata?.name
    }));

    setImages(transformedImages);
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      loadData();
      return;
    }

    if (activeTab === 'models') {
      const filtered = models.filter(m =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.trigger_word.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.user_email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setModels(filtered);
    } else {
      const filtered = images.filter(i =>
        i.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.model_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setImages(filtered);
    }
  };

  const handleExport = () => {
    try {
      let csv = '';
      
      if (activeTab === 'models') {
        csv = [
          'Name,Trigger Word,Status,Owner Email,Image Count,Created,Updated',
          ...filteredItems.map((m: Model) =>
            `${m.name},${m.trigger_word},${m.status},${m.user_email || 'N/A'},${m.image_count},${new Date(m.created_at).toLocaleString()},${new Date(m.updated_at).toLocaleString()}`
          )
        ].join('\n');
      } else {
        csv = [
          'Prompt,Model,Owner Email,Size,Steps,Guidance,Created',
          ...filteredItems.map((i: Image) =>
            `"${i.prompt}",${i.model_name || 'N/A'},${i.user_email || 'N/A'},${i.width}x${i.height},${i.steps},${i.guidance_scale},${new Date(i.created_at).toLocaleString()}`
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

      logger.info('Exported content data', { type: activeTab, count: filteredItems.length });
    } catch (err) {
      logger.error('Failed to export', { error: err });
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  };

  // Filter items based on search and status
  const filteredItems = activeTab === 'models' ? models : images;

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-600/20 text-green-400';
      case 'training': return 'bg-yellow-600/20 text-yellow-400';
      case 'inactive': return 'bg-gray-600/20 text-gray-400';
      default: return 'bg-gray-600/20 text-gray-400';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-600/20 rounded-lg">
            <FaImage size={24} color="#60a5fa" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Content Management</h1>
            <p className="text-gray-400">Manage AI models and generated images</p>
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
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 border border-blue-700/50 rounded-lg p-4">
          <div className="text-blue-400 text-sm mb-1 flex items-center gap-2">
            <FaCube size={12} />
            <span>Total Models</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats.totalModels}</div>
        </div>

        <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 border border-purple-700/50 rounded-lg p-4">
          <div className="text-purple-400 text-sm mb-1 flex items-center gap-2">
            <FaImage size={12} />
            <span>Total Images</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats.totalImages}</div>
        </div>

        <div className="bg-gradient-to-br from-green-900/40 to-green-800/20 border border-green-700/50 rounded-lg p-4">
          <div className="text-green-400 text-sm mb-1">Active Models</div>
          <div className="text-2xl font-bold text-white">{stats.activeModels}</div>
        </div>

        <div className="bg-gradient-to-br from-yellow-900/40 to-yellow-800/20 border border-yellow-700/50 rounded-lg p-4">
          <div className="text-yellow-400 text-sm mb-1">Training</div>
          <div className="text-2xl font-bold text-white">{stats.trainingModels}</div>
        </div>

        <div className="bg-gradient-to-br from-pink-900/40 to-pink-800/20 border border-pink-700/50 rounded-lg p-4">
          <div className="text-pink-400 text-sm mb-1">Last 24h</div>
          <div className="text-2xl font-bold text-white">{stats.imagesLast24h}</div>
        </div>

        <div className="bg-gradient-to-br from-indigo-900/40 to-indigo-800/20 border border-indigo-700/50 rounded-lg p-4">
          <div className="text-indigo-400 text-sm mb-1 flex items-center gap-2">
            <FaChartBar size={12} />
            <span>Avg/Model</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats.avgImagesPerModel}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-800/60 border border-gray-700 rounded-lg p-2">
        <button
          onClick={() => { setActiveTab('models'); setCurrentPage(1); }}
          className={`flex-1 px-6 py-3 rounded-lg transition-all flex items-center justify-center gap-2 ${
            activeTab === 'models'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
          }`}
        >
          <FaCube size={18} />
          <span className="font-semibold">AI Models ({stats.totalModels})</span>
        </button>
        <button
          onClick={() => { setActiveTab('images'); setCurrentPage(1); }}
          className={`flex-1 px-6 py-3 rounded-lg transition-all flex items-center justify-center gap-2 ${
            activeTab === 'images'
              ? 'bg-purple-600 text-white shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
          }`}
        >
          <FaImage size={18} />
          <span className="font-semibold">Generated Images ({stats.totalImages})</span>
        </button>
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
              placeholder={activeTab === 'models' ? 'Search models...' : 'Search images by prompt...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full bg-gray-700 text-white pl-10 pr-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Search
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && activeTab === 'models' && (
        <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Model Filters</h3>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm text-gray-400 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="training">Training</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Content Table */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="text-blue-400 text-lg">Loading {activeTab}...</div>
        </div>
      ) : error ? (
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
          <div className="text-red-400">{error}</div>
        </div>
      ) : (
        <div className="bg-gray-800/60 border border-gray-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            {activeTab === 'models' ? (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-700/50 border-b border-gray-600">
                    <th className="p-4 text-left text-gray-300 font-semibold">Model Name</th>
                    <th className="p-4 text-left text-gray-300 font-semibold">Trigger Word</th>
                    <th className="p-4 text-left text-gray-300 font-semibold">Owner</th>
                    <th className="p-4 text-left text-gray-300 font-semibold">Status</th>
                    <th className="p-4 text-left text-gray-300 font-semibold">Images</th>
                    <th className="p-4 text-left text-gray-300 font-semibold">Created</th>
                    <th className="p-4 text-left text-gray-300 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((model: Model) => (
                    <tr key={model.id} className="border-b border-gray-700 hover:bg-gray-700/30 transition-colors">
                      <td className="p-4 text-white font-medium">{model.name}</td>
                      <td className="p-4 text-blue-400 font-mono text-sm">{model.trigger_word}</td>
                      <td className="p-4">
                        <div className="text-white text-sm">{model.user_email || 'N/A'}</div>
                        <div className="text-gray-400 text-xs">{model.user_name || 'Unknown'}</div>
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(model.status)}`}>
                          {model.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-4 text-purple-400 font-bold">{model.image_count || 0}</td>
                      <td className="p-4 text-gray-400 text-sm">
                        {new Date(model.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button
                            className="p-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <FaEye size={14} />
                          </button>
                          <button
                            className="p-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <FaTrash size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-700/50 border-b border-gray-600">
                    <th className="p-4 text-left text-gray-300 font-semibold">Prompt</th>
                    <th className="p-4 text-left text-gray-300 font-semibold">Model</th>
                    <th className="p-4 text-left text-gray-300 font-semibold">Owner</th>
                    <th className="p-4 text-left text-gray-300 font-semibold">Size</th>
                    <th className="p-4 text-left text-gray-300 font-semibold">Steps</th>
                    <th className="p-4 text-left text-gray-300 font-semibold">Created</th>
                    <th className="p-4 text-left text-gray-300 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((image: Image) => (
                    <tr key={image.id} className="border-b border-gray-700 hover:bg-gray-700/30 transition-colors">
                      <td className="p-4 text-white max-w-md truncate">{image.prompt}</td>
                      <td className="p-4 text-blue-400 text-sm">{image.model_name || 'N/A'}</td>
                      <td className="p-4 text-gray-300 text-sm">{image.user_email || 'N/A'}</td>
                      <td className="p-4 text-purple-400 text-sm">{image.width}×{image.height}</td>
                      <td className="p-4 text-gray-400">{image.steps}</td>
                      <td className="p-4 text-gray-400 text-sm">
                        {new Date(image.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button
                            className="p-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <FaEye size={14} />
                          </button>
                          <button
                            className="p-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <FaTrash size={14} />
                          </button>
                        </div>
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
                        ? 'bg-blue-600 text-white'
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
    </div>
  );
};

export default ContentManagement;
