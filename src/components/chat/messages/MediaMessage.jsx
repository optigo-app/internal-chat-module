import React, { useState, useEffect, useRef, useMemo } from "react";
import { Box, Skeleton, alpha } from "@mui/material";
import VideoMessage from "./VideoMessage";
import DocumentMessage from "./DocumentMessage";
import UploadProgressOverlay from "./UploadProgressOverlay";

const imageDimsCache = new Map();

// Cross-fade image component: keeps old image visible while new one loads,
// then fades the new one in smoothly over the old one.
const CrossFadeImage = ({ src, alt, onLoad, onError, style, loaded, markLoaded, keyId, imageNotFound }) => {
    const [currentSrc, setCurrentSrc] = useState(src);
    const [prevSrc, setPrevSrc] = useState(null);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [newLoaded, setNewLoaded] = useState(false);
    const srcRef = useRef(src);

    useEffect(() => {
        if (src === srcRef.current) return;
        const oldSrc = srcRef.current;
        srcRef.current = src;

        if (!src) {
            setCurrentSrc('');
            setPrevSrc(null);
            setIsTransitioning(false);
            setNewLoaded(false);
            return;
        }

        // If transitioning from blob to server URL, keep blob visible while new loads
        if (oldSrc?.startsWith('blob:') && !src.startsWith('blob:')) {
            setPrevSrc(oldSrc);
            setCurrentSrc(src);
            setIsTransitioning(true);
            setNewLoaded(false);
            const img = new Image();
            img.onload = () => {
                setNewLoaded(true);
                setIsTransitioning(false);
                if (markLoaded) markLoaded(keyId);
            };
            img.onerror = () => {
                setNewLoaded(true);
                setIsTransitioning(false);
                if (markLoaded) markLoaded(keyId);
            };
            img.src = src;
        } else {
            setCurrentSrc(src);
            setPrevSrc(null);
            setIsTransitioning(false);
            setNewLoaded(loaded);
        }
    }, [src]);

    const handleLoad = (e) => {
        setNewLoaded(true);
        setIsTransitioning(false);
        if (markLoaded) markLoaded(keyId);
        if (onLoad) onLoad(e);
    };

    const handleError = (e) => {
        if (e.target.src !== imageNotFound) e.target.src = imageNotFound;
        setNewLoaded(true);
        setIsTransitioning(false);
        if (markLoaded) markLoaded(keyId);
        if (onError) onError(e);
    };

    const isLoaded = isTransitioning ? newLoaded : loaded;

    return (
        <Box sx={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
            {prevSrc && (
                <img
                    src={prevSrc}
                    alt=""
                    aria-hidden="true"
                    style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        opacity: isLoaded ? 0 : 1,
                        transition: 'opacity 0.35s ease',
                        pointerEvents: 'none',
                    }}
                />
            )}
            {currentSrc && (
                <img
                    src={currentSrc}
                    alt={alt}
                    onLoad={handleLoad}
                    onError={handleError}
                    style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        opacity: isLoaded ? 1 : 0,
                        transition: 'opacity 0.35s ease',
                        ...style,
                    }}
                />
            )}
        </Box>
    );
};

const GridTileImage = ({ item, tileIndex, mediaKey, mediaItems, msg, loadedMedia, markLoaded, imageNotFound, handleMediaClick }) => {
    const tileKey = `${mediaKey}-${tileIndex}`;
    const tileSrc = item?.url;
    const overflowCount = mediaItems.length - 4;
    const showOverflow = tileIndex === 3 && overflowCount > 0;

    return (
        <Box
            sx={{
                position: 'relative',
                width: '100%',
                height: '100%',
                overflow: 'hidden',
                borderRadius: "8px",
            }}
            onClick={(e) => {
                e.stopPropagation();
                handleMediaClick(msg, tileIndex);
            }}
        >
            {!loadedMedia[tileKey] && (
                <Skeleton
                    variant="rounded"
                    sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', borderRadius: 0 }}
                />
            )}
            {tileSrc && (
                <CrossFadeImage
                    src={tileSrc}
                    alt="media"
                    loaded={loadedMedia[tileKey]}
                    markLoaded={markLoaded}
                    keyId={tileKey}
                    imageNotFound={imageNotFound}
                />
            )}
            {showOverflow && (
                <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)', color: '#fff', fontWeight: 600, fontSize: 22 }}>
                    +{overflowCount}
                </Box>
            )}
        </Box>
    );
};

