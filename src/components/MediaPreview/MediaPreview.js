import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { X, Paperclip, Trash2 } from 'lucide-react';
import './MediaPreview.scss';
import WordPreview from '../WordPreview/WordPreview';

const MediaPreview = ({ mediaFiles, scrollToBottom, setMediaFiles = () => { }, handleClosePreview }) => {
    const fileInputRef = useRef(null);
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
                setCurrentIndex((prev) => Math.max(0, prev - 1));
                return;
            }

            if (e.key === 'ArrowRight') {
                setCurrentIndex((prev) => Math.min(mediaItems.length - 1, prev + 1));
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [handleClose, mediaItems.length]);

    const handleAddMore = () => fileInputRef.current?.click();

    const removeMedia = (id) => {
        // Remove from mediaItems
        setMediaItems((prev) => {
            const filtered = prev.filter((item) => item.id !== id);
            if (filtered.length === 0) {
                setCurrentIndex(0);
                // If this was the last item, close the preview
                handleClose();
            } else {
                setCurrentIndex((prevIndex) => Math.min(prevIndex, filtered.length - 1));
            }
            return filtered;
        });

        // Also remove from mediaFiles if setMediaFiles is provided
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
                                {currentFileMeta.sizeText}{currentFileMeta.extText ? ` · ${currentFileMeta.extText}` : ''}{mediaItems.length ? ` · ${currentIndex + 1} of ${mediaItems.length}` : ''}
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
                        {/* <button className="icon-btn" style={{ visibility: 'hidden' }} onClick={handleAddMore} aria-label="Add more">
                            <Paperclip size={20} />
                        </button> */}
                    </div>
                </div>

                {/* Main Media Display */}
                <div className="media-display-area">
                    <div className="media-container">
                        {currentMedia?.type === 'image' && (
                            <div className="media-stage">
                                <img
                                    src={currentMediaUrl}
                                    alt={currentMedia?.name || 'media'}
                                    className="media-itemscl media-item--image"
                                />
                            </div>
                        )}

                        {currentMedia?.type === 'video' && (
                            <div className="media-stage">
                                <video src={currentMediaUrl} className="media-itemscl media-item--video" controls />
                            </div>
                        )}
                        {currentMedia?.type === 'file' && (
                            <>
                                {((currentMedia?.name || currentMedia?.file?.name || '').toLowerCase()).endsWith('.pdf') ? (
                                    <div className="no-preview-container">
                                        <div className="file-icon">
                                            <img src="./pdf.png" alt="Pdf" style={{ height: "100px", width: "100%" }} />
                                        </div>
                                        <div className="file-name">{currentMedia?.name || currentMedia?.file?.name}</div>
                                        <div className="file-meta">
                                            {currentFileMeta.sizeText} · {currentFileMeta.extText}
                                        </div>
                                        <div className="no-preview-text">No preview available</div>
                                    </div>
                                ) : ((currentMedia?.name || currentMedia?.file?.name || '').toLowerCase()).endsWith('.doc') || ((currentMedia?.name || currentMedia?.file?.name || '').toLowerCase()).endsWith('.docx') ? (
                                    <div className="file-preview-docx">
                                        <WordPreview fileObject={currentMedia.file} />
                                    </div>
                                ) : ((currentMedia?.name || currentMedia?.file?.name || '').toLowerCase()).endsWith('.xls') || ((currentMedia?.name || currentMedia?.file?.name || '').toLowerCase()).endsWith('.xlsx') || ((currentMedia?.name || currentMedia?.file?.name || '').toLowerCase()).endsWith('.csv') ? (
                                    <div className="no-preview-container">
                                        <div className="file-icon">
                                            <img src="./excel.png" alt="Excel" style={{ height: "100px", width: "100%" }} />
                                        </div>
                                        <div className="file-name">{currentMedia?.name || currentMedia?.file?.name}</div>
                                        <div className="file-meta">
                                            {currentFileMeta.sizeText} · {currentFileMeta.extText}
                                        </div>
                                        <div className="no-preview-text">No preview available</div>
                                    </div>
                                ) : ((currentMedia?.name || currentMedia?.file?.name || '').toLowerCase()).endsWith('.txt') ? (
                                    <div className="file-preview-text">
                                        {textPreviewError ? (
                                            <div className="no-preview-text">{textPreviewError}</div>
                                        ) : (
                                            <pre className="text-preview-pre">{textPreview}</pre>
                                        )}
                                    </div>
                                ) : (
                                    <div className="file-placeholder">
                                        <span>Preview not available for {currentMedia?.name || currentMedia?.file?.name}</span>
                                    </div>
                                )}
                            </>
                        )}

                    </div>
                </div>

                {/* Thumbnails */}
                {mediaItems.length > 0 && (
                    <div className="thumbnails-container">
                        {mediaItems.map((item, index) => {
                            const mime = getMime(item.file); // e.g. "application/pdf"
                            const name = (item.name || getAnyName(item.file) || '').toLowerCase();
                            let thumbSrc = "./txt.png";
                            const ext = getExtLower(item.name || getAnyName(item.file));
                            const isPhotoThumb = mime.startsWith('image') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'tif', 'tiff', 'ico'].includes(ext);

                            if (mime.startsWith('image') || isPhotoThumb) {
                                thumbSrc = item.url || item.file.preview;
                            } else if (mime.startsWith('video')) {
                                thumbSrc = "./video.png";
                            } else if (name.endsWith('.pdf')) {
                                thumbSrc = "./pdf.png";
                            } else if (name.endsWith('.doc') || name.endsWith('.docx')) {
                                thumbSrc = "./word.png";
                            } else if (name.endsWith('.xls') || name.endsWith('.xlsx') || name.endsWith('.csv')) {
                                thumbSrc = "./excel.png";
                            } else if (name.endsWith('.txt')) {
                                thumbSrc = "./txt.png";
                            }

                            return (
                                <div
                                    key={item.id}
                                    className={`thumbnail ${index === currentIndex ? "active" : ""}`}
                                    onClick={() => setCurrentIndex(index)}
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
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MediaPreview;