import React, { useState, useEffect } from 'react';
import { FaTimes, FaDownload, FaSpinner, FaExpand, FaCompress } from 'react-icons/fa';
import { logger } from '../../../utils/logger';

interface ImageModalProps {
  imageUrl: string; // May be a storage object path or a full URL
  onClose: () => void;
  title?: string;
}

import { resolvePaymentProofUrl } from '../../../services/supabase';

const ImageModal: React.FC<ImageModalProps> = ({ imageUrl, onClose, title = 'Payment Screenshot' }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [resolvedUrl, setResolvedUrl] = useState<string>(imageUrl);
  const [signed, setSigned] = useState<boolean>(false);
  const [statusCode, setStatusCode] = useState<number | null>(null);

  // Resolve URL on mount if needed
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        // Only resolve if not already absolute URL
        if (!/^https?:\/\//i.test(imageUrl)) {
          const res = await resolvePaymentProofUrl(imageUrl);
          if (active && res?.url) {
            setResolvedUrl(res.url);
            setSigned(res.signed);
          }
        } else {
          setResolvedUrl(imageUrl);
          setSigned(false);
        }
      } catch (e) {
        logger.error('Failed resolving payment proof URL', { imageUrl, error: e });
      }
    })();
    return () => { active = false; };
  }, [imageUrl]);

  const handleDownload = async () => {
    try {
      logger.info('Downloading image', { url: resolvedUrl });
      const response = await fetch(resolvedUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `payment-proof-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      logger.info('Image downloaded successfully');
    } catch (err) {
      logger.error('Failed to download image', { error: err });
      alert('Failed to download image. Please try again.');
    }
  };

  const handleImageLoad = () => {
    setLoading(false);
    setError(false);
  };

  const handleImageError = async () => {
    setLoading(false);
    setError(true);
    try {
      const headResp = await fetch(resolvedUrl, { method: 'HEAD' });
      setStatusCode(headResp.status);
      logger.error('Failed to load image', { url: resolvedUrl, status: headResp.status });
    } catch (e) {
      logger.error('Failed to load image (HEAD failed)', { url: resolvedUrl, error: e });
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Close modal on escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className={`relative bg-gray-900 rounded-xl shadow-2xl overflow-hidden transition-all duration-300 ${
          isFullscreen ? 'w-full h-full' : 'max-w-4xl w-full max-h-[90vh]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-gray-900/95 to-transparent z-10 p-4 flex items-center justify-between">
          <h3 className="text-white font-semibold text-lg">{title}</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleFullscreen}
              className="p-2 bg-gray-800/80 hover:bg-gray-700 text-white rounded-lg transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <FaCompress size={16} /> : <FaExpand size={16} />}
            </button>
            <button
              onClick={handleDownload}
              className="p-2 bg-green-600/80 hover:bg-green-600 text-white rounded-lg transition-colors"
              title="Download Image"
            >
              <FaDownload size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg transition-colors"
              title="Close"
            >
              <FaTimes size={16} />
            </button>
          </div>
        </div>

        {/* Image Container */}
        <div className={`flex items-center justify-center ${isFullscreen ? 'h-full' : 'min-h-[400px] max-h-[80vh]'} bg-gray-950`}>
          {loading && (
            <div className="flex flex-col items-center gap-3">
              <FaSpinner className="animate-spin text-purple-500" size={32} />
              <p className="text-gray-400 text-sm">Loading image...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center gap-3 p-8">
              <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center">
                <FaTimes className="text-red-500" size={24} />
              </div>
              <p className="text-red-400 font-medium">Failed to load image</p>
              <p className="text-gray-400 text-sm text-center max-w-md">
                The screenshot could not be loaded. It may have been deleted or you don&apos;t have permission to view it.
              </p>
            </div>
          )}

          <img
            src={resolvedUrl}
            alt="Payment Screenshot"
            onLoad={handleImageLoad}
            onError={handleImageError}
            className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${
              loading ? 'opacity-0' : 'opacity-100'
            } ${error ? 'hidden' : 'block'}`}
          />
        </div>

        {/* Footer Info */}
        {!loading && !error && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900/95 to-transparent p-4 text-center">
            <p className="text-gray-400 text-xs">
              Click outside or press ESC to close • Click download button to save image {signed ? '• Signed URL' : ''}
            </p>
          </div>
        )}
        {error && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900/95 to-transparent p-2 text-center">
            <p className="text-red-400 text-xs">Error loading image {statusCode ? `(HTTP ${statusCode})` : ''}</p>
            {signed && <p className="text-yellow-400 text-[10px]">Signed URL may have expired. Close and reopen to regenerate.</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageModal;
