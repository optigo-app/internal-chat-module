import React, { useState } from "react";
import { Box, Skeleton, alpha } from "@mui/material";
import VideoMessage from "./VideoMessage";
import DocumentMessage from "./DocumentMessage";
import UploadProgressOverlay from "./UploadProgressOverlay";

const imageDimsCache = new Map();

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

    if (msg.MessageType === "image") {
        const mediaKey = getMediaKey(msg, 0);
        const src = getMediaSrcForMessage(msg);
        const mediaItems = Array.isArray(msg?.mediaItems) ? msg.mediaItems : [];
        const hasGrid = mediaItems.length > 1;
        const gridRows = mediaItems.length <= 2 ? '1fr' : '1fr 1fr';
        const gridHeight = mediaItems.length <= 2 ? 160 : 250;

        const cachedDims = src ? imageDimsCache.get(src) : null;
        const dimsForCalc = imageDims || cachedDims;
        const mediaWidth = 250;
        const computedHeight = dimsForCalc?.w && dimsForCalc?.h
            ? Math.max('100%', Math.min(250, Math.round(mediaWidth * (dimsForCalc.h / dimsForCalc.w))))
            : '100%';

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
                        transition: 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
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
                            {mediaItems.slice(0, 4).map((item, tileIndex) => {
                                const tileKey = `${mediaKey}-${tileIndex}`;
                                const tileSrc = item?.url;
                                const overflowCount = mediaItems.length - 4;
                                const showOverflow = tileIndex === 3 && overflowCount > 0;

                                return (
                                    <Box
                                        key={tileKey}
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
                                            <img
                                                src={tileSrc}
                                                alt="media"
                                                onLoad={() => markLoaded(tileKey)}
                                                onError={(e) => {
                                                    if (e.target.src !== imageNotFound) e.target.src = imageNotFound;
                                                    markLoaded(tileKey);
                                                }}
                                                style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', opacity: loadedMedia[tileKey] ? 1 : 0 }}
                                            />
                                        )}
                                        {showOverflow && (
                                            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)', color: '#fff', fontWeight: 600, fontSize: 22 }}>
                                                +{overflowCount}
                                            </Box>
                                        )}
                                    </Box>
                                );
                            })}
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
                                        handleMediaClick({ mediaItems: [{ url: src, mimeType: 'image/*', filename: 'image' }] }, 0);
                                    }
                                }}
                                sx={{ cursor: 'pointer', height: '100%', width: '100%' }}
                            >
                                {src && (
                                    <img
                                        src={src}
                                        alt="media"
                                        onLoad={(e) => {
                                            const w = e.currentTarget.naturalWidth || 0;
                                            const h = e.currentTarget.naturalHeight || 0;
                                            if (w > 0 && h > 0) {
                                                const nextDims = { w, h };
                                                setImageDims(nextDims);
                                                imageDimsCache.set(src, nextDims);
                                            }
                                            markLoaded(mediaKey);
                                        }}
                                        onError={(e) => {
                                            if (e.target.src !== imageNotFound) e.target.src = imageNotFound;
                                            markLoaded(mediaKey);
                                        }}
                                        style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', opacity: loadedMedia[mediaKey] ? 1 : 0 }}
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