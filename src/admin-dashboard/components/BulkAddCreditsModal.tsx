import React, { useState } from 'react';
import { FaXmark, FaCircleExclamation, FaSpinner, FaCircleCheck, FaCircleXmark } from 'react-icons/fa6';
import * as adminService from '../../../services/adminService';
import { useAuth } from '../../../contexts/AuthContext';

interface BulkAddCreditsModalProps {
  selectedUserIds: string[];
  selectedUserEmails: string[];
  onClose: () => void;
  onSuccess: () => void;
}

interface BulkResult {
  success: number;
  failed: number;
  errors: Array<{ email: string; error: string }>;
}

export function BulkAddCreditsModal({ 
  selectedUserIds, 
  selectedUserEmails,
  onClose, 
  onSuccess 
}: BulkAddCreditsModalProps) {
  const { user } = useAuth();
  const [amount, setAmount] = useState<number>(100);
  const [reason, setReason] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<BulkResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (amount <= 0 || amount > 10000) {
      alert('Amount must be between 1 and 10,000 credits');
      return;
    }

    if (!reason.trim()) {
      alert('Please provide a reason for this credit addition');
      return;
    }

    setIsProcessing(true);
    const results: BulkResult = {
      success: 0,
      failed: 0,
      errors: []
    };

    try {
      // Process each user sequentially to track individual results
      for (let i = 0; i < selectedUserIds.length; i++) {
        try {
          await adminService.addCreditsToUser(
            selectedUserIds[i],
            amount,
            reason,
            user?.email || 'Admin'
          );
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            email: selectedUserEmails[i],
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      setResult(results);

      // Auto-close and refresh if all successful
      if (results.failed === 0) {
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      }
    } catch (error) {
      alert('Bulk operation failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  };

  const previewEmails = selectedUserEmails.slice(0, 5);
  const remainingCount = selectedUserEmails.length - 5;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Add Credits to Multiple Users
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            disabled={isProcessing}
          >
            <FaXmark size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Selection Preview */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5">
                <FaCircleExclamation size={20} />
              </span>
              <div className="flex-1">
                <p className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                  {selectedUserIds.length} user{selectedUserIds.length !== 1 ? 's' : ''} selected
                </p>
                <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  {previewEmails.map((email, idx) => (
                    <div key={idx}>• {email}</div>
                  ))}
                  {remainingCount > 0 && (
                    <div className="font-medium">+ {remainingCount} more...</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Amount Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Credits Amount *
              </label>
              <input
                type="number"
                min="1"
                max="10000"
                value={amount}
                onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
                disabled={isProcessing}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Each user will receive {amount.toLocaleString()} credits
              </p>
            </div>

            {/* Reason Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reason *
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={200}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none"
                placeholder="e.g., Promotional bonus, Compensation, Special event..."
                required
                disabled={isProcessing}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {reason.length}/200 characters
              </p>
            </div>

            {/* Results Display */}
            {result && (
              <div className="space-y-3">
                {result.success > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <span className="text-green-600 dark:text-green-400">
                      <FaCircleCheck size={20} />
                    </span>
                    <span className="text-sm font-medium text-green-800 dark:text-green-200">
                      Successfully added credits to {result.success} user{result.success !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}

                {result.failed > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <span className="text-red-600 dark:text-red-400">
                        <FaCircleXmark size={20} />
                      </span>
                      <span className="text-sm font-medium text-red-800 dark:text-red-200">
                        Failed for {result.failed} user{result.failed !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="max-h-32 overflow-y-auto text-xs text-red-700 dark:text-red-300 space-y-1 pl-4">
                      {result.errors.map((err, idx) => (
                        <div key={idx}>• {err.email}: {err.error}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                disabled={isProcessing}
              >
                {result ? 'Close' : 'Cancel'}
              </button>
              {!result && (
                <button
                  type="submit"
                  disabled={isProcessing || amount <= 0 || !reason.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {isProcessing && (
                    <span className="animate-spin">
                      <FaSpinner size={16} />
                    </span>
                  )}
                  {isProcessing ? 'Processing...' : 'Add Credits'}
                </button>
              )}
            </div>
          </form>

          {/* Total Impact */}
          {!result && (
            <div className="text-center text-sm text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
              Total credits to distribute: <span className="font-bold text-gray-900 dark:text-white">
                {(amount * selectedUserIds.length).toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
