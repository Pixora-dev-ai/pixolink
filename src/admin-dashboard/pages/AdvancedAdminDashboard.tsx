import React, { useEffect, useState } from 'react';
import { 
  FaUsers, FaCoins, FaChartLine, FaShieldAlt, FaCog, 
  FaArrowUp, FaArrowDown, FaSync, FaDownload, FaBell,
  FaCreditCard, FaRocket, FaGlobe, FaExclamationTriangle
} from 'react-icons/fa';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { getGuardian } from '../logic-guardian';
import * as analyticsService from '../../../services/adminAnalyticsService';

const guardian = getGuardian();
const logger = guardian.logger;

// Colors for charts
const COLORS = {
  primary: '#8b5cf6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  purple: '#a855f7',
  pink: '#ec4899',
  indigo: '#6366f1'
};

const PLAN_COLORS: Record<string, string> = {
  free: '#6b7280',
  studio: '#8b5cf6',
  pro: '#3b82f6',
  agency: '#f59e0b'
};

const AdvancedAdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<analyticsService.DashboardStats | null>(null);
  const [userGrowth, setUserGrowth] = useState<analyticsService.UserGrowthData[]>([]);
  const [creditsFlow, setCreditsFlow] = useState<analyticsService.CreditsFlowData[]>([]);
  const [subscriptionDist, setSubscriptionDist] = useState<analyticsService.SubscriptionDistribution[]>([]);
  const [topUsers, setTopUsers] = useState<analyticsService.TopUser[]>([]);
  const [activityLogs, setActivityLogs] = useState<analyticsService.ActivityLog[]>([]);
  const [systemHealth, setSystemHealth] = useState<analyticsService.SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      const [
        statsData,
        growthData,
        flowData,
        distData,
        topData,
        logsData,
        healthData
      ] = await Promise.all([
        analyticsService.getDashboardStats(),
        analyticsService.getUserGrowthData(30),
        analyticsService.getCreditsFlowData(30),
        analyticsService.getSubscriptionDistribution(),
        analyticsService.getTopUsersByCredits(10),
        analyticsService.getRecentActivityLogs(20),
        analyticsService.getSystemHealth()
      ]);

      setStats(statsData);
      setUserGrowth(growthData);
      setCreditsFlow(flowData);
      setSubscriptionDist(distData);
      setTopUsers(topData);
      setActivityLogs(logsData);
      setSystemHealth(healthData);

      logger.info('Dashboard data loaded successfully');
    } catch (err) {
      logger.error('Failed to load dashboard data', { error: err });
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleExport = async (type: 'users' | 'transactions' | 'subscriptions') => {
    try {
      const csv = await analyticsService.exportToCsv(type);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      logger.info('Data exported successfully', { type });
    } catch (err) {
      logger.error('Failed to export data', { error: err, type });
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatCurrency = (amount: number): string => {
    return `$${amount.toFixed(2)}`;
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-6 text-center">
          <div className="flex justify-center mb-4 text-red-500 text-4xl">
            <FaExclamationTriangle />
          </div>
          <p className="text-red-400">{error}</p>
          <button
            onClick={loadDashboardData}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="p-6 space-y-6 max-w-[1800px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Advanced Analytics Dashboard</h1>
          <p className="text-gray-400">Real-time insights and comprehensive statistics</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <div className={refreshing ? 'animate-spin' : ''}>
              <FaSync size={16} />
            </div>
            <span>Refresh</span>
          </button>
          <button
            onClick={() => handleExport('users')}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <FaDownload size={16} />
            <span>Export</span>
          </button>
          <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-2">
            <FaCog size={16} />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* System Health Alert */}
      {systemHealth && systemHealth.status !== 'healthy' && (
        <div className={`p-4 rounded-lg border ${
          systemHealth.status === 'warning' 
            ? 'bg-yellow-900/20 border-yellow-500/50' 
            : 'bg-red-900/20 border-red-500/50'
        }`}>
          <div className="flex items-center gap-3">
            <div className={systemHealth.status === 'warning' ? 'text-yellow-500' : 'text-red-500'}>
              <FaExclamationTriangle />
            </div>
            <div>
              <p className="font-semibold text-white">System Health Alert</p>
              <p className="text-sm text-gray-400">
                {systemHealth.status === 'warning' 
                  ? 'Some system metrics need attention' 
                  : 'Critical system issues detected'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Key Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={formatNumber(stats.totalUsers)}
          change={`+${stats.newUsersThisWeek} this week`}
          trend="up"
          icon={<FaUsers size={24} color={COLORS.primary} />}
          color="purple"
        />
        <StatCard
          title="Active Subscriptions"
          value={formatNumber(stats.activeSubscriptions)}
          change={`${stats.conversionRate}% conversion`}
          trend="up"
          icon={<FaCreditCard size={24} color={COLORS.success} />}
          color="green"
        />
        <StatCard
          title="Credits Balance"
          value={formatNumber(stats.creditsBalance)}
          change={`${formatNumber(stats.totalCreditsIssued)} issued`}
          trend="neutral"
          icon={<FaCoins size={24} color={COLORS.warning} />}
          color="yellow"
        />
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          change={`${formatCurrency(stats.revenueThisMonth)} this month`}
          trend="up"
          icon={<FaRocket size={24} color={COLORS.info} />}
          color="blue"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <div className="bg-gray-800/60 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-white">User Growth</h3>
              <p className="text-sm text-gray-400">Last 30 days</p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400">New users:</span>
              <span className="text-purple-400 font-semibold">{stats.newUsersThisMonth}</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={userGrowth}>
              <defs>
                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="date" 
                stroke="#9ca3af"
                tickFormatter={formatDate}
                style={{ fontSize: '12px' }}
              />
              <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1f2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
                labelStyle={{ color: '#fff' }}
              />
              <Area 
                type="monotone" 
                dataKey="users" 
                stroke={COLORS.primary} 
                fillOpacity={1}
                fill="url(#colorUsers)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Credits Flow Chart */}
        <div className="bg-gray-800/60 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-white">Credits Flow</h3>
              <p className="text-sm text-gray-400">Issued vs Used</p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-gray-400">Issued</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-gray-400">Used</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={creditsFlow}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="date" 
                stroke="#9ca3af"
                tickFormatter={formatDate}
                style={{ fontSize: '12px' }}
              />
              <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1f2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="issued" 
                stroke={COLORS.success} 
                strokeWidth={2}
                dot={false}
              />
              <Line 
                type="monotone" 
                dataKey="used" 
                stroke={COLORS.danger} 
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Subscription Distribution */}
        <div className="bg-gray-800/60 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
          <h3 className="text-xl font-semibold text-white mb-6">Subscription Plans</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={subscriptionDist}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name}: ${percentage}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {subscriptionDist.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={PLAN_COLORS[entry.plan] || COLORS.primary} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {subscriptionDist.map(dist => (
              <div key={dist.plan} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: PLAN_COLORS[dist.plan] }}
                  ></div>
                  <span className="text-gray-300 capitalize">{dist.plan}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-gray-400">{dist.count} users</span>
                  <span className="text-green-400 font-semibold">{formatCurrency(dist.revenue)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Users */}
        <div className="lg:col-span-2 bg-gray-800/60 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white">Top Users by Credits Usage</h3>
            <button className="text-sm text-purple-400 hover:text-purple-300 transition-colors">
              View All
            </button>
          </div>
          <div className="space-y-3">
            {topUsers.slice(0, 5).map((user, index) => (
              <div
                key={user.id}
                className="flex items-center gap-4 p-3 bg-gray-700/40 rounded-lg hover:bg-gray-700/60 transition-colors"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-600/20 text-purple-400 font-semibold">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{user.full_name}</p>
                  <p className="text-sm text-gray-400 truncate">{user.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-white font-semibold">{formatNumber(user.credits_used)} credits</p>
                  <p className="text-sm text-gray-400 capitalize">{user.plan} plan</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-gray-800/60 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-white">Recent Activity</h3>
            <p className="text-sm text-gray-400">Last 20 events</p>
          </div>
          <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2 text-sm">
            <FaBell size={14} />
            <span>All Notifications</span>
          </button>
        </div>
        <div className="space-y-2">
          {activityLogs.slice(0, 10).map(log => (
            <div
              key={log.id}
              className="flex items-start gap-3 p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors"
            >
              <div className={`mt-1 w-2 h-2 rounded-full ${getActivityColor(log.type)}`}></div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm">{log.description}</p>
                {log.user_email && (
                  <p className="text-xs text-gray-400 mt-1">{log.user_email}</p>
                )}
              </div>
              <span className="text-xs text-gray-500 whitespace-nowrap">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* System Health */}
      {systemHealth && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <HealthCard
            title="System Status"
            value={systemHealth.status}
            subtitle={`${systemHealth.uptime}% uptime`}
            icon={<FaShieldAlt size={20} />}
            color={systemHealth.status === 'healthy' ? 'green' : 'yellow'}
          />
          <HealthCard
            title="Error Rate"
            value={`${(systemHealth.errorRate * 100).toFixed(2)}%`}
            subtitle="Last 24 hours"
            icon={<FaExclamationTriangle size={20} />}
            color={systemHealth.errorRate < 0.01 ? 'green' : 'red'}
          />
          <HealthCard
            title="Avg Response Time"
            value={`${systemHealth.avgResponseTime}ms`}
            subtitle="API latency"
            icon={<FaGlobe size={20} />}
            color={systemHealth.avgResponseTime < 200 ? 'green' : 'yellow'}
          />
          <HealthCard
            title="Active Connections"
            value={formatNumber(systemHealth.activeConnections)}
            subtitle="Current users"
            icon={<FaUsers size={20} />}
            color="blue"
          />
        </div>
      )}
    </div>
  );
};

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
  color: 'purple' | 'green' | 'yellow' | 'blue';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change, trend, icon, color }) => {
  const colorClasses = {
    purple: 'from-purple-600/20 to-purple-800/20 border-purple-500/30',
    green: 'from-green-600/20 to-green-800/20 border-green-500/30',
    yellow: 'from-yellow-600/20 to-yellow-800/20 border-yellow-500/30',
    blue: 'from-blue-600/20 to-blue-800/20 border-blue-500/30'
  };

  const iconBgClasses = {
    purple: 'bg-purple-600/30',
    green: 'bg-green-600/30',
    yellow: 'bg-yellow-600/30',
    blue: 'bg-blue-600/30'
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} border rounded-xl p-6`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 ${iconBgClasses[color]} rounded-lg`}>
          {icon}
        </div>
        <span className="text-3xl font-bold text-white">{value}</span>
      </div>
      <h3 className="text-sm font-medium text-gray-300 mb-2">{title}</h3>
      <div className="flex items-center gap-2 text-xs">
        {trend === 'up' && (
          <div className="text-green-400">
            <FaArrowUp />
          </div>
        )}
        {trend === 'down' && (
          <div className="text-red-400">
            <FaArrowDown />
          </div>
        )}
        <span className={trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-gray-400'}>
          {change}
        </span>
      </div>
    </div>
  );
};

// Health Card Component
interface HealthCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  color: 'green' | 'yellow' | 'red' | 'blue';
}

const HealthCard: React.FC<HealthCardProps> = ({ title, value, subtitle, icon, color }) => {
  const colorClasses = {
    green: 'text-green-400 bg-green-600/20',
    yellow: 'text-yellow-400 bg-yellow-600/20',
    red: 'text-red-400 bg-red-600/20',
    blue: 'text-blue-400 bg-blue-600/20'
  };

  return (
    <div className="bg-gray-800/60 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-gray-400">{title}</p>
          <p className={`text-lg font-bold ${colorClasses[color].split(' ')[0]}`}>{value}</p>
        </div>
      </div>
      <p className="text-xs text-gray-500">{subtitle}</p>
    </div>
  );
};

function getActivityColor(type: analyticsService.ActivityLog['type']): string {
  const colors = {
    user_signup: 'bg-green-500',
    credit_add: 'bg-blue-500',
    credit_use: 'bg-yellow-500',
    subscription: 'bg-purple-500',
    image_generation: 'bg-pink-500',
    model_training: 'bg-indigo-500'
  };
  return colors[type] || 'bg-gray-500';
}

export default AdvancedAdminDashboard;
