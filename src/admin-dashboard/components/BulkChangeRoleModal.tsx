import React, { useState } from 'react';
import { FaXmark, FaTriangleExclamation, FaSpinner, FaCircleCheck, FaCircleXmark } from 'react-icons/fa6';
import * as adminService from '../../../services/adminService';
import { useAuth } from '../../../contexts/AuthContext';

interface BulkChangeRoleModalProps {
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

export function BulkChangeRoleModal({ 
  selectedUserIds, 
  selectedUserEmails,
  onClose, 
  onSuccess 
}: BulkChangeRoleModalProps) {
  const [action, setAction] = useState<'make_admin' | 'remove_admin'>('make_admin');
  const [confirmed, setConfirmed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<BulkResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!confirmed) {
      alert('Please confirm that you understand the implications');
      return;
    }

    setIsProcessing(true);
    const results: BulkResult = {
      success: 0,
      failed: 0,
      errors: []
    };

    const isAdmin = action === 'make_admin';

    try {
      // Process each user sequentially
      for (let i = 0; i < selectedUserIds.length; i++) {
        try {
          // Use updateUserProfile to update is_admin field
          await adminService.updateUserProfile(
            selectedUserIds[i],
            { is_admin: isAdmin }
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

      // Auto-close if all successful
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
            Change User Roles
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
                <FaTriangleExclamation size={20} />
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
            {/* Action Selection */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Select Action *
              </label>
              
              <label className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                action === 'make_admin' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'
              }`}>
                <input
                  type="radio"
                  name="action"
                  value="make_admin"
                  checked={action === 'make_admin'}
                  onChange={(e) => setAction(e.target.value as 'make_admin')}
                  className="mt-1"
                  disabled={isProcessing}
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-white">Make Admin</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Grant admin access to selected users
                  </div>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                action === 'remove_admin' ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-gray-200 dark:border-gray-700'
              }`}>
                <input
                  type="radio"
                  name="action"
                  value="remove_admin"
                  checked={action === 'remove_admin'}
                  onChange={(e) => setAction(e.target.value as 'remove_admin')}
                  className="mt-1"
                  disabled={isProcessing}
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-white">Remove Admin</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Revoke admin access from selected users
                  </div>
                </div>
              </label>
            </div>

            {/* Warning */}
            <div className={`p-4 rounded-lg border ${
              action === 'make_admin' 
                ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}>
              <div className="flex items-start gap-3">
                <span className={`flex-shrink-0 mt-0.5 ${
                  action === 'make_admin' ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  <FaTriangleExclamation size={20} />
                </span>
                <div className={`text-sm ${
                  action === 'make_admin' 
                    ? 'text-yellow-800 dark:text-yellow-200' 
                    : 'text-red-800 dark:text-red-200'
                }`}>
                  <p className="font-medium mb-1">Warning!</p>
                  <p>
                    {action === 'make_admin' 
                      ? 'This will grant full admin access to all selected users. They will be able to manage other users, view sensitive data, and make system-wide changes.'
                      : 'This will revoke admin access from all selected users. They will lose access to the admin dashboard and all administrative features immediately.'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Confirmation Checkbox */}
            <label className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-1"
                disabled={isProcessing}
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                I understand the implications of this action and confirm that I want to proceed with changing roles for {selectedUserIds.length} user{selectedUserIds.length !== 1 ? 's' : ''}
              </span>
            </label>

            {/* Results Display */}
            {result && (
              <div className="space-y-3">
                {result.success > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <span className="text-green-600 dark:text-green-400">
                      <FaCircleCheck size={20} />
                    </span>
                    <span className="text-sm font-medium text-green-800 dark:text-green-200">
                      Successfully updated {result.success} user{result.success !== 1 ? 's' : ''}
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
                  disabled={isProcessing || !confirmed}
                  className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                    action === 'make_admin' 
                      ? 'bg-blue-600 hover:bg-blue-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {isProcessing && (
                    <span className="animate-spin">
                      <FaSpinner size={16} />
                    </span>
                  )}
                  {isProcessing ? 'Processing...' : action === 'make_admin' ? 'Grant Admin Access' : 'Revoke Admin Access'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
