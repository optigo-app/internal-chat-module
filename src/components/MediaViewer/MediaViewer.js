import React, { useState, useEffect } from 'react';
import { X, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import './MediaViewer.scss';

const MediaViewer = ({ mediaItems, initialIndex = 0, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [loading, setLoading] = useState({});

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  const currentMedia = mediaItems[currentIndex];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : mediaItems.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < mediaItems.length - 1 ? prev + 1 : 0));
  };

  const handleDownload = () => {
    if (currentMedia?.src) {
      const link = document.createElement('a');
      link.href = currentMedia.src;
      link.download = currentMedia.name || 'media';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowLeft') {
      handlePrev();
    } else if (e.key === 'ArrowRight') {
      handleNext();
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const markLoaded = (key) => {
    setLoading(prev => ({ ...prev, [key]: false }));
  };

  const isLoading = loading[currentIndex];

  return (
    <div className="media-viewer-overlay" onClick={onClose}>
      <div className="media-viewer-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="media-viewer-header">
          <button className="media-viewer-close" onClick={onClose}>
            <X size={24} />
          </button>
          <div className="media-viewer-title">
            {currentMedia?.name || `Media ${currentIndex + 1}`}
          </div>
          <button className="media-viewer-download" onClick={handleDownload}>
            <Download size={20} />
          </button>
        </div>

        {/* Media Display Area */}
        <div className="media-viewer-content">
          {mediaItems.length > 1 && (
            <button className="media-viewer-nav prev" onClick={handlePrev}>
              <ChevronLeft size={32} />
            </button>
          )}

          <div className="media-viewer-display">
            {currentMedia?.type === 'image' && (
              <>
                {isLoading && (
                  <div className="media-loading">
                    <div className="spinner"></div>
                  </div>
                )}
                <img
                  src={currentMedia.src}
                  alt={currentMedia.name || 'Image'}
                  className={`media-content ${isLoading ? 'loading' : 'loaded'}`}
                  onLoad={() => markLoaded(currentIndex)}
                  onError={() => markLoaded(currentIndex)}
                  style={{ display: isLoading ? 'none' : 'block' }}
                />
              </>
            )}

            {currentMedia?.type === 'video' && (
              <video
                src={currentMedia.src}
                className="media-content"
                controls
                autoPlay
                onLoadedData={() => markLoaded(currentIndex)}
                onError={() => markLoaded(currentIndex)}
              />
            )}

            {currentMedia?.type === 'document' && (
              <div className="document-preview">
                <div className="document-icon">
                  {currentMedia.name?.endsWith('.pdf') && '📄'}
                  {(currentMedia.name?.endsWith('.doc') || currentMedia.name?.endsWith('.docx')) && '📝'}
                  {(currentMedia.name?.endsWith('.xls') || currentMedia.name?.endsWith('.xlsx')) && '📊'}
                  {currentMedia.name?.endsWith('.txt') && '📄'}
                  {!currentMedia.name?.endsWith('.pdf') &&
                   !currentMedia.name?.endsWith('.doc') &&
                   !currentMedia.name?.endsWith('.docx') &&
                   !currentMedia.name?.endsWith('.xls') &&
                   !currentMedia.name?.endsWith('.xlsx') &&
                   !currentMedia.name?.endsWith('.txt') && '📎'}
                </div>
                <div className="document-info">
                  <div className="document-name">{currentMedia.name}</div>
                  <div className="document-size">{currentMedia.size}</div>
                </div>
                <a href={currentMedia.src} download={currentMedia.name} className="document-download-btn">
                  <Download size={20} />
                  Download
                </a>
              </div>
            )}
          </div>

          {mediaItems.length > 1 && (
            <button className="media-viewer-nav next" onClick={handleNext}>
              <ChevronRight size={32} />
            </button>
          )}
        </div>

        {/* Thumbnails */}
        {mediaItems.length > 1 && (
          <div className="media-viewer-thumbnails">
            {mediaItems.map((item, index) => (
              <div
                key={index}
                className={`thumbnail ${index === currentIndex ? 'active' : ''}`}
                onClick={() => setCurrentIndex(index)}
              >
                {item.type === 'image' && (
                  <img src={item.src} alt={`Thumbnail ${index}`} />
                )}
                {item.type === 'video' && (
                  <div className="thumbnail-video">
                    <div className="thumbnail-icon">🎬</div>
                  </div>
                )}
                {item.type === 'document' && (
                  <div className="thumbnail-document">
                    <div className="thumbnail-icon">
                      {item.name?.endsWith('.pdf') && '📄'}
                      {(item.name?.endsWith('.doc') || item.name?.endsWith('.docx')) && '📝'}
                      {(item.name?.endsWith('.xls') || item.name?.endsWith('.xlsx')) && '📊'}
                      {item.name?.endsWith('.txt') && '📄'}
                      {!item.name?.endsWith('.pdf') &&
                       !item.name?.endsWith('.doc') &&
                       !item.name?.endsWith('.docx') &&
                       !item.name?.endsWith('.xls') &&
                       !item.name?.endsWith('.xlsx') &&
                       !item.name?.endsWith('.txt') && '📎'}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaViewer;