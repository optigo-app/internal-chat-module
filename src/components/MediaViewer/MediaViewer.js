import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, IconButton, Tooltip, Avatar, Skeleton } from '@mui/material';
import { X, Download, ChevronLeft, ChevronRight, FileText, FileType, FileSpreadsheet, FileArchive, FileCode, File, ZoomIn, ZoomOut, Reply, Smile, Forward, Trash2, ExternalLink } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Keyboard, Mousewheel, Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import './MediaViewer.scss';
import { handleDownloadFile, getCustomerDisplayName, getWhatsAppAvatarConfig, getCustomerAvatarSeed, hasCustomerName, getFileExt, getDocumentMeta } from '../../utils/globalFunc';
import { FormatDateIST } from '../../utils/DateFnc';
import PersonIcon from '@mui/icons-material/Person';
import QuickReactionMenu from '../Conversation/QuickReactionMenu';
import ReactionDetailsMenu from '../Conversation/ReactionMenu';
import { charToUnified, parseReactions } from '../../utils/EmojiUtils';
import { Emoji } from 'emoji-picker-react';
import { Box } from '@mui/material';

const MediaViewer = ({ mediaItems, initialIndex = 0, onClose, selectedCustomer, onReply, onForward, message, messages, auth, handleMessageEmojiClick, handleRemoveReaction }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [loading, setLoading] = useState(() => {
    const initialState = {};
    mediaItems.forEach((_, idx) => {
      initialState[idx] = true;
    });

    return initialState;
  });
  const swiperRef = useRef(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const draggingRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const reactionButtonRef = useRef(null);
  const [reactionAnchorEl, setReactionAnchorEl] = useState(null);
  const [detailAnchorEl, setDetailAnchorEl] = useState(null);

  // Sync with the actual messages array to get live reaction updates
  const liveMessage = React.useMemo(() => {
    const list = Array.isArray(messages?.data) ? messages.data : (Array.isArray(messages) ? messages : []);
    const found = list.find(m => String(m.Id || m.MessageId) === String(message?.Id || message?.MessageId));
    return found || message;
  }, [messages, message]);

  const parsedReactions = React.useMemo(() => parseReactions(liveMessage?.ReactionEmojis), [liveMessage?.ReactionEmojis]);

  const resetZoom = useCallback(() => {
    setZoomLevel(1);
    setOffset({ x: 0, y: 0 });
  }, []);

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

  const markLoaded = (key) => {
    setLoading(prev => ({ ...prev, [key]: false }));
  };

  const enableLoop = mediaItems.length > 1;

  const handleZoomIn = useCallback(() => {
    setZoomLevel((prev) => Math.min(prev + 0.2, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel((prev) => {
      const next = Math.max(prev - 0.2, 0.5);
      if (next <= 1) setOffset({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const handlePointerDown = (e) => {
    if (zoomLevel > 1) {
      draggingRef.current = true;
      startPosRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e) => {
    if (draggingRef.current && zoomLevel > 1) {
      const newX = e.clientX - startPosRef.current.x;
      const newY = e.clientY - startPosRef.current.y;
      setOffset({ x: newX, y: newY });
    }
  };

  const handlePointerUp = () => {
    draggingRef.current = false;
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      const target = e.target;
      const tagName = target?.tagName?.toLowerCase?.();
      const isTypingTarget = Boolean(
        target?.isContentEditable ||
        tagName === 'input' ||
        tagName === 'textarea' ||
        tagName === 'select'
      );

      if (isTypingTarget) return;
      if (e.altKey) return;

      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      const key = e.key;
      const code = e.code;

      if (key === '+' || key === '=' || code === 'NumpadAdd') {
        if (isCtrlOrMeta || !isCtrlOrMeta) { // Support both with and without Ctrl/Cmd
          e.preventDefault();
          handleZoomIn();
          return;
        }
      }

      if (key === '-' || code === 'NumpadSubtract') {
        if (isCtrlOrMeta || !isCtrlOrMeta) {
          e.preventDefault();
          handleZoomOut();
          return;
        }
      }

      if (key === '0' || code === 'Digit0' || code === 'Numpad0') {
        e.preventDefault();
        resetZoom();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleZoomIn, handleZoomOut, resetZoom]);

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

  const currentMedia = mediaItems[currentIndex];
  const dateStr = message?.Date;
  const timeStr = message?.Time || message?.dateTime ? message?.Time || message?.dateTime : message?.DateTime ? FormatDateIST(message?.DateTime, "dd-mm-yyyy")?.time.toLowerCase() : '';
  const dateObj = new Date(dateStr);
  const formattedDate = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(dateObj);
  const timeStrUpper = timeStr.replace(/am|pm/g, (match) => match.toUpperCase());
  let messageTimestamp = `${formattedDate} at ${timeStrUpper}`;

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
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
          },
        },
      }}
      PaperProps={{
        className: 'media-viewer-container',
        elevation: 0,
        sx: { m: 0 },
      }}
      maxWidth={false}
      fullScreen
    >
      {/* Header */}
      <div className="media-viewer-header">
        <div className="media-viewer-header-left">
          {!hasCustomerName(selectedCustomer) ? (
            <Avatar
              {...getWhatsAppAvatarConfig(getCustomerAvatarSeed(selectedCustomer))}
            >
              <PersonIcon fontSize="small" />
            </Avatar>
          ) : (
            <Avatar {...selectedCustomer.avatarConfig} />
          )}
          <div className="media-viewer-user-info">
            <div className="media-viewer-username">{getCustomerDisplayName(selectedCustomer)}</div>
            <div className="media-viewer-timestamp">{messageTimestamp}</div>
          </div>
        </div>

        <div className="media-viewer-header-right">
          <div className="media-viewer-toolbar">
            <Tooltip title="Zoom In" placement='bottom' slotProps={{ popper: { sx: { zIndex: 11000 } } }}>
              <IconButton className="toolbar-btn" onClick={handleZoomIn}><ZoomIn size={18} /></IconButton>
            </Tooltip>
            <Tooltip title="Zoom Out" placement='bottom' slotProps={{ popper: { sx: { zIndex: 11000 } } }}>
              <IconButton className="toolbar-btn" onClick={handleZoomOut}><ZoomOut size={18} /></IconButton>
            </Tooltip>
            <div className="toolbar-divider" />
            <Tooltip title="Reply" placement='bottom' slotProps={{ popper: { sx: { zIndex: 11000 } } }}>
              <IconButton className="toolbar-btn" onClick={() => onReply(currentMedia?.attachmentId)}><Reply size={18} /></IconButton>
            </Tooltip>
            <Tooltip title="React" placement='bottom' slotProps={{ popper: { sx: { zIndex: 11000 } } }}>
              <IconButton
                ref={reactionButtonRef}
                className="toolbar-btn"
                onClick={() => setReactionAnchorEl(reactionButtonRef.current)}
              >
                <Smile size={18} />
              </IconButton>
            </Tooltip>
            <QuickReactionMenu
              open={Boolean(reactionAnchorEl)}
              anchorEl={reactionAnchorEl}
              hideTrigger={true}
              disablePortal={true}
              onOpen={(e) => setReactionAnchorEl(e.currentTarget)}
              onClose={() => setReactionAnchorEl(null)}
              onSelectEmoji={(emoji) => {
                if (typeof handleMessageEmojiClick === 'function') {
                  handleMessageEmojiClick(emoji, liveMessage);
                }
                setReactionAnchorEl(null);
              }}
            />
            <Tooltip title="Forward" placement='bottom' slotProps={{ popper: { sx: { zIndex: 11000 } } }}>
              <IconButton className="toolbar-btn" onClick={(e) => onForward?.(e, currentMedia?.attachmentId)}><Forward size={18} /></IconButton>
            </Tooltip>
            <Tooltip title="Download" placement='bottom' slotProps={{ popper: { sx: { zIndex: 11000 } } }}>
              <IconButton className="toolbar-btn" onClick={() => handleDownloadFile(currentMedia?.src, currentMedia?.name)}><Download size={18} /></IconButton>
            </Tooltip>
            <div className="toolbar-divider" />
            <Tooltip title="Close" placement='bottom' slotProps={{ popper: { sx: { zIndex: 11000 } } }}>
              <IconButton className="toolbar-btn media-viewer-close" onClick={() => onClose?.()}>
                <X size={20} />
              </IconButton>
            </Tooltip>
          </div>
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
              resetZoom();
            }}
            keyboard={{ enabled: true }}
            mousewheel={true}
            modules={[Keyboard, Mousewheel, Navigation]}
          >
            {mediaItems.map((item, index) => {
              const slideLoading = loading[index];

              return (
                <SwiperSlide key={index}>
                  <div className="media-viewer-slide">
                    {item?.type === 'image' && (
                      <>
                        {slideLoading && (
                          <Skeleton
                            variant="rectangular"
                            width="100%"
                            height="100%"
                            sx={{
                              bgcolor: 'rgba(255, 255, 255, 0.05)',
                              borderRadius: '12px',
                              position: 'absolute',
                              maxWidth: 'min(900px, 90%)',
                              maxHeight: 'min(700px, 80%)'
                            }}
                            animation="wave"
                          />
                        )}
                        <img
                          src={item.src}
                          alt={item.name || 'Image'}
                          className={`media-content ${slideLoading ? 'loading' : 'loaded'}`}
                          onLoad={() => markLoaded(index)}
                          onError={() => markLoaded(index)}
                          onPointerDown={handlePointerDown}
                          onPointerMove={handlePointerMove}
                          onPointerUp={handlePointerUp}
                          style={{
                            display: slideLoading ? 'none' : 'block',
                            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoomLevel})`,
                            transition: draggingRef.current ? 'none' : 'transform 0.2s ease-in-out',
                            cursor: zoomLevel > 1 ? (draggingRef.current ? 'grabbing' : 'grab') : 'default',
                            touchAction: 'none'
                          }}
                        />
                      </>
                    )}

                    {item?.type === 'video' && (
                      <>
                        {slideLoading && (
                          <Skeleton
                            variant="rectangular"
                            width="100%"
                            height="100%"
                            sx={{
                              bgcolor: 'rgba(255, 255, 255, 0.05)',
                              borderRadius: '12px',
                              position: 'absolute',
                              maxWidth: 'min(800px, 90%)',
                              maxHeight: 'min(600px, 80%)'
                            }}
                            animation="wave"
                          />
                        )}
                        <video
                          src={item.src}
                          className="media-content"
                          controls
                          onLoadedData={() => markLoaded(index)}
                          onCanPlay={() => markLoaded(index)}
                          onError={() => markLoaded(index)}
                          onPointerDown={handlePointerDown}
                          onPointerMove={handlePointerMove}
                          onPointerUp={handlePointerUp}
                          style={{
                            display: slideLoading ? 'none' : 'block',
                            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoomLevel})`,
                            transition: draggingRef.current ? 'none' : 'transform 0.2s ease-in-out',
                            cursor: zoomLevel > 1 ? (draggingRef.current ? 'grabbing' : 'grab') : 'default',
                            touchAction: 'none'
                          }}
                        />
                      </>
                    )}

                    {item?.type === 'document' && (
                      (() => {
                        const meta = getDocumentMeta(item?.name);
                        const IconMap = { FileText, FileType, FileSpreadsheet, FileArchive, FileCode, File };
                        const DocIcon = IconMap[meta.iconName] || File;

                        return (
                          <div className="document-preview">
                            <div className="document-header">
                              <div className={`document-icon ${meta.iconUrl ? '' : meta.tone}`} style={meta.iconUrl ? { background: 'none', padding: 0 } : {}}>
                                {meta.iconUrl ? (
                                  <img src={meta.iconUrl} alt={meta.label} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                ) : (
                                  <DocIcon size={36} />
                                )}
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

                    {/* Reaction Overlay (Consolidated Bottom-Left) */}
                    {liveMessage?.ReactionEmojis && liveMessage.ReactionEmojis !== "" && liveMessage.ReactionEmojis !== "[]" && (
                      <Box
                        className="media-viewer-reaction-group"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetailAnchorEl(e.currentTarget);
                        }}
                      >
                        <div className="reaction-pills">
                          {(() => {
                            try {
                              const reactions = JSON.parse(liveMessage.ReactionEmojis);
                              if (Array.isArray(reactions)) {
                                const uniqueEmojis = [...new Set(reactions.map(r => r?.Reaction || r?.Emoji))].slice(0, 3);
                                return (
                                  <>
                                    <div className="reaction-icons">
                                      {uniqueEmojis.map((emojiChar, idx) => {
                                        const unified = charToUnified(emojiChar);
                                        return unified ? (
                                          <Emoji key={idx} unified={unified} size={20} emojiStyle="apple" />
                                        ) : (
                                          <span key={idx}>{emojiChar}</span>
                                        );
                                      })}
                                    </div>
                                  </>
                                );
                              }
                            } catch (e) {
                              console.error("MediaViewer slide reactions parse error:", e);
                            }
                            return null;
                          })()}
                        </div>
                      </Box>
                    )}
                  </div>
                </SwiperSlide>
              );
            })}
          </Swiper>
        </div>

        {/* Reaction Details Menu */}
        {liveMessage?.ReactionEmojis && (
          <ReactionDetailsMenu
            anchorEl={detailAnchorEl}
            onClose={() => setDetailAnchorEl(null)}
            reactions={parsedReactions}
            auth={auth}
            disablePortal={true}
            onRemoveReaction={(reaction) => {
              if (typeof handleRemoveReaction === 'function') {
                handleRemoveReaction(reaction, liveMessage);
              }
              setDetailAnchorEl(null);
            }}
          />
        )}

        {mediaItems.length > 1 && (
          <button className="media-viewer-nav next" onClick={handleNext}>
            <ChevronRight size={25} />
          </button>
        )}
      </div>

      {/* Footer / Thumbnails */}
      <div className="media-viewers-footer">
        <div className="media-count">
          {currentIndex + 1} of {mediaItems.length}
        </div>
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
                    <img
                      src={`${process.env.PUBLIC_URL}/icons/video.png`}
                      alt="Video"
                      className="thumbnail-video-icon"
                    />
                  </div>
                )}
                {item.type === 'document' && (
                  (() => {
                    const meta = getDocumentMeta(item?.name);
                    const IconMap = { FileText, FileType, FileSpreadsheet, FileArchive, FileCode, File };
                    const DocIcon = IconMap[meta.iconName] || File;

                    return (
                      <div className="thumbnail-document">
                        <div className={`thumbnail-icon ${meta.iconUrl ? '' : meta.tone}`} style={meta.iconUrl ? { background: 'none', padding: 0 } : {}}>
                          {meta.iconUrl ? (
                            <img src={meta.iconUrl} alt={meta.label} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                          ) : (
                            <DocIcon size={22} />
                          )}
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Dialog>
  );
};

export default MediaViewer;