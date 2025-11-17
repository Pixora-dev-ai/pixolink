import React, { useState, useEffect, useCallback } from 'react';
import { FaUsers, FaCoins, FaBell, FaChartLine, FaShieldAlt, FaCog, FaCube, FaFileAlt, FaClipboardList, FaBullhorn, FaGift } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { getGuardian } from '../logic-guardian';
import * as adminAnalyticsService from '../../../services/adminAnalyticsService';

const guardian = getGuardian();

interface ManagementCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  onClick: () => void;
  color: 'purple' | 'blue' | 'pink' | 'cyan' | 'green' | 'yellow' | 'red' | 'indigo' | 'teal';
  badge?: number;
}

const ManagementCard: React.FC<ManagementCardProps> = ({ title, description, icon, features, onClick, color, badge }) => {
  const colorSchemes = {
    purple: { border: 'border-purple-500', bg: 'bg-purple-600/20', iconBg: 'bg-purple-600/30', text: 'text-purple-400', hoverBg: 'hover:bg-purple-600/30' },
    blue: { border: 'border-blue-500', bg: 'bg-blue-600/20', iconBg: 'bg-blue-600/30', text: 'text-blue-400', hoverBg: 'hover:bg-blue-600/30' },
    pink: { border: 'border-pink-500', bg: 'bg-pink-600/20', iconBg: 'bg-pink-600/30', text: 'text-pink-400', hoverBg: 'hover:bg-pink-600/30' },
    cyan: { border: 'border-cyan-500', bg: 'bg-cyan-600/20', iconBg: 'bg-cyan-600/30', text: 'text-cyan-400', hoverBg: 'hover:bg-cyan-600/30' },
    green: { border: 'border-green-500', bg: 'bg-green-600/20', iconBg: 'bg-green-600/30', text: 'text-green-400', hoverBg: 'hover:bg-green-600/30' },
    yellow: { border: 'border-yellow-500', bg: 'bg-yellow-600/20', iconBg: 'bg-yellow-600/30', text: 'text-yellow-400', hoverBg: 'hover:bg-yellow-600/30' },
    red: { border: 'border-red-500', bg: 'bg-red-600/20', iconBg: 'bg-red-600/30', text: 'text-red-400', hoverBg: 'hover:bg-red-600/30' },
    indigo: { border: 'border-indigo-500', bg: 'bg-indigo-600/20', iconBg: 'bg-indigo-600/30', text: 'text-indigo-400', hoverBg: 'hover:bg-indigo-600/30' },
    teal: { border: 'border-teal-500', bg: 'bg-teal-600/20', iconBg: 'bg-teal-600/30', text: 'text-teal-400', hoverBg: 'hover:bg-teal-600/30' }
  };

  const scheme = colorSchemes[color];

  return (
    <div
      onClick={onClick}
      className={`relative ${scheme.bg} border ${scheme.border} rounded-xl p-6 cursor-pointer transition-all hover:scale-105 hover:shadow-xl ${scheme.hoverBg}`}
    >
      {badge !== undefined && badge > 0 && (
        <div className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
          {badge > 99 ? '99+' : badge}
        </div>
      )}
      <div className="flex items-start gap-4 mb-4">
        <div className={`p-3 ${scheme.iconBg} rounded-lg flex-shrink-0`}>
          <div className={`w-6 h-6 flex items-center justify-center ${scheme.text}`}>
            {icon}
          </div>
        </div>
        <div>
          <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
          <p className="text-sm text-gray-400">{description}</p>
        </div>
      </div>
      <ul className="space-y-2">
        {features.map((feature, index) => (
          <li key={index} className="text-sm text-gray-300 flex items-start gap-2">
            <span className={scheme.text}>•</span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pendingPayments, setPendingPayments] = useState<number>(0);

  const loadStats = useCallback(async () => {
    try {
      guardian.logger.info('Loading dashboard stats...');
      const data = await adminAnalyticsService.getDashboardStats();
      guardian.logger.info('Dashboard stats loaded successfully', { stats: data });
      setStats(data);
    } catch (error) {
      guardian.logger.error('Error loading dashboard stats', error);
      // Set default stats on error to prevent blank screen
      setStats({
        totalUsers: 0,
        activeUsers24h: 0,
        newUsersToday: 0,
        newUsersThisWeek: 0,
        newUsersThisMonth: 0,
        totalCreditsIssued: 0,
        totalCreditsUsed: 0,
        creditsBalance: 0,
        activeSubscriptions: 0,
        totalRevenue: 0,
        revenueThisMonth: 0,
        modelsCount: 0,
        imagesGenerated: 0,
        avgCreditsPerUser: 0,
        conversionRate: 0
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPendingPayments = useCallback(async () => {
    try {
      const { data, error } = await guardian.supabase
        .rpc('get_pending_payments_count');
      
      if (error) throw error;
      setPendingPayments(data || 0);
    } catch (error) {
      guardian.logger.error('Error loading pending payments count', error);
      setPendingPayments(0);
    }
  }, []);

  useEffect(() => {
    loadStats();
    loadPendingPayments();
    
    // Refresh pending payments every 30 seconds
    const interval = setInterval(loadPendingPayments, 30000);
    return () => clearInterval(interval);
  }, [loadStats, loadPendingPayments]);
  guardian.logger.info('AdminDashboard mounted');

  const navigateTo = (path: string) => {
    navigate(path);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Admin Control Center</h1>
          <p className="text-gray-400">Manage your PixoRA platform comprehensively</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigateTo('/app/admin/settings')}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <div><FaCog size={16} /></div>
            <span>Settings</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  {/* Total Users Card */}
        <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 border border-purple-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-600/30 rounded-lg">
              <div className="w-6 h-6 flex items-center justify-center text-purple-400">
                <FaUsers size={24} />
              </div>
            </div>
            <span className="text-2xl font-bold text-white">
              {loading ? '...' : stats?.totalUsers?.toLocaleString() || '0'}
            </span>
          </div>
          <h3 className="text-sm font-medium text-gray-300">Total Users</h3>
          <p className="text-xs text-gray-500 mt-1">+12% from last month</p>
        </div>

        {/* Credits Issued Card */}
        <div className="bg-gradient-to-br from-pink-600/20 to-pink-800/20 border border-pink-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-pink-600/30 rounded-lg">
              <div className="w-6 h-6 flex items-center justify-center text-pink-400">
                <FaCoins size={24} />
              </div>
            </div>
            <span className="text-2xl font-bold text-white">
              {loading ? '...' : stats?.totalCreditsIssued?.toLocaleString() || '0'}
            </span>
          </div>
          <h3 className="text-sm font-medium text-gray-300">Credits Issued</h3>
          <p className="text-xs text-gray-500 mt-1">Total distributed credits</p>
        </div>

        {/* Active Models Card */}
        <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 border border-blue-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-600/30 rounded-lg">
              <div className="w-6 h-6 flex items-center justify-center text-blue-400">
                <FaCube size={24} />
              </div>
            </div>
            <span className="text-2xl font-bold text-white">
              {loading ? '...' : '0'}
            </span>
          </div>
          <h3 className="text-sm font-medium text-gray-300">Active Models</h3>
          <p className="text-xs text-gray-500 mt-1">Currently training</p>
        </div>

        {/* System Health Card */}
        <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 border border-green-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-600/30 rounded-lg">
              <div className="w-6 h-6 flex items-center justify-center text-green-400">
                <FaShieldAlt size={24} />
              </div>
            </div>
            <span className="text-2xl font-bold text-white">99.9%</span>
          </div>
          <h3 className="text-sm font-medium text-gray-300">System Uptime</h3>
          <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
        </div>
      </div>

      {/* Management Sections */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold text-white mb-6">Management Sections</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ManagementCard
            title="Analytics Dashboard"
            description="Comprehensive analytics and insights"
            icon={<FaChartLine size={24} />}
            features={[
              'User growth charts',
              'Credits flow analysis',
              'Revenue tracking',
              'Top users analytics'
            ]}
            onClick={() => navigateTo('/app/admin/analytics')}
            color="purple"
          />

          <ManagementCard
            title="User Management"
            description="Manage users and permissions"
            icon={<FaUsers size={24} />}
            features={[
              'View & search users',
              'Bulk operations',
              'Role management',
              'Activity tracking'
            ]}
            onClick={() => navigateTo('/app/admin/users')}
            color="blue"
          />

          <ManagementCard
            title="Credits & Subscriptions"
            description="Manage credits and plans"
            icon={<FaCoins size={24} />}
            features={[
              'Credit management',
              'Subscription plans',
              'Transaction history',
              'Promotional campaigns'
            ]}
            onClick={() => navigateTo('/app/admin/credits')}
            color="pink"
          />

          <ManagementCard
            title="Payment Verifications"
            description="Review & approve manual payments"
            icon={<FaCoins size={24} />}
            features={[
              'PIXOPAY payment reviews',
              'InstaPay & Vodafone Cash',
              'Proof verification',
              'Auto credit allocation'
            ]}
            onClick={() => navigateTo('/app/admin/payments')}
            color="green"
            badge={pendingPayments}
          />

          <ManagementCard
            title="Content Management"
            description="Manage models and content"
            icon={<FaCube size={24} />}
            features={[
              'Models overview',
              'Image moderation',
              'Quality control',
              'Content reports'
            ]}
            onClick={() => navigateTo('/app/admin/content')}
            color="cyan"
          />

          <ManagementCard
            title="Ads Manager"
            description="Create & optimize sponsored ads"
            icon={<FaBullhorn size={24} />}
            features={[
              'Create campaigns',
              'Target segmentation',
              'Track impressions & clicks',
              'A/B testing variants'
            ]}
            onClick={() => navigateTo('/app/admin/ads')}
            color="indigo"
          />

          <ManagementCard
            title="Rewards & Offers"
            description="Manage rewards, contests & promotions"
            icon={<FaGift size={24} />}
            features={[
              'Create rewards & gifts',
              'Run contests & promotions',
              'Achievement tracking',
              'Claim management & analytics'
            ]}
            onClick={() => navigateTo('/app/admin/rewards')}
            color="pink"
          />

          <ManagementCard
            title="Notifications & Support"
            description="Communicate with users"
            icon={<FaBell size={24} />}
            features={[
              'Send notifications',
              'Support tickets',
              'User messaging',
              'Announcement system'
            ]}
            onClick={() => navigateTo('/app/admin/notifications')}
            color="green"
          />

          <ManagementCard
            title="System Configuration"
            description="Configure platform settings"
            icon={<FaCog size={24} />}
            features={[
              'App settings',
              'Feature toggles',
              'Maintenance mode',
              'API configuration'
            ]}
            onClick={() => navigateTo('/app/admin/settings')}
            color="yellow"
          />

          <ManagementCard
            title="Security & Monitoring"
            description="Security and audit logs"
            icon={<FaShieldAlt size={24} />}
            features={[
              'Security alerts',
              'Audit trails',
              'Activity logs',
              'System health'
            ]}
            onClick={() => navigateTo('/app/admin/security')}
            color="red"
          />

          <ManagementCard
            title="Requests Management"
            description="Handle user requests"
            icon={<FaClipboardList size={24} />}
            features={[
              'Credit requests',
              'Subscription changes',
              'Approval workflow',
              'Request history'
            ]}
            onClick={() => navigateTo('/app/admin/requests')}
            color="indigo"
          />

          <ManagementCard
            title="Reports & Export"
            description="Generate and export reports"
            icon={<FaFileAlt size={24} />}
            features={[
              'Generate reports',
              'Export to CSV',
              'Analytics exports',
              'Custom queries'
            ]}
            onClick={() => navigateTo('/app/admin/reports')}
            color="teal"
          />
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
