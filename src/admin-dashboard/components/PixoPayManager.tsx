import React, { useState, useEffect } from 'react';
import { FaCheck, FaTimes, FaEye, FaWhatsapp, FaSpinner } from 'react-icons/fa';
import { supabase, tables } from '../../../services/supabase';
import { logger } from '../../../utils/logger';
import { notificationService } from '../../../services/notificationTemplates';
import ImageModal from './ImageModal';

interface ManualPayment {
  id: string;
  user_id: string;
  payment_method: 'instapay' | 'vf_cash';
  amount: number;
  credits_amount: number | null;
  screenshot_url: string | null;
  whatsapp_sent: boolean;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  processed_at: string | null;
  processed_by: string | null;
  rejection_reason: string | null;
  profiles?: {
    email: string;
    full_name: string;
  };
}

const PixoPayManager: React.FC = () => {
  const [payments, setPayments] = useState<ManualPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<ManualPayment | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [screenshotTitle, setScreenshotTitle] = useState<string>('');

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      setLoading(true);
      setError('');

      const { data, error: fetchError } = await tables
        .manual_payments()
        .select(`
          *,
          profiles:user_id (
            email,
            full_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (fetchError) throw fetchError;

      setPayments((data as ManualPayment[]) || []);
      logger.info('PixoPay payments loaded', { count: data?.length || 0 });
    } catch (err: unknown) {
      // Fallback: if PostgREST relationship is not available yet (PGRST200)
      const message: string = err instanceof Error ? err.message : '';
      if (message.includes('PGRST200') || message.includes('relationship')) {
        try {
          const { data: base, error: e1 } = await tables
            .manual_payments()
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);
          if (e1) throw e1;

          const userIds = Array.from(new Set((base || []).map((r: { user_id: string }) => r.user_id).filter(Boolean)));
          let profilesMap: Record<string, { email: string; full_name: string } | undefined> = {};
          if (userIds.length) {
            const { data: profs, error: e2 } = await tables
              .profiles()
              .select('id, email, full_name')
              .in('id', userIds);
            if (e2) throw e2;
            profilesMap = (profs || []).reduce((acc: Record<string, { email: string; full_name: string }>, p: { id: string; email: string; full_name: string }) => {
              acc[p.id] = { email: p.email, full_name: p.full_name };
              return acc;
            }, {} as Record<string, { email: string; full_name: string }>);
          }

          const merged = (base || []).map((r: { user_id: string }) => ({
            ...r,
            profiles: profilesMap[r.user_id],
          }));
          setPayments(merged as ManualPayment[]);
          logger.warn('PixoPay payments loaded via fallback join (no FK relationship)', { count: merged.length });
        } catch (fallbackErr) {
          logger.error('Failed to load payments (fallback also failed)', { error: fallbackErr });
          setError(fallbackErr instanceof Error ? fallbackErr.message : 'Failed to load payments');
        }
      } else {
        logger.error('Failed to load payments', { error: err });
        setError(err instanceof Error ? err.message : 'Failed to load payments');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (payment: ManualPayment) => {
    try {
      setProcessing(payment.id);
      setError('');

      const creditsToAdd = payment.credits_amount || payment.amount * 10;
      const methodLabel = payment.payment_method === 'instapay' ? 'InstaPay' : 'Vodafone Cash';

      // Update payment status - the database trigger will automatically:
      // 1. Add credits to user's balance
      // 2. Create credit transaction record
      // 3. Set processed_at and processed_by
      const { error: updateError } = await tables
        .manual_payments()
        .update({
          status: 'approved'
        })
        .eq('id', payment.id);

      if (updateError) throw updateError;

      // Send notification to user
      await notificationService.sendToUser(
        payment.user_id,
        notificationService.subscription.pixopayApproved(
          payment.amount,
          creditsToAdd,
          methodLabel
        )
      );

      logger.info('Payment approved', { paymentId: payment.id, amount: payment.amount, credits: creditsToAdd });
      await loadPayments();
      setSelectedPayment(null);
    } catch (err) {
      logger.error('Failed to approve payment', { error: err });
      setError(err instanceof Error ? err.message : 'Failed to approve payment');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (payment: ManualPayment) => {
    try {
      setProcessing(payment.id);
      setError('');

      if (!rejectionReason.trim()) {
        setError('Please provide a rejection reason');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('You must be logged in as admin');
        return;
      }

      const { error: updateError } = await tables
        .manual_payments()
        .update({
          status: 'rejected',
          processed_at: new Date().toISOString(),
          processed_by: user.id,
          rejection_reason: rejectionReason
        })
        .eq('id', payment.id);

      if (updateError) throw updateError;

      // Send notification to user
      await notificationService.sendToUser(
        payment.user_id,
        notificationService.subscription.pixopayRejected(
          payment.amount,
          payment.payment_method === 'instapay' ? 'InstaPay' : 'Vodafone Cash',
          rejectionReason
        )
      );

      logger.info('Payment rejected', { paymentId: payment.id, reason: rejectionReason });
      await loadPayments();
      setSelectedPayment(null);
      setRejectionReason('');
    } catch (err) {
      logger.error('Failed to reject payment', { error: err });
      setError(err instanceof Error ? err.message : 'Failed to reject payment');
    } finally {
      setProcessing(null);
    }
  };

  const pendingPayments = payments.filter(p => p.status === 'pending');
  const processedPayments = payments.filter(p => p.status !== 'pending');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">PixoPay Manager</h2>
          <p className="text-gray-400">Manage manual payment requests</p>
        </div>
        <button
          onClick={loadPayments}
          disabled={loading}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4">
          <div className="text-yellow-400 text-sm mb-1">Pending Requests</div>
          <div className="text-3xl font-bold text-white">{pendingPayments.length}</div>
        </div>
        <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-4">
          <div className="text-green-400 text-sm mb-1">Approved Today</div>
          <div className="text-3xl font-bold text-white">
            {processedPayments.filter(p => 
              p.status === 'approved' && 
              new Date(p.processed_at || '').toDateString() === new Date().toDateString()
            ).length}
          </div>
        </div>
        <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
          <div className="text-red-400 text-sm mb-1">Rejected Today</div>
          <div className="text-3xl font-bold text-white">
            {processedPayments.filter(p => 
              p.status === 'rejected' && 
              new Date(p.processed_at || '').toDateString() === new Date().toDateString()
            ).length}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Pending Payments */}
      <div>
        <h3 className="text-xl font-semibold text-white mb-4">Pending Requests</h3>
        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading payments...</div>
        ) : pendingPayments.length === 0 ? (
          <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-8 text-center text-gray-400">
            No pending payment requests
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {pendingPayments.map((payment) => (
              <div
                key={payment.id}
                className="bg-gray-800/60 border border-gray-700 rounded-lg p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-semibold">{payment.profiles?.full_name || 'Unknown User'}</div>
                    <div className="text-gray-400 text-sm">{payment.profiles?.email}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-400">{payment.amount} EGP</div>
                    <div className="text-sm font-medium text-purple-400">
                      = {payment.credits_amount || payment.amount * 10} Credits
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(payment.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    payment.payment_method === 'instapay'
                      ? 'bg-blue-600/20 text-blue-400'
                      : 'bg-red-600/20 text-red-400'
                  }`}>
                    {payment.payment_method === 'instapay' ? 'InstaPay' : 'Vodafone Cash'}
                  </span>
                  {payment.whatsapp_sent && (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-600/20 text-green-400 flex items-center gap-1">
                      <FaWhatsapp size={10} />
                      WhatsApp Sent
                    </span>
                  )}
                </div>

                {payment.screenshot_url && (
                  <button
                    onClick={() => {
                      setScreenshotUrl(payment.screenshot_url);
                      setScreenshotTitle(`Payment Proof - ${payment.profiles?.full_name || 'User'} - ${payment.amount} EGP`);
                    }}
                    className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    <FaEye size={14} />
                    View Screenshot
                  </button>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(payment)}
                    disabled={processing === payment.id}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {processing === payment.id ? (
                      <FaSpinner className="animate-spin" size={14} />
                    ) : (
                      <FaCheck size={14} />
                    )}
                    Approve
                  </button>
                  <button
                    onClick={() => setSelectedPayment(payment)}
                    disabled={processing === payment.id}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <FaTimes size={14} />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rejection Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-gray-800 rounded-lg p-6 space-y-4">
            <h3 className="text-xl font-semibold text-white">Reject Payment</h3>
            <p className="text-gray-400">
              Please provide a reason for rejecting this {selectedPayment.amount} EGP payment from {selectedPayment.profiles?.full_name}
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g., Screenshot is invalid, amount doesn't match, etc."
              className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 resize-none"
              rows={4}
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSelectedPayment(null);
                  setRejectionReason('');
                }}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => selectedPayment && handleReject(selectedPayment)}
                disabled={!rejectionReason.trim() || processing === selectedPayment.id}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                {processing === selectedPayment.id ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Screenshot Modal */}
      {screenshotUrl && (
        <ImageModal
          imageUrl={screenshotUrl}
          title={screenshotTitle}
          onClose={() => setScreenshotUrl(null)}
        />
      )}
    </div>
  );
};

export default PixoPayManager;
