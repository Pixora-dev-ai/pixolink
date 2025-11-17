/**
 * MemoryManager - LCM Control Interface
 * Provides tools to view, manage, and clear user memory in the Long-term Context Memory system
 */

import React, { useState } from 'react';

interface MemoryEntry {
  id: string;
  timestamp: number;
  type: string;
  data: Record<string, unknown>;
}

export const MemoryManager: React.FC = () => {
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [memoryData, setMemoryData] = useState<MemoryEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<MemoryEntry | null>(null);
  const [stats, setStats] = useState<{ total: number; size: string } | null>(null);

  const loadMemory = async () => {
    if (!userId.trim()) {
      alert('Please enter a User ID');
      return;
    }

    setLoading(true);
    try {
      // TODO: Replace with actual LCM API call
      // const data = await LCM.getHistory(userId);
      
      // Mock data for demonstration
      const mockData: MemoryEntry[] = [
        {
          id: 'mem_001',
          timestamp: Date.now() - 3600000,
          type: 'prompt',
          data: { prompt: 'A beautiful sunset', enhanced: true }
        },
        {
          id: 'mem_002',
          timestamp: Date.now() - 7200000,
          type: 'generation',
          data: { imageId: 'img_001', qualityScore: 85 }
        },
        {
          id: 'mem_003',
          timestamp: Date.now() - 10800000,
          type: 'feedback',
          data: { rating: 5, comment: 'Excellent image!' }
        }
      ];

      setMemoryData(mockData);
      setStats({
        total: mockData.length,
        size: `${(JSON.stringify(mockData).length / 1024).toFixed(2)} KB`
      });
    } catch (error) {
      console.error('Failed to load memory:', error);
      alert('Failed to load memory data');
    } finally {
      setLoading(false);
    }
  };

  const clearMemory = async () => {
    if (!userId.trim()) {
      alert('Please enter a User ID');
      return;
    }

    if (!confirm(`Are you sure you want to clear all memory for user ${userId}?`)) {
      return;
    }

    setLoading(true);
    try {
      // TODO: Replace with actual LCM API call
      // await LCM.clear(userId);
      
      setMemoryData([]);
      setStats(null);
      setSelectedEntry(null);
      alert('Memory cleared successfully');
    } catch (error) {
      console.error('Failed to clear memory:', error);
      alert('Failed to clear memory');
    } finally {
      setLoading(false);
    }
  };

  const deleteEntry = async (entryId: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) {
      return;
    }

    try {
      // TODO: Replace with actual LCM API call
      // await LCM.deleteEntry(userId, entryId);
      
      setMemoryData(prev => prev.filter(e => e.id !== entryId));
      if (selectedEntry?.id === entryId) {
        setSelectedEntry(null);
      }
      alert('Entry deleted successfully');
    } catch (error) {
      console.error('Failed to delete entry:', error);
      alert('Failed to delete entry');
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const formatRelativeTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <div className="memory-manager">
      <div className="memory-manager-header">
        <h3 className="memory-manager-title">🧠 Memory Manager</h3>
        <span className="memory-manager-subtitle">View and manage user context memory (LCM)</span>
      </div>

      <div className="memory-manager-body">
        <div className="memory-controls">
          <div className="form-group">
            <label htmlFor="memory-user-id">User ID</label>
            <input
              id="memory-user-id"
              type="text"
              className="form-input"
              placeholder="Enter user ID to view memory"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && loadMemory()}
            />
          </div>

          <div className="memory-actions">
            <button
              className="btn-action btn-load"
              onClick={loadMemory}
              disabled={loading || !userId.trim()}
            >
              {loading ? '⏳ Loading...' : '🔍 Load Memory'}
            </button>
            <button
              className="btn-action btn-clear-memory"
              onClick={clearMemory}
              disabled={loading || !userId.trim() || memoryData.length === 0}
            >
              🗑️ Clear All
            </button>
          </div>
        </div>

        {stats && (
          <div className="memory-stats">
            <div className="stat-item">
              <span className="stat-label">Total Entries:</span>
              <span className="stat-value">{stats.total}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Memory Size:</span>
              <span className="stat-value">{stats.size}</span>
            </div>
          </div>
        )}

        {memoryData.length > 0 && (
          <div className="memory-content">
            <div className="memory-list">
              <h4>Memory Entries</h4>
              <ul className="memory-entries">
                {memoryData.map(entry => (
                  <li
                    key={entry.id}
                    className={`memory-entry ${selectedEntry?.id === entry.id ? 'selected' : ''}`}
                    onClick={() => setSelectedEntry(entry)}
                  >
                    <div className="entry-header">
                      <span className="entry-type">{entry.type}</span>
                      <span className="entry-time">{formatRelativeTime(entry.timestamp)}</span>
                    </div>
                    <div className="entry-preview">
                      {JSON.stringify(entry.data).substring(0, 60)}...
                    </div>
                    <button
                      className="entry-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteEntry(entry.id);
                      }}
                    >
                      ✗
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {selectedEntry && (
              <div className="memory-detail">
                <div className="detail-header">
                  <h4>Entry Details</h4>
                  <button
                    className="btn-close"
                    onClick={() => setSelectedEntry(null)}
                  >
                    ✗
                  </button>
                </div>
                <div className="detail-info">
                  <div className="detail-item">
                    <strong>ID:</strong> {selectedEntry.id}
                  </div>
                  <div className="detail-item">
                    <strong>Type:</strong> {selectedEntry.type}
                  </div>
                  <div className="detail-item">
                    <strong>Timestamp:</strong> {formatTimestamp(selectedEntry.timestamp)}
                  </div>
                </div>
                <div className="detail-data">
                  <strong>Data:</strong>
                  <pre className="data-json">
                    {JSON.stringify(selectedEntry.data, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

        {memoryData.length === 0 && !loading && userId && (
          <div className="memory-empty">
            <p>No memory entries found for this user.</p>
          </div>
        )}
      </div>
    </div>
  );
};
