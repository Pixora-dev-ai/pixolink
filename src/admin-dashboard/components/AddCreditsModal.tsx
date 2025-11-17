import React, { useState } from 'react';
import { FaXmark, FaCoins } from 'react-icons/fa6';

interface AddCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: string;
    email: string | null;
    full_name: string | null;
    credits_balance: number;
  };
  onSubmit: (userId: string, amount: number, reason: string) => Promise<void>;
}

const AddCreditsModal: React.FC<AddCreditsModalProps> = ({ 
  isOpen, 
  onClose, 
  user, 
  onSubmit 
}) => {
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const creditAmount = parseInt(amount);
    if (isNaN(creditAmount) || creditAmount <= 0) {
      setError('Please enter a valid positive number');
      return;
    }

    if (!reason.trim()) {
      setError('Please provide a reason');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(user.id, creditAmount, reason.trim());
      setAmount('');
      setReason('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add credits');
    } finally {
      setLoading(false);
    }
  };

  const quickAmounts = [100, 500, 1000, 5000];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-gray-800 rounded-2xl max-w-md w-full border border-gray-700 shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <FaCoins size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Add Credits</h2>
              <p className="text-sm text-gray-400 truncate max-w-[250px]">
                {user.email || user.full_name || 'Unknown User'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-400"
            disabled={loading}
          >
            <FaXmark size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Current Balance */}
          <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
            <div className="text-sm text-gray-400 mb-1">Current Balance</div>
            <div className="text-2xl font-bold text-purple-400 flex items-center gap-2">
              <FaCoins size={20} />
              {user.credits_balance.toLocaleString()}
            </div>
          </div>

          {/* Quick Amount Buttons */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Quick Select
            </label>
            <div className="grid grid-cols-4 gap-2">
              {quickAmounts.map((quickAmount) => (
                <button
                  key={quickAmount}
                  type="button"
                  onClick={() => setAmount(quickAmount.toString())}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    amount === quickAmount.toString()
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  disabled={loading}
                >
                  {quickAmount.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-300 mb-2">
              Credit Amount *
            </label>
            <input
              type="number"
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
              placeholder="Enter amount..."
              min="1"
              required
              disabled={loading}
            />
          </div>

          {/* Reason Input */}
          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-300 mb-2">
              Reason *
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors resize-none"
              placeholder="Enter reason for adding credits..."
              rows={3}
              required
              disabled={loading}
            />
          </div>

          {/* Preview */}
          {amount && parseInt(amount) > 0 && (
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">New Balance</div>
              <div className="text-xl font-bold text-purple-400">
                {(user.credits_balance + parseInt(amount)).toLocaleString()} Credits
              </div>
              <div className="text-xs text-gray-500 mt-1">
                (+{parseInt(amount).toLocaleString()} credits)
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3 text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-purple-500 hover:bg-purple-600 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || !amount || !reason.trim()}
            >
              {loading ? 'Adding...' : 'Add Credits'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCreditsModal;