const MediaMessage = ({
    msg,
    handleMediaClick,
    getMediaKey,
    getMediaSrcForMessage,
    loadedMedia,
    markLoaded,
    imageNotFound,
    theme,
    videoLoadError,
    setVideoLoadError,
    getDocumentMeta,
    handleDownloadFile
}) => {
    const [imageDims, setImageDims] = useState(null);
    const mediaKey = getMediaKey(msg, 0);
    const rawSrc = getMediaSrcForMessage(msg);

    const parseDim = (val) => {
        const n = Number(val);
        return Number.isFinite(n) && n > 0 ? n : null;
    };

    const initialDims = useMemo(() => {
        const w = parseDim(msg?.mediaWidth);
        const h = parseDim(msg?.mediaHeight);
        if (w && h) return { w, h };

        const first = Array.isArray(msg?.mediaItems) ? msg.mediaItems[0] : null;
        const fw = parseDim(first?.width);
        const fh = parseDim(first?.height);
        if (fw && fh) return { w: fw, h: fh };

        return null;
    }, [msg?.mediaWidth, msg?.mediaHeight, msg?.mediaItems]);

    if (msg.MessageType === "image") {
        const mediaItems = Array.isArray(msg?.mediaItems) ? msg.mediaItems : [];
        const hasGrid = mediaItems.length > 1;
        const gridRows = mediaItems.length <= 2 ? '1fr' : '1fr 1fr';
        const gridHeight = mediaItems.length <= 2 ? 160 : 250;

        const cachedDims = rawSrc ? imageDimsCache.get(rawSrc) : null;
        const dimsForCalc = initialDims || imageDims || cachedDims;
        const mediaWidth = 250;
        const computedHeight = dimsForCalc?.w && dimsForCalc?.h
            ? Math.max(100, Math.min(250, Math.round(mediaWidth * (dimsForCalc.h / dimsForCalc.w))))
            : 200;

        return (
            <Box sx={{ position: 'relative' }}>
                <Box
                    className="message-image"
                    sx={{
                        position: 'relative',
                        width: mediaWidth,
                        height: hasGrid ? gridHeight : computedHeight,
                        borderRadius: "12px",
                        overflow: 'hidden',
                        backgroundColor: alpha(theme.palette.text.primary, 0.05)
                    }}
                >
                    {hasGrid ? (
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gridTemplateRows: gridRows,
                                gap: "2px",
                                width: '100%',
                                height: '100%',
                                cursor: 'pointer',
                                backgroundColor: 'rgba(0,0,0,0.04)',
                            }}
                        >
                            {mediaItems.slice(0, 4).map((item, tileIndex) => (
                                <GridTileImage
                                    key={`${mediaKey}-${tileIndex}`}
                                    item={item}
                                    tileIndex={tileIndex}
                                    mediaKey={mediaKey}
                                    mediaItems={mediaItems}
                                    msg={msg}
                                    loadedMedia={loadedMedia}
                                    markLoaded={markLoaded}
                                    imageNotFound={imageNotFound}
                                    handleMediaClick={handleMediaClick}
                                />
                            ))}
                        </Box>
                    ) : (
                        <>
                            {!loadedMedia[mediaKey] && (
                                <Skeleton variant="rounded" sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', borderRadius: 0 }} />
                            )}
                            <Box
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (msg?.mediaItems?.length) {
                                        handleMediaClick(msg, 0);
                                    } else {
                                        handleMediaClick({ mediaItems: [{ url: rawSrc, mimeType: 'image/*', filename: 'image' }] }, 0);
                                    }
                                }}
                                sx={{ cursor: 'pointer', height: '100%', width: '100%' }}
                            >
                                {rawSrc && (
                                    <CrossFadeImage
                                        src={rawSrc}
                                        alt="media"
                                        loaded={loadedMedia[mediaKey]}
                                        markLoaded={markLoaded}
                                        keyId={mediaKey}
                                        imageNotFound={imageNotFound}
                                        onLoad={(e) => {
                                            const w = e.currentTarget.naturalWidth || 0;
                                            const h = e.currentTarget.naturalHeight || 0;
                                            if (w > 0 && h > 0) {
                                                const nextDims = { w, h };
                                                setImageDims(nextDims);
                                                imageDimsCache.set(rawSrc, nextDims);
                                            }
                                        }}
                                    />
                                )}
                            </Box>
                        </>
                    )}
                    {msg.isUploading && <UploadProgressOverlay percent={msg.percent} />}
                </Box>
            </Box>
        );
    }

    if (msg.MessageType === "video") {
        return (
            <VideoMessage
                msg={msg}
                loadedMedia={loadedMedia}
                markLoaded={markLoaded}
                handleMediaClick={handleMediaClick}
                getMediaKey={getMediaKey}
                getMediaSrcForMessage={getMediaSrcForMessage}
                imageNotFound={imageNotFound}
                videoLoadError={videoLoadError}
                setVideoLoadError={setVideoLoadError}
                UploadProgressOverlay={UploadProgressOverlay}
            />
        );
    }

    if (msg.MessageType === "document") {
        return (
            <DocumentMessage
                msg={msg}
                theme={theme}
                getMediaSrcForMessage={getMediaSrcForMessage}
                getDocumentMeta={getDocumentMeta}
                handleDownloadFile={handleDownloadFile}
                UploadProgressOverlay={UploadProgressOverlay}
            />
        );
    }

    return null;
};


export default MediaMessage;