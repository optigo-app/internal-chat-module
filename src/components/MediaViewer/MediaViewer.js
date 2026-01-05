import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, IconButton } from '@mui/material';
import { X, Download, ChevronLeft, ChevronRight, FileText, FileType, FileSpreadsheet, FileArchive, FileCode, File } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Keyboard } from 'swiper/modules';
import 'swiper/css';
import './MediaViewer.scss';
import { handleDownloadFile } from '../../utils/globalFunc';

const getFileExt = (name = '') => {
  const cleaned = String(name ?? '').trim().toLowerCase();
  const idx = cleaned.lastIndexOf('.');
  return idx >= 0 ? cleaned.slice(idx + 1) : '';
};

const getDocumentVisual = (name = '') => {
  const ext = getFileExt(name);

  if (ext === 'pdf') return { Icon: FileText, tone: 'pdf' };
  if (ext === 'doc' || ext === 'docx') return { Icon: FileType, tone: 'doc' };
  if (ext === 'xls' || ext === 'xlsx' || ext === 'csv') return { Icon: FileSpreadsheet, tone: 'sheet' };
  if (ext === 'ppt' || ext === 'pptx') return { Icon: FileType, tone: 'ppt' };
  if (ext === 'zip' || ext === 'rar' || ext === '7z') return { Icon: FileArchive, tone: 'archive' };
  if (ext === 'json' || ext === 'xml' || ext === 'html' || ext === 'js' || ext === 'ts') return { Icon: FileCode, tone: 'code' };

  return { Icon: File, tone: 'default' };
};

