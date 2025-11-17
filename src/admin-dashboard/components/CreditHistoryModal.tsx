import React, { useEffect, useState } from 'react';
import { FaXmark, FaClockRotateLeft, FaArrowUp, FaArrowDown } from 'react-icons/fa6';
import { CreditTransaction } from '../../types';
import * as adminService from '../../../services/adminService';
import Spinner from '../Spinner';

interface CreditHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userEmail: string | null;
}

const CreditHistoryModal: React.FC<CreditHistoryModalProps> = ({ 
  isOpen, 
  onClose, 
  userId,
  userEmail 
}) => {
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen, userId]);

  const fetchHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminService.getUserCreditHistory(userId, 50);
      setTransactions(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-gray-800 rounded-2xl max-w-3xl w-full border border-gray-700 shadow-2xl animate-scale-in max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <FaClockRotateLeft size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Credit History</h2>
              <p className="text-sm text-gray-400 truncate max-w-[250px]">
                {userEmail || 'Unknown User'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-400"
          >
            <FaXmark size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Spinner />
            </div>
          ) : error ? (
            <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 text-red-300 text-sm">
              {error}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No transaction history found.
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 hover:bg-gray-900/70 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`p-2 rounded-lg ${
                        tx.type === 'add' 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {tx.type === 'add' ? (
                          <FaArrowUp size={16} />
                        ) : (
                          <FaArrowDown size={16} />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${
                            tx.type === 'add' ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {tx.type === 'add' ? '+' : '-'}{tx.amount.toLocaleString()}
                          </span>
                          <span className="text-gray-400">Credits</span>
                        </div>
                        {tx.reason && (
                          <p className="text-sm text-gray-400 mt-1">{tx.reason}</p>
                        )}
                        {tx.performed_by_name && (
                          <p className="text-xs text-gray-500 mt-1">
                            By: {tx.performed_by_name}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(tx.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreditHistoryModal;
