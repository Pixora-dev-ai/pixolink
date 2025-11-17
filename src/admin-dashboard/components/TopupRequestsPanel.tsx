import React from 'react';
import { TopupRequestRow } from '../../../services/adminRequestsService';

interface Props {
  count: number;
  items: TopupRequestRow[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

const TopupRequestsPanel: React.FC<Props> = ({ count, items, onApprove, onReject }) => {
  return (
    <section className="bg-gray-800 rounded-lg border border-gray-700">
      <header className="p-4 border-b border-gray-700 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Pending Top-up Requests</h3>
        <span className="text-sm text-gray-400">{count} pending</span>
      </header>
      <div className="divide-y divide-gray-700">
        {items.length === 0 ? (
          <div className="p-6 text-gray-500">No pending top-ups</div>
        ) : (
          items.map((r) => (
            <div key={r.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
              <div className="flex-1">
                <div className="text-white font-medium">{r.user_email || r.user_id}</div>
                <div className="text-gray-400 text-sm">
                  {r.amount} {r.currency?.toUpperCase()} • {r.method.replace('_', ' ')}
                </div>
                {r.payment_reference && (
                  <div className="text-gray-500 text-xs mt-1">Ref: {r.payment_reference}</div>
                )}
                {r.proof_url && (
                  <a
                    href={r.proof_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-400 hover:underline"
                  >
                    View proof
                  </a>
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

export default TopupRequestsPanel;