const MediaViewer = ({ mediaItems, initialIndex = 0, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [loading, setLoading] = useState({});
  const swiperRef = useRef(null);

  const pauseVideosInElement = useCallback((rootEl) => {
    if (!rootEl || typeof rootEl.querySelectorAll !== 'function') return;
    const videos = rootEl.querySelectorAll('video');
    videos.forEach((video) => {
      try {
        if (video && typeof video.pause === 'function' && !video.paused) {
          video.pause();
        }
      } catch (e) {
      }
    });
  }, []);

  useEffect(() => {
    setCurrentIndex(initialIndex);

    if (swiperRef.current) {
      if (typeof swiperRef.current.slideToLoop === 'function') {
        swiperRef.current.slideToLoop(initialIndex, 0);
      } else if (typeof swiperRef.current.slideTo === 'function') {
        swiperRef.current.slideTo(initialIndex, 0);
      }
    }
  }, [initialIndex]);

  const currentMedia = mediaItems[currentIndex];

  const handlePrev = () => {
    if (swiperRef.current && typeof swiperRef.current.slidePrev === 'function') {
      swiperRef.current.slidePrev();
      return;
    }

    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : mediaItems.length - 1));
  };

  const handleNext = () => {
    if (swiperRef.current && typeof swiperRef.current.slideNext === 'function') {
      swiperRef.current.slideNext();
      return;
    }

    setCurrentIndex((prev) => (prev < mediaItems.length - 1 ? prev + 1 : 0));
  };

  const markLoaded = (key) => {
    setLoading(prev => ({ ...prev, [key]: false }));
  };

  const enableLoop = mediaItems.length > 1;

  return (
    <Dialog
      open
      onClose={(event, reason) => {
        if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
          onClose?.();
        }
      }}
      sx={{ zIndex: 10000 }}

      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
          },
        },
      }}
      PaperProps={{
        className: 'media-viewer-container',
        elevation: 0,
        sx: { m: 0 },
      }}
      maxWidth={false}
    >
      {/* Header */}
      <div className="media-viewer-header">
        <div className="media-viewer-header-left">
          <div className="media-viewer-title">
            {currentMedia?.name || `Media ${currentIndex + 1}`}
          </div>
        </div>

        <div className="media-viewer-header-right">
          <IconButton className="media-viewer-download" onClick={() => handleDownloadFile(currentMedia?.src, currentMedia?.name)}>
            <Download size={20} />
          </IconButton>
          <IconButton className="media-viewer-close" onClick={() => onClose?.()}>
            <X size={20} />
          </IconButton>
        </div>
      </div>

      {/* Media Display Area */}
      <div className="media-viewer-content">
        {mediaItems.length > 1 && (
          <button className="media-viewer-nav prev" onClick={handlePrev}>
            <ChevronLeft size={25} />
          </button>
        )}

        <div className="media-viewer-display">
          <Swiper
            className="media-viewer-swiper"
            initialSlide={initialIndex}
            loop={enableLoop}
            allowTouchMove={enableLoop}
            slidesPerView={1}
            resizeObserver={false}
            observer={false}
            observeParents={false}
            onSwiper={(swiper) => {
              swiperRef.current = swiper;
            }}
            onSlideChangeTransitionStart={(swiper) => {
              pauseVideosInElement(swiper?.el);
            }}
            onSlideChange={(swiper) => {
              const nextIndex = typeof swiper?.realIndex === 'number' ? swiper.realIndex : swiper.activeIndex;
              setCurrentIndex(nextIndex);
            }}
            keyboard={{ enabled: true }}
            modules={[Keyboard]}
          >
            {mediaItems.map((item, index) => {
              const slideLoading = loading[index];

              return (
                <SwiperSlide key={index}>
                  <div className="media-viewer-slide">
                    {item?.type === 'image' && (
                      <>
                        {slideLoading && (
                          <div className="media-loading">
                            <div className="spinner"></div>
                          </div>
                        )}
                        <img
                          src={item.src}
                          alt={item.name || 'Image'}
                          className={`media-content ${slideLoading ? 'loading' : 'loaded'}`}
                          onLoad={() => markLoaded(index)}
                          onError={() => markLoaded(index)}
                          style={{ display: slideLoading ? 'none' : 'block' }}
                        />
                      </>
                    )}

                    {item?.type === 'video' && (
                      <video
                        src={item.src}
                        className="media-content"
                        controls
                        onLoadedData={() => markLoaded(index)}
                        onError={() => markLoaded(index)}
                      />
                    )}

                    {item?.type === 'document' && (
                      (() => {
                        const { Icon: DocIcon, tone } = getDocumentVisual(item?.name);

                        return (
                          <div className="document-preview">
                            <div className="document-header">
                              <div className={`document-icon ${tone}`}>
                                <DocIcon size={36} />
                              </div>
                              <div className="document-info">
                                <div className="document-name">{item.name || 'Document'}</div>
                                <div className="document-size">{item.size}</div>
                              </div>
                            </div>

                            <div className="document-actions">
                              <button
                                type="button"
                                className="document-action primary"
                                onClick={() => handleDownloadFile(item?.src, item?.name)}
                              >
                                <Download size={18} />
                                Download
                              </button>
                            </div>

                          </div>
                        );
                      })()
                    )}
                  </div>
                </SwiperSlide>
              );
            })}
          </Swiper>
        </div>

        {mediaItems.length > 1 && (
          <button className="media-viewer-nav next" onClick={handleNext}>
            <ChevronRight size={25} />
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
              onClick={() => {
                if (swiperRef.current) {
                  if (typeof swiperRef.current.slideToLoop === 'function') {
                    swiperRef.current.slideToLoop(index);
                    return;
                  }

                  if (typeof swiperRef.current.slideTo === 'function') {
                    swiperRef.current.slideTo(index);
                    return;
                  }
                }

                setCurrentIndex(index);
              }}
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
                (() => {
                  const { Icon: DocIcon, tone } = getDocumentVisual(item?.name);
                  return (
                    <div className="thumbnail-document">
                      <div className={`thumbnail-icon ${tone}`}>
                        <DocIcon size={22} />
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          ))}
        </div>
      )}
    </Dialog>
  );
};

export default MediaViewer;