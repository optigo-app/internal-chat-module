import React from "react";
import { Box, Typography, IconButton } from "@mui/material";
import { Download } from "lucide-react";
import { alpha } from "@mui/material/styles";

import {
    FileText,
    FileType,
    FileSpreadsheet,
    FileArchive,
    FileCode,
    File,
    Smartphone
} from "lucide-react";

const DocumentMessage = ({
    msg,
    theme,
    getMediaSrcForMessage,
    getDocumentMeta,
    handleDownloadFile,
    UploadProgressOverlay
}) => {

    const mediaItems = Array.isArray(msg?.mediaItems) ? msg.mediaItems : [];

    const IconMap = {
        FileText,
        FileType,
        FileSpreadsheet,
        FileArchive,
        FileCode,
        File,
        Smartphone
    };

    const renderDocumentItem = (itemProps, index) => {
        const { url: href, filename, fileName } = itemProps;
        const name = filename || fileName || "Document";
        const meta = getDocumentMeta(name);

        const DocIcon = IconMap[meta.iconName] || File;

        return (
            <Box
                key={index}
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleDownloadFile(href, name);
                }}
                sx={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    width: 350,
                    padding: "12px 16px",
                    borderRadius: "12px",
                    backgroundColor:
                        msg.Direction == 1
                            ? alpha(theme.palette.background.default, 0.2)
                            : theme.palette.background.default,
                    backdropFilter: "blur(1px)",
                    cursor: "pointer",
                    color: theme.palette.text.primary,
                    transition: "all 0.2s"
                }}
            >
                {/* ICON */}
                <Box
                    sx={{
                        width: 30,
                        height: 30,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flex: "0 0 auto"
                    }}
                >
                    {meta.iconUrl ? (
                        <img
                            src={meta.iconUrl}
                            alt={meta.label}
                            style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "contain"
                            }}
                        />
                    ) : (
                        <DocIcon size={24} />
                    )}
                </Box>

                {/* FILE INFO */}
                <Box
                    sx={{
                        minWidth: 0,
                        flex: "1 1 auto",
                        display: "flex",
                        flexDirection: "column",
                        gap: 0.2
                    }}
                >
                    <Typography
                        variant="body2"
                        sx={{
                            fontWeight: 500,
                            lineHeight: 1.2,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis"
                        }}
                        title={name}
                    >
                        {name}
                    </Typography>

                    <Typography
                        variant="caption"
                        sx={{
                            color: alpha(theme.palette.text.primary, 0.8),
                            fontWeight: 500,
                            letterSpacing: "0.02em",
                            display: "flex",
                            alignItems: "center",
                            gap: 0.8
                        }}
                    >
                        <span style={{ fontSize: "0.6rem" }}>{meta.label}</span>
                        {itemProps.size && <span>• {itemProps.size}</span>}
                    </Typography>
                </Box>

                {/* DOWNLOAD BUTTON */}
                <IconButton
                    size="small"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadFile(href, name);
                    }}
                    sx={{
                        color: "text.secondary",
                        "&:hover": {
                            bgcolor: "action.hover",
                            color: "text.primary"
                        }
                    }}
                    title="Download"
                >
                    <Download size={18} />
                </IconButton>
            </Box>
        );
    };

    // SINGLE DOCUMENT
    if (mediaItems.length === 0) {
        return (
            <div
                className="message-document"
                style={{ position: "relative", maxWidth: 350, width: "100%" }}
            >
                {renderDocumentItem(
                    {
                        url: getMediaSrcForMessage(msg),
                        fileName: msg.fileName,
                        fileType: msg.fileType
                    },
                    0
                )}

                {msg.isUploading && (
                    <UploadProgressOverlay percent={msg.percent} size={40} />
                )}
            </div>
        );
    }

    // MULTIPLE DOCUMENTS
    return (
        <div
            className="message-document-group"
            style={{
                position: "relative",
                maxWidth: 350,
                width: "100%",
                display: "flex",
                flexDirection: "column",
                gap: 4
            }}
        >
            {mediaItems.map((item, index) => renderDocumentItem(item, index))}

            {msg.isUploading && (
                <UploadProgressOverlay percent={msg.percent} size={40} />
            )}
        </div>
    );
};

export default React.memo(DocumentMessage);