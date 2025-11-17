import React from 'react';
import { SubscriptionChangeRequestRow } from '../../../services/adminRequestsService';

interface Props {
  count: number;
  items: SubscriptionChangeRequestRow[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

const SubscriptionRequestsPanel: React.FC<Props> = ({ count, items, onApprove, onReject }) => {
  return (
    <section className="bg-gray-800 rounded-lg border border-gray-700">
      <header className="p-4 border-b border-gray-700 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Pending Subscription Changes</h3>
        <span className="text-sm text-gray-400">{count} pending</span>
      </header>
      <div className="divide-y divide-gray-700">
        {items.length === 0 ? (
          <div className="p-6 text-gray-500">No pending requests</div>
        ) : (
          items.map((r) => (
            <div key={r.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
              <div className="flex-1">
                <div className="text-white font-medium">{r.user_email || r.user_id}</div>
                <div className="text-gray-400 text-sm">
                  Request: {r.current_plan || 'free'} → {r.requested_plan}
                </div>
                {r.reason && (
                  <div className="text-gray-500 text-xs mt-1">Reason: {r.reason}</div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onApprove(r.id)}
                  className="px-3 py-2 bg-green-600 hover:bg-green-700 rounded text-white text-sm"
                >
                  Approve
                </button>
                <button
                  onClick={() => onReject(r.id)}
                  className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded text-white text-sm"
                >
                  Reject
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
};

export default SubscriptionRequestsPanel;
