import React, { useEffect, useState } from 'react';
import Spinner from '../Spinner';
import { getGuardian } from '../logic-guardian';
import {
  listTopupRequests,
  processTopupRequest,
  listSubscriptionChangeRequests,
  processSubscriptionChangeRequest,
  TopupRequestRow,
  SubscriptionChangeRequestRow,
} from '../../../services/adminRequestsService';
import TopupRequestsPanel from './TopupRequestsPanel.tsx';
import SubscriptionRequestsPanel from './SubscriptionRequestsPanel.tsx';

interface Props {
  currentUserId: string;
}

const guardian = getGuardian();

const RequestsManagementTab: React.FC<Props> = ({ currentUserId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [topups, setTopups] = useState<TopupRequestRow[]>([]);
  const [subs, setSubs] = useState<SubscriptionChangeRequestRow[]>([]);
  const [successMessage, setSuccessMessage] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const [t, s] = await Promise.all([
        listTopupRequests('pending'),
        listSubscriptionChangeRequests('pending'),
      ]);
      setTopups(t);
      setSubs(s);
    } catch (err: any) {
      guardian.logger.error('Failed to load pending requests', { error: err });
      setError(err.message || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleTopup = async (id: string, action: 'approve' | 'reject') => {
    try {
      await processTopupRequest(id, action, currentUserId);
      setSuccessMessage(`Top-up ${action}d`);
      setTimeout(() => setSuccessMessage(''), 2500);
      load();
    } catch (err: any) {
      setError(err.message || `Failed to ${action} top-up`);
    }
  };

  const handleSub = async (id: string, action: 'approve' | 'reject') => {
    try {
      await processSubscriptionChangeRequest(id, action, currentUserId);
      setSuccessMessage(`Subscription request ${action}d`);
      setTimeout(() => setSuccessMessage(''), 2500);
      load();
    } catch (err: any) {
      setError(err.message || `Failed to ${action} subscription request`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-900/20 text-red-300 p-3 rounded">{error}</div>}
      {successMessage && (
        <div className="bg-green-900/20 text-green-300 p-3 rounded">{successMessage}</div>
      )}

      <TopupRequestsPanel
        count={topups.length}
        items={topups}
        onApprove={(id) => handleTopup(id, 'approve')}
        onReject={(id) => handleTopup(id, 'reject')}
      />

      <SubscriptionRequestsPanel
        count={subs.length}
        items={subs}
        onApprove={(id) => handleSub(id, 'approve')}
        onReject={(id) => handleSub(id, 'reject')}
      />
    </div>
  );
};

export default RequestsManagementTab;
