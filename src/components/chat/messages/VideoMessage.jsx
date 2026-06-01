import React from "react";
import { Skeleton, IconButton } from "@mui/material";
import { Play } from "lucide-react";

const VideoMessage = ({
    msg,
    loadedMedia,
    markLoaded,
    handleMediaClick,
    getMediaKey,
    getMediaSrcForMessage,
    setVideoLoadError,
    UploadProgressOverlay
}) => {

    const mediaItems = Array.isArray(msg?.mediaItems) ? msg.mediaItems : [];
    const mediaKey = getMediaKey(msg, 0);
    const src = getMediaSrcForMessage(msg);

    const hasGrid = mediaItems.length > 1;
    const gridRows = mediaItems.length <= 2 ? "1fr" : "1fr 1fr";
    const gridHeight = mediaItems.length <= 2 ? 160 : 250;

    return (
        <div style={{ position: "relative" }}>
            <div
                className="message-video"
                style={{
                    position: "relative",
                    width: 250,
                    height: hasGrid ? gridHeight : "auto",
                    borderRadius: 12,
                    overflow: "hidden",
                    backgroundColor: "rgba(0,0,0,0.05)"
                }}
            >
                {hasGrid ? (
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gridTemplateRows: gridRows,
                            gap: 2,
                            width: "100%",
                            height: "100%",
                            cursor: "pointer",
                            backgroundColor: "rgba(0,0,0,0.04)"
                        }}
                    >
                        {mediaItems.slice(0, 4).map((item, tileIndex) => {
                            const tileKey = `${mediaKey}-${tileIndex}`;
                            const tileSrc = item?.url;
                            const overflowCount = mediaItems.length - 4;
                            const showOverflow = tileIndex === 3 && overflowCount > 0;

                            return (
                                <div
                                    key={tileKey}
                                    style={{
                                        position: "relative",
                                        width: "100%",
                                        height: "100%",
                                        overflow: "hidden",
                                        borderRadius: 8
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        handleMediaClick(msg, tileIndex);
                                    }}
                                >
                                    {!loadedMedia[tileKey] && (
                                        <Skeleton
                                            variant="rounded"
                                            sx={{
                                                position: "absolute",
                                                inset: 0,
                                                width: "100%",
                                                height: "100%"
                                            }}
                                        />
                                    )}

                                    {tileSrc && (
                                        <video
                                            src={tileSrc}
                                            muted
                                            playsInline
                                            preload="metadata"
                                            onLoadedData={() => markLoaded(tileKey)}
                                            onError={() => markLoaded(tileKey)}
                                            style={{
                                                width: "100%",
                                                height: "100%",
                                                objectFit: "cover",
                                                opacity: loadedMedia[tileKey] ? 1 : 0,
                                                pointerEvents: "none"
                                            }}
                                        />
                                    )}

                                    {tileSrc && !showOverflow && (
                                        <div
                                            style={{
                                                position: "absolute",
                                                inset: 0,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                backgroundColor: "rgba(0,0,0,0.45)"
                                            }}
                                        >
                                            <IconButton
                                                size="small"
                                                sx={{
                                                    backgroundColor: "rgba(255,255,255,0.9)",
                                                    color: "#000"
                                                }}
                                            >
                                                <Play size={16} />
                                            </IconButton>
                                        </div>
                                    )}

                                    {showOverflow && (
                                        <div
                                            style={{
                                                position: "absolute",
                                                inset: 0,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                backgroundColor: "rgba(0,0,0,0.45)",
                                                color: "#fff",
                                                fontWeight: 600,
                                                fontSize: 22
                                            }}
                                        >
                                            +{overflowCount}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleMediaClick(msg, 0);
                        }}
                        style={{ cursor: "pointer", position: "relative" }}
                    >
                        {!loadedMedia[mediaKey] && (
                            <Skeleton
                                variant="rounded"
                                sx={{
                                    position: "absolute",
                                    inset: 0,
                                    width: "100%",
                                    height: "100%"
                                }}
                            />
                        )}

                        {src && (
                            <video
                                src={src}
                                muted
                                playsInline
                                preload="metadata"
                                onLoadedData={() => markLoaded(mediaKey)}
                                onError={() => {
                                    markLoaded(mediaKey);
                                    setVideoLoadError(true);
                                }}
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                    opacity: loadedMedia[mediaKey] ? 1 : 0,
                                    pointerEvents: "none"
                                }}
                            />
                        )}

                        <div
                            style={{
                                position: "absolute",
                                inset: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                backgroundColor: "rgba(0,0,0,0.45)"
                            }}
                        >
                            <IconButton
                                size="small"
                                sx={{
                                    backgroundColor: "rgba(255,255,255,0.9)",
                                    color: "#000"
                                }}
                            >
                                <Play size={20} />
                            </IconButton>
                        </div>
                    </div>
                )}

                {msg.isUploading && (
                    <UploadProgressOverlay percent={msg.percent} />
                )}
            </div>
        </div>
    );
};

export default React.memo(VideoMessage);