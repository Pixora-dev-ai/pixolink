import React, { useEffect, useState } from 'react';
import { 
  Check, X, Clock, ExternalLink, Filter, 
  Search, RefreshCw, AlertCircle, FileText,
  TrendingUp, Users, DollarSign
} from 'lucide-react';
import { supabase } from '../../../services/supabase';
import { logger } from '../../../utils/logger';
import type { Database } from '../../types/supabase';

type ManualPayment = Database['public']['Tables']['manual_payments']['Row'];
type PaymentStatus = 'pending' | 'approved' | 'rejected' | 'all';

interface PaymentStats {
  total_payments: number;
  pending_payments: number;
  approved_payments: number;
  rejected_payments: number;
  total_amount_approved: number;
  avg_approval_time: string;
}

const PaymentsManagement: React.FC = () => {
  const [payments, setPayments] = useState<ManualPayment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<ManualPayment[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<PaymentStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<ManualPayment | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPayments();
    fetchStats();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('admin_payments_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'manual_payments'
        },
        (payload) => {
          logger.info('Payment updated', { payload });
          fetchPayments();
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    filterPayments();
  }, [payments, statusFilter, searchQuery]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('manual_payments')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setPayments(data || []);
    } catch (err) {
      logger.error('Failed to fetch payments', { error: err });
      setError('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data, error: statsError } = await supabase
        .rpc('get_payment_statistics');

      if (statsError) throw statsError;

      if (data && Array.isArray(data) && data.length > 0) {
        setStats(data[0]);
      }
    } catch (err) {
      logger.error('Failed to fetch stats', { error: err });
    }
  };

  const filterPayments = () => {
    let filtered = [...payments];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.user_id.toLowerCase().includes(query) ||
        p.amount.toString().includes(query) ||
        p.id.toLowerCase().includes(query)
      );
    }

    setFilteredPayments(filtered);
  };

  const handleApprove = async (payment: ManualPayment) => {
    try {
      setProcessing(payment.id);
      setError('');

      const { error: updateError } = await supabase
        .from('manual_payments')
        .update({
          status: 'approved',
          admin_notes: adminNotes || null
        })
        .eq('id', payment.id);

      if (updateError) throw updateError;

      setSelectedPayment(null);
      setAdminNotes('');
      await fetchPayments();
      await fetchStats();
    } catch (err) {
      logger.error('Failed to approve payment', { error: err });
      setError('Failed to approve payment');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (payment: ManualPayment) => {
    try {
      setProcessing(payment.id);
      setError('');

      if (!adminNotes) {
        setError('Please provide a reason for rejection');
        return;
      }

      const { error: updateError } = await supabase
        .from('manual_payments')
        .update({
          status: 'rejected',
          admin_notes: adminNotes
        })
        .eq('id', payment.id);

      if (updateError) throw updateError;

      setSelectedPayment(null);
      setAdminNotes('');
      await fetchPayments();
      await fetchStats();
    } catch (err) {
      logger.error('Failed to reject payment', { error: err });
      setError('Failed to reject payment');
    } finally {
      setProcessing(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200';
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-200';
    }
  };

  const getPaymentMethodName = (method: string) => {
    return method === 'instapay' ? 'InstaPay' : 'Vodafone Cash';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              PIXOPAY Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage manual payment verifications
            </p>
          </div>
          <button
            onClick={() => { fetchPayments(); fetchStats(); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Payments</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                    {stats.total_payments}
                  </p>
                </div>
                <Users className="w-10 h-10 text-blue-500" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
                  <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-500 mt-2">
                    {stats.pending_payments}
                  </p>
                </div>
                <Clock className="w-10 h-10 text-yellow-500" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Approved</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-500 mt-2">
                    {stats.total_amount_approved} EGP
                  </p>
                </div>
                <DollarSign className="w-10 h-10 text-green-500" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Avg. Time</p>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-500 mt-2">
                    {stats.avg_approval_time ? 
                      `${Math.round(parseFloat(stats.avg_approval_time))}m` : 
                      'N/A'
                    }
                  </p>
                </div>
                <TrendingUp className="w-10 h-10 text-purple-500" />
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by user ID, amount, or payment ID..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as PaymentStatus)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-900 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Payments Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No payments found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Payment Info
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredPayments.map((payment) => (
                    <tr 
                      key={payment.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {payment.user_id.substring(0, 8)}...
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            ID: {payment.id.substring(0, 8)}...
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-lg font-semibold text-gray-900 dark:text-white">
                          {payment.amount} EGP
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {getPaymentMethodName(payment.payment_method)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                          {payment.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900 dark:text-white">
                          {formatDate(payment.created_at)}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {payment.screenshot_url && (
                            <a
                              href={payment.screenshot_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                              title="View Screenshot"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          {payment.status === 'pending' && (
                            <>
                              <button
                                onClick={() => setSelectedPayment(payment)}
                                className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                title="Review"
                              >
                                <FileText className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Review Payment
              </h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Payment Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Amount</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {selectedPayment.amount} EGP
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Method</p>
                  <p className="text-lg font-medium text-gray-900 dark:text-white">
                    {getPaymentMethodName(selectedPayment.payment_method)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">User ID</p>
                  <p className="text-sm font-mono text-gray-900 dark:text-white">
                    {selectedPayment.user_id}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">WhatsApp</p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {selectedPayment.whatsapp_sent ? 'Yes' : 'No'}
                  </p>
                </div>
              </div>

              {/* Screenshot */}
              {selectedPayment.screenshot_url && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Payment Proof
                  </p>
                  <img
                    src={selectedPayment.screenshot_url}
                    alt="Payment proof"
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700"
                  />
                </div>
              )}

              {/* Admin Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Admin Notes {selectedPayment.status === 'pending' && '(Optional for approval, Required for rejection)'}
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this payment..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-900 dark:text-red-200">{error}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setSelectedPayment(null);
                    setAdminNotes('');
                    setError('');
                  }}
                  className="flex-1 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleReject(selectedPayment)}
                  disabled={processing === selectedPayment.id}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <X className="w-5 h-5" />
                  Reject
                </button>
                <button
                  onClick={() => handleApprove(selectedPayment)}
                  disabled={processing === selectedPayment.id}
                  className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentsManagement;
