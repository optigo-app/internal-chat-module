import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { X, Trash2 } from 'lucide-react';
import './MediaPreview.scss';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, FreeMode, Thumbs } from 'swiper/modules';

// Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/thumbs';
import 'swiper/css/free-mode';

const MediaPreview = ({ mediaFiles, scrollToBottom, setMediaFiles = () => { }, handleClosePreview, handleSendMessage }) => {
    const fileInputRef = useRef(null);
    const mainSwiperRef = useRef(null);
    const [thumbsSwiper, setThumbsSwiper] = useState(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [mediaItems, setMediaItems] = useState([]);
    const [textPreview, setTextPreview] = useState('');
    const [textPreviewError, setTextPreviewError] = useState('');

    const safeCreateObjectUrl = useCallback((maybeBlob) => {
        try {
            if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return null;
            if (!maybeBlob || typeof maybeBlob !== 'object') return null;
            // File extends Blob in browsers
            if (maybeBlob instanceof Blob) {
                return URL.createObjectURL(maybeBlob);
            }
            return null;
        } catch (e) {
            return null;
        }
    }, []);

    const getExtLower = useCallback((fileName) => {
        const name = (fileName || '').toLowerCase();
        const parts = name.split('.');
        if (parts.length < 2) return '';
        return parts.pop() || '';
    }, []);

    const getMime = useCallback((obj) => {
        return obj?.type || obj?.mimeType || obj?.mimetype || '';
    }, []);

    const getAnyName = useCallback((obj) => {
        return obj?.name || obj?.fileName || obj?.filename || '';
    }, []);

    const isImageLike = useCallback((file) => {
        const mime = getMime(file);
        if (mime.startsWith('image/')) return true;
        const ext = getExtLower(getAnyName(file));
        return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'tif', 'tiff', 'ico'].includes(ext);
    }, [getAnyName, getExtLower, getMime]);

    const isVideoLike = useCallback((file) => {
        const mime = getMime(file);
        if (mime.startsWith('video/')) return true;
        const ext = getExtLower(getAnyName(file));
        return ['mp4', 'webm', 'ogg', 'mov', 'm4v', 'mkv'].includes(ext);
    }, [getAnyName, getExtLower, getMime]);

    // Update mediaItems when mediaFiles changes
    useEffect(() => {
        const normalizedItems = (mediaFiles || []).map((input, index) => {
            // Support both File objects and legacy objects { preview/url, name, type }
            const fileObj = input?.file && typeof input?.file === 'object' ? input.file : input;

            const name = fileObj?.name || input?.name || input?.fileName || `file-${index}`;
            const size = typeof fileObj?.size === 'number' ? fileObj.size : (typeof input?.size === 'number' ? input.size : 0);
            const lastModified = typeof fileObj?.lastModified === 'number' ? fileObj.lastModified : (typeof input?.lastModified === 'number' ? input.lastModified : 0);
            const id = input?.id || `${name}-${size}-${lastModified}-${index}`;

            const isImage = isImageLike(fileObj) || isImageLike(input);
            const isVideo = isVideoLike(fileObj) || isVideoLike(input);
            const type = isImage ? 'image' : isVideo ? 'video' : 'file';

            const existingUrl = input?.url || input?.preview || fileObj?.preview || null;
            const objectUrl = (isImage || isVideo) ? safeCreateObjectUrl(fileObj) : null;

            return {
                id,
                type,
                file: fileObj,
                url: objectUrl || existingUrl,
                revokeOnCleanup: Boolean(objectUrl),
                name,
            };
        });

        setMediaItems(normalizedItems);

        setCurrentIndex((prev) => {
            if (normalizedItems.length === 0) return 0;
            return Math.min(prev, normalizedItems.length - 1);
        });

        // Clean up object URLs to prevent memory leaks
        return () => {
            normalizedItems.forEach((item) => {
                if (item.url && item.revokeOnCleanup) {
                    try {
                        URL.revokeObjectURL(item.url);
                    } catch (e) {
                        // ignore
                    }
                }
            });
        };
    }, [isImageLike, isVideoLike, mediaFiles, safeCreateObjectUrl]);

    const currentMedia = mediaItems[currentIndex];

    const currentMediaUrl = useMemo(() => {
        if (!currentMedia) return '';
        return currentMedia.url || currentMedia.preview || currentMedia.file?.preview || '';
    }, [currentMedia]);

    const currentFileMeta = useMemo(() => {
        const file = currentMedia?.file;
        if (!currentMedia) return { sizeText: '', extText: '' };

        const bytes = typeof file?.size === 'number' ? file.size : 0;
        const sizeInKb = bytes / 1024;
        const sizeText = sizeInKb > 1024 ? `${(sizeInKb / 1024).toFixed(1)} MB` : `${sizeInKb.toFixed(1)} KB`;
        const extText = ((currentMedia?.name || '').split('.').pop() || '').toUpperCase();
        return { sizeText, extText };
    }, [currentMedia]);

    const totalSizeMB = useMemo(() => {
        const totalBytes = mediaItems.reduce((acc, item) => {
            const bytes = typeof item.file?.size === 'number' ? item.file.size : 0;
            return acc + bytes;
        }, 0);
        return (totalBytes / (1024 * 1024)).toFixed(1);
    }, [mediaItems]);

    useEffect(() => {
        let cancelled = false;
        setTextPreview('');
        setTextPreviewError('');

        const file = currentMedia?.file;
        const name = (currentMedia?.name || file?.name || '').toLowerCase();
        if (!file || !name.endsWith('.txt')) return;

        if (typeof file.text !== 'function') {
            setTextPreviewError('Unable to load text preview');
            return;
        }

        file
            .text()
            .then((text) => {
                if (cancelled) return;
                setTextPreview(text || '');
            })
            .catch(() => {
                if (cancelled) return;
                setTextPreviewError('Unable to load text preview');
            });

        return () => {
            cancelled = true;
        };
    }, [currentMedia]);

    // Handlers
    const handleClose = useCallback(() => {
        handleClosePreview();
    }, [handleClosePreview]);

    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key === 'Escape') {
                handleClose();
                return;
            }

            if (e.key === 'ArrowLeft') {
                const nextIndex = Math.max(0, currentIndex - 1);

                if (mainSwiperRef.current && typeof mainSwiperRef.current.slideTo === 'function') {
                    mainSwiperRef.current.slideTo(nextIndex);
                } else {
                    setCurrentIndex(nextIndex);
                }
                return;
            }

            if (e.key === 'ArrowRight') {
                const nextIndex = Math.min(mediaItems.length - 1, currentIndex + 1);

                if (mainSwiperRef.current && typeof mainSwiperRef.current.slideTo === 'function') {
                    mainSwiperRef.current.slideTo(nextIndex);
                } else {
                    setCurrentIndex(nextIndex);
                }
                return;
            }

            if (e.key === 'Enter') {
                e.preventDefault();
                if (typeof handleSendMessage === 'function') {
                    handleSendMessage();
                }
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [currentIndex, handleClose, mediaItems.length, handleSendMessage]);


    const removeMedia = (id) => {
        setMediaItems((prev) => {
            const filtered = prev.filter((item) => item.id !== id);
            if (filtered.length === 0) {
                setCurrentIndex(0);
                handleClose();
            } else {
                setCurrentIndex((prevIndex) => Math.min(prevIndex, filtered.length - 1));
            }
            return filtered;
        });
        if (typeof setMediaFiles === 'function') {
            setMediaFiles((prev) => {
                const filtered = (prev || []).filter((file) => `${file.name}-${file.size}-${file.lastModified}` !== id);
                return filtered;
            });
        }
    };


    return (
        <div className="media-preview-container">
            <div className="media-preview-overlay">
                {/* Header */}
                <div className="media-preview-header">
                    <div className="media-preview-header-left">
                        <button className="icon-btn" onClick={handleClose} aria-label="Close preview">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="media-preview-header-center">
                        <div className="media-title" title={currentMedia?.name || ''}>
                            {currentMedia?.name || 'Media preview'}
                        </div>
                        {currentMedia?.file ? (
                            <div className="media-subtitle">
                                {currentFileMeta.sizeText}{currentFileMeta.extText ? ` · ${currentFileMeta.extText}` : ''}{mediaItems.length ? ` · ${currentIndex + 1} of ${mediaItems.length}` : ''} · Total: {totalSizeMB} MB
                            </div>
                        ) : null}
                    </div>

                    <div className="media-preview-header-right">
                        <button
                            className="icon-btn"
                            onClick={() => currentMedia?.id && removeMedia(currentMedia.id)}
                            disabled={!currentMedia?.id}
                            aria-label="Remove current item"
                        >
                            <Trash2 size={20} />
                        </button>
                    </div>
                </div>

                {/* Main Media Display */}
                <div className="media-display-area">
                    <Swiper
                        spaceBetween={10}
                        navigation={mediaItems.length > 1}
                        thumbs={{ swiper: thumbsSwiper && !thumbsSwiper.destroyed ? thumbsSwiper : null }}
                        modules={[Navigation, Thumbs]}
                        className="main-media-swiper"
                        onSwiper={(swiper) => {
                            mainSwiperRef.current = swiper;
                        }}
                        onSlideChange={(swiper) => setCurrentIndex(swiper.activeIndex)}
                    >
                        {mediaItems.map((item, index) => {
                            const url = item.url || item.preview || item.file?.preview || '';
                            return (
                                <SwiperSlide key={item.id}>
                                    <div className="media-container">
                                        {item.type === 'image' && (
                                            <div className="media-stage">
                                                <img
                                                    src={url}
                                                    alt={item.name || 'media'}
                                                    className="media-itemscl media-item--image"
                                                />
                                            </div>
                                        )}

                                        {item.type === 'video' && (
                                            <div className="media-stage">
                                                <video src={url} className="media-itemscl media-item--video" controls />
                                            </div>
                                        )}

                                        {item.type === 'file' && (
                                            <>
                                                {((item.name || item.file?.name || '').toLowerCase()).endsWith('.pdf') ? (
                                                    <div className="no-preview-container">
                                                        <div className="file-icon">
                                                            <img src="./icons/pdf.png" alt="Pdf" style={{ height: "100px", width: "100%" }} />
                                                        </div>
                                                        <div className="file-name">{item.name || item.file?.name}</div>
                                                        <div className="file-meta">
                                                            {currentFileMeta.sizeText} · {currentFileMeta.extText}
                                                        </div>
                                                        <div className="no-preview-text">No preview available</div>
                                                    </div>
                                                ) : ((item.name || item.file?.name || '').toLowerCase()).endsWith('.doc') || ((item.name || item.file?.name || '').toLowerCase()).endsWith('.docx') ? (
                                                    <div className="no-preview-container">
                                                        <div className="file-icon">
                                                            <img src="./icons/doc.png" alt="Excel" style={{ height: "100px", width: "100%" }} />
                                                        </div>
                                                        <div className="file-name">{item.name || item.file?.name}</div>
                                                        <div className="file-meta">
                                                            {currentFileMeta.sizeText} · {currentFileMeta.extText}
                                                        </div>
                                                        <div className="no-preview-text">No preview available</div>
                                                    </div>
                                                ) : ((item.name || item.file?.name || '').toLowerCase()).endsWith('.xls') || ((item.name || item.file?.name || '').toLowerCase()).endsWith('.xlsx') || ((item.name || item.file?.name || '').toLowerCase()).endsWith('.csv') ? (
                                                    <div className="no-preview-container">
                                                        <div className="file-icon">
                                                            <img src="./icons/xls.png" alt="Excel" style={{ height: "100px", width: "100%" }} />
                                                        </div>
                                                        <div className="file-name">{item.name || item.file?.name}</div>
                                                        <div className="file-meta">
                                                            {currentFileMeta.sizeText} · {currentFileMeta.extText}
                                                        </div>
                                                        <div className="no-preview-text">No preview available</div>
                                                    </div>
                                                ) : ((item.name || item.file?.name || '').toLowerCase()).endsWith('.txt') ? (
                                                    <div className="no-preview-container">
                                                        <div className="file-icon">
                                                            <img src="./icons/txt.png" alt="Excel" style={{ height: "100px", width: "100%" }} />
                                                        </div>
                                                        <div className="file-name">{item.name || item.file?.name}</div>
                                                        <div className="file-meta">
                                                            {currentFileMeta.sizeText} · {currentFileMeta.extText}
                                                        </div>
                                                        <div className="no-preview-text">No preview available</div>
                                                    </div>
                                                ) : (
                                                    <div className="file-placeholder">
                                                        <span>Preview not available for {item.name || item.file?.name}</span>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </SwiperSlide>
                            );
                        })}
                    </Swiper>
                </div>

                {/* Thumbnails */}
                {mediaItems.length > 0 && (
                    <div className="thumbnails-container">
                        {/* Thumbnails */}
                        {mediaItems.length > 0 && (
                            <div className="thumbnails-container">
                                <Swiper
                                    onSwiper={setThumbsSwiper}
                                    spaceBetween={8}
                                    slidesPerView={"auto"}
                                    freeMode={true}
                                    watchSlidesProgress={true}
                                    modules={[FreeMode, Navigation, Thumbs]}
                                    className="thumbnails-swiper"
                                >
                                    {mediaItems.map((item, index) => {
                                        const mime = getMime(item.file);
                                        const name = (item.name || getAnyName(item.file) || '').toLowerCase();
                                        let thumbSrc = "./txt.png";
                                        const ext = getExtLower(item.name || getAnyName(item.file));
                                        const isPhotoThumb = mime.startsWith('image') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'tif', 'tiff', 'ico'].includes(ext);

                                        if (mime.startsWith('image') || isPhotoThumb) {
                                            thumbSrc = item.url || item.file.preview;
                                        } else if (mime.startsWith('video')) {
                                            thumbSrc = "./icons/video.png";
                                        } else if (name.endsWith('.pdf')) {
                                            thumbSrc = "./icons/pdf.png";
                                        } else if (name.endsWith('.doc') || name.endsWith('.docx')) {
                                            thumbSrc = "./icons/doc.png";
                                        } else if (name.endsWith('.xls') || name.endsWith('.xlsx') || name.endsWith('.csv')) {
                                            thumbSrc = "./icons/xls.png";
                                        } else if (name.endsWith('.txt')) {
                                            thumbSrc = "./icons/txt.png";
                                        }

                                        return (
                                            <SwiperSlide key={item.id} style={{ width: 'auto' }}>
                                                <div
                                                    className={`thumbnail ${index === currentIndex ? "active" : ""}`}
                                                >
                                                    <img src={thumbSrc} alt={item.name} className={`thumbnail-img ${isPhotoThumb ? 'is-photo' : 'is-icon'}`} />
                                                    <button
                                                        className="remove-thumbnail"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            removeMedia(item.id);
                                                        }}
                                                    >
                                                        <X size={18} color="white" />
                                                    </button>
                                                </div>
                                            </SwiperSlide>
                                        );
                                    })}
                                </Swiper>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MediaPreview;