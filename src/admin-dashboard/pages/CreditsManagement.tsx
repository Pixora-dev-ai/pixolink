import React, { useState, useEffect, useCallback } from 'react';
import { FaCoins, FaHistory, FaChartLine, FaGift, FaDownload, FaFilter, FaPlus } from 'react-icons/fa';
import { FaMoneyBillTransfer } from 'react-icons/fa6';
import { getGuardian } from '../logic-guardian';
import { supabase } from '../../../services/supabase';
import PixoPayManager from '../../../pixopay/ui/PixoPayManager';
import CreditRatesManager from '../components/CreditRatesManager';
// CLEAN REWRITE START
const guardian = getGuardian();
const logger = guardian.logger;

interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: 'added' | 'used';
  reason: string | null;
  created_at: string;
  user_email?: string;
  user_name?: string;
}

interface CreditStats {
  totalAdded: number;
  totalUsed: number;
  totalBalance: number;
  transactionsToday: number;
  activeUsers: number;
}

const CreditsManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'transactions' | 'pixopay' | 'creditRates'>('transactions');
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [stats, setStats] = useState<CreditStats>({
    totalAdded: 0,
    totalUsed: 0,
    totalBalance: 0,
    transactionsToday: 0,
    activeUsers: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedType, setSelectedType] = useState<'all' | 'added' | 'used'>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const transactionsPerPage = 20;
  type RawTransaction = {
    id: string;
    user_id: string;
    amount: number;
    type: 'added' | 'used';
    reason: string | null;
    created_at: string;
    profiles?: { email?: string; full_name?: string } | null;
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const { data: transactionsData, error: transError } = await supabase
        .from('credit_transactions')
        .select(`
          id,
          user_id,
          amount,
          type,
          reason,
          created_at,
          profiles:user_id (
            email,
            full_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(500);
      if (transError) throw transError;

      const transformed: CreditTransaction[] = (transactionsData as RawTransaction[] || []).map((t) => ({
        id: t.id,
        user_id: t.user_id,
        amount: t.amount,
        type: t.type,
        reason: t.reason,
        created_at: t.created_at,
        user_email: t.profiles?.email || undefined,
        user_name: t.profiles?.full_name || undefined
      }));
      setTransactions(transformed);

      const { data: addedData } = await supabase.from('credit_transactions').select('amount').eq('type', 'added');
      const { data: usedData } = await supabase.from('credit_transactions').select('amount').eq('type', 'used');
      const today = new Date(); today.setHours(0,0,0,0);
      const { data: todayData } = await supabase.from('credit_transactions').select('id').gte('created_at', today.toISOString());
      const { data: profilesData } = await supabase.from('profiles').select('credits_balance');
      const uniqueUsers = new Set(transformed.map(t => t.user_id));
      const totalAdded = addedData?.reduce((s, r) => s + (r.amount || 0), 0) || 0;
      const totalUsed = usedData?.reduce((s, r) => s + (r.amount || 0), 0) || 0;
      const totalBalance = profilesData?.reduce((s, p) => s + (p.credits_balance || 0), 0) || 0;
      setStats({ totalAdded, totalUsed, totalBalance, transactionsToday: todayData?.length || 0, activeUsers: uniqueUsers.size });
      logger.info('Credits data loaded', { transactions: transformed.length });
    } catch (err) {
      logger.error('Failed to load credits data', { error: err });
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  function handleExport() {
    try {
      const csv = [
        'Date,User Email,User Name,Type,Amount,Reason',
        ...filteredTransactions.map(t => `${new Date(t.created_at).toLocaleString()},${t.user_email || 'N/A'},${t.user_name || 'N/A'},${t.type},${t.amount},${t.reason || 'N/A'}`)
      ].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `credit_transactions_${Date.now()}.csv`; a.click();
      window.URL.revokeObjectURL(url);
      logger.info('Exported credit transactions', { count: filteredTransactions.length });
    } catch (err) {
      logger.error('Failed to export transactions', { error: err });
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  }

  const filteredTransactions = transactions.filter(t => {
    if (selectedType !== 'all' && t.type !== selectedType) return false;
    if (dateRange.start && new Date(t.created_at) < new Date(dateRange.start)) return false;
    if (dateRange.end && new Date(t.created_at) > new Date(dateRange.end)) return false;
    return true;
  });
  const indexOfLastTransaction = currentPage * transactionsPerPage;
  const indexOfFirstTransaction = indexOfLastTransaction - transactionsPerPage;
  const paginatedTransactions = filteredTransactions.slice(indexOfFirstTransaction, indexOfLastTransaction);
  const totalPages = Math.ceil(filteredTransactions.length / transactionsPerPage);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-yellow-600/20 rounded-lg"><FaCoins size={24} color="#fbbf24" /></div>
          <div>
            <h1 className="text-3xl font-bold text-white">Credits Management</h1>
            <p className="text-gray-400">Monitor and manage credit transactions</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowFilters(!showFilters)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2">
            <FaFilter size={16} /><span>Filters</span>
          </button>
          <button onClick={handleExport} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2">
            <FaDownload size={16} /><span>Export</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700">
        {([
          { key: 'transactions', label: 'Credit Transactions', icon: <FaHistory size={16} /> },
          { key: 'pixopay', label: 'PixoPay Manager', icon: <FaMoneyBillTransfer size={16} /> },
          { key: 'creditRates', label: 'Credit Rates', icon: <FaCoins size={16} /> }
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-6 py-3 font-semibold transition-colors flex items-center gap-2 ${activeTab === tab.key ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400 hover:text-gray-300'}`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'pixopay' && <PixoPayManager />}
      {activeTab === 'creditRates' && <CreditRatesManager />}

      {activeTab === 'transactions' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[{ label: 'Total Added', value: stats.totalAdded, icon: <FaPlus size={12} />, color: 'green' },
              { label: 'Total Used', value: stats.totalUsed, icon: <FaHistory size={12} />, color: 'red' },
              { label: 'Total Balance', value: stats.totalBalance, icon: <FaCoins size={12} />, color: 'purple' },
              { label: "Today's Transactions", value: stats.transactionsToday, icon: <FaChartLine size={12} />, color: 'blue' },
              { label: 'Active Users', value: stats.activeUsers, icon: <FaGift size={12} />, color: 'yellow' }].map(card => (
              <div key={card.label} className={`bg-gradient-to-br from-${card.color}-900/40 to-${card.color}-800/20 border border-${card.color}-700/50 rounded-lg p-4`}>
                <div className={`text-${card.color}-400 text-sm mb-1 flex items-center gap-2`}>{card.icon}<span>{card.label}</span></div>
                <div className="text-2xl font-bold text-white">{card.value.toLocaleString()}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Transaction Filters</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Transaction Type</label>
                  <select value={selectedType} onChange={e => setSelectedType(e.target.value as 'all' | 'added' | 'used')} className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600">
                    <option value="all">All Types</option>
                    <option value="added">Credits Added</option>
                    <option value="used">Credits Used</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Start Date</label>
                  <input type="date" value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">End Date</label>
                  <input type="date" value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600" />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={() => setCurrentPage(1)} className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">Apply Filters</button>
                <button onClick={() => { setSelectedType('all'); setDateRange({ start:'', end:'' }); setCurrentPage(1); }} className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">Clear Filters</button>
              </div>
            </div>
          )}

          {/* Table */}
          {loading ? (
            <div className="flex justify-center items-center py-12"><div className="text-yellow-400 text-lg">Loading transactions...</div></div>
          ) : error ? (
            <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4"><div className="text-red-400">{error}</div></div>
          ) : (
            <div className="bg-gray-800/60 border border-gray-700 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-700/50 border-b border-gray-600">
                      <th className="p-4 text-left text-gray-300 font-semibold">Date & Time</th>
                      <th className="p-4 text-left text-gray-300 font-semibold">User</th>
                      <th className="p-4 text-left text-gray-300 font-semibold">Type</th>
                      <th className="p-4 text-left text-gray-300 font-semibold">Amount</th>
                      <th className="p-4 text-left text-gray-300 font-semibold">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTransactions.map(tr => (
                      <tr key={tr.id} className="border-b border-gray-700 hover:bg-gray-700/30 transition-colors">
                        <td className="p-4 text-gray-300 text-sm">{new Date(tr.created_at).toLocaleString()}</td>
                        <td className="p-4">
                          <div className="text-white font-medium">{tr.user_email || 'N/A'}</div>
                          <div className="text-gray-400 text-sm">{tr.user_name || 'Unknown'}</div>
                        </td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${tr.type === 'added' ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'}`}>{tr.type === 'added' ? '+ Added' : '- Used'}</span>
                        </td>
                        <td className="p-4"><span className={`font-bold ${tr.type === 'added' ? 'text-green-400' : 'text-red-400'}`}>{tr.type === 'added' ? '+' : '-'}{tr.amount.toLocaleString()}</span></td>
                        <td className="p-4 text-gray-400 text-sm">{tr.reason || 'No reason provided'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="bg-gray-700/30 px-6 py-4 flex items-center justify-between">
                <div className="text-gray-400 text-sm">Showing {indexOfFirstTransaction + 1} to {Math.min(indexOfLastTransaction, filteredTransactions.length)} of {filteredTransactions.length} transactions</div>
                <div className="flex gap-2">
                  <button onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors">Previous</button>
                  {[...Array(Math.min(totalPages,5))].map((_,i) => {
                    const pageNum = currentPage <= 3 ? i+1 : currentPage - 2 + i;
                    if(pageNum > 0 && pageNum <= totalPages) {
                      return <button key={pageNum} onClick={() => setCurrentPage(pageNum)} className={`px-4 py-2 rounded ${pageNum === currentPage ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300'}`}>{pageNum}</button>;
                    }
                    return null;
                  })}
                  <button onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors">Next</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CreditsManagement;
// CLEAN REWRITE END

