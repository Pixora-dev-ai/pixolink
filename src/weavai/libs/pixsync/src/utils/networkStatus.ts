/**
 * Network Status Monitor
 * Detects online/offline status and connection quality
 */

export type ConnectionQuality = 'offline' | 'poor' | 'good' | 'excellent';

export interface NetworkStatus {
  isOnline: boolean;
  quality: ConnectionQuality;
  effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
  downlink?: number; // Mbps
  rtt?: number; // milliseconds
}

interface NetworkConnection {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  addEventListener?: (event: string, handler: () => void) => void;
}

interface NavigatorWithConnection extends Navigator {
  connection?: NetworkConnection;
  mozConnection?: NetworkConnection;
  webkitConnection?: NetworkConnection;
}

export class NetworkMonitor {
  private listeners: ((status: NetworkStatus) => void)[] = [];
  private currentStatus: NetworkStatus;

  constructor() {
    this.currentStatus = this.getNetworkStatus();
    this.setupListeners();
  }

  /**
   * Get current network status
   */
  getStatus(): NetworkStatus {
    return { ...this.currentStatus };
  }

  /**
   * Subscribe to network status changes
   */
  subscribe(callback: (status: NetworkStatus) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Check if online
   */
  isOnline(): boolean {
    return this.currentStatus.isOnline;
  }

  /**
   * Get connection quality
   */
  getQuality(): ConnectionQuality {
    return this.currentStatus.quality;
  }

  private getNetworkStatus(): NetworkStatus {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    
    if (!isOnline) {
      return { isOnline: false, quality: 'offline' };
    }

    // Check Network Information API if available
    const nav = navigator as NavigatorWithConnection;
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
    
    if (connection) {
      const effectiveType = connection.effectiveType;
      const downlink = connection.downlink;
      const rtt = connection.rtt;

      let quality: ConnectionQuality = 'good';
      if (effectiveType === 'slow-2g' || effectiveType === '2g') {
        quality = 'poor';
      } else if (effectiveType === '4g' && (downlink ?? 0) > 5) {
        quality = 'excellent';
      }

      return {
        isOnline: true,
        quality,
        effectiveType: effectiveType as 'slow-2g' | '2g' | '3g' | '4g' | undefined,
        downlink,
        rtt,
      };
    }

    // Fallback if Network Information API not available
    return { isOnline: true, quality: 'good' };
  }

  private setupListeners(): void {
    if (typeof window === 'undefined') return;

    const updateStatus = () => {
      this.currentStatus = this.getNetworkStatus();
      this.notifyListeners();
    };

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    // Listen to connection changes if available
    const nav = navigator as NavigatorWithConnection;
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
    if (connection?.addEventListener) {
      connection.addEventListener('change', updateStatus);
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(callback => callback(this.currentStatus));
  }
}

export const networkMonitor = new NetworkMonitor();
