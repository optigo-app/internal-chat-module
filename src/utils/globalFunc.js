import React from 'react';
import axios from 'axios';
import { SHA1 } from "crypto-js";
import Hex from "crypto-js/enc-hex";
import imageCompression from 'browser-image-compression';
import JSZip from 'jszip';
import { toast } from 'react-hot-toast';
import { renderEmojiText } from './EmojiRenderer';
import { getHeaders } from '../API/InitialApi/Config';
import { downloadFileApi } from '../API/FileUpload/fileDownloadApi';

// Global cache for images that return 404/error to prevent flickering from stale API data
const deadImageCache = new Set();

export const markImageAsDead = (url) => {
    if (!url || typeof url !== 'string') return;
    deadImageCache.add(url);
};

export const isImageDead = (url) => {
    if (!url || typeof url !== 'string') return false;
    return deadImageCache.has(url);
};

const hashString = (value) => {
    const str = String(value ?? '');
    let hash = 0;
    for (let i = 0; i < str.length; i += 1) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
};

const getInitials = (name) => {
    const cleaned = String(name ?? '').trim();
    if (!cleaned) return '?';

    const numeric = cleaned.replace(/\D/g, '');
    if (numeric && numeric.length >= 2) return numeric.slice(-2);

    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
};

const formatWhatsAppText = (text) => {
    if (!text || typeof text !== 'string') return text;
    // Support both Markdown and WhatsApp-style formatting
    // Order matters: longer markers first (** before *, __ before _, ~~ before ~)
    const regex = /(```[\s\S]*?```|\*\*\S(?:.*?\S)?\*\*|\*\S(?:.*?\S)?\*|__\S(?:.*?\S)?__|_\S(?:.*?\S)?_|~~\S(?:.*?\S)?~~|~\S(?:.*?\S)?~)/g;
    const parts = text.split(regex);

    return parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
            return <code key={index} style={{ fontFamily: 'monospace', backgroundColor: 'rgba(0,0,0,0.05)', padding: '2px 4px', borderRadius: '4px' }}>{renderEmojiText(part.slice(3, -3))}</code>;
        } else if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={index}>{renderEmojiText(part.slice(2, -2))}</strong>;
        } else if (part.startsWith('*') && part.endsWith('*')) {
            return <em key={index}>{renderEmojiText(part.slice(1, -1))}</em>;
        } else if (part.startsWith('__') && part.endsWith('__')) {
            return <strong key={index}>{renderEmojiText(part.slice(2, -2))}</strong>;
        } else if (part.startsWith('_') && part.endsWith('_')) {
            return <em key={index}>{renderEmojiText(part.slice(1, -1))}</em>;
        } else if (part.startsWith('~~') && part.endsWith('~~')) {
            return <s key={index}>{renderEmojiText(part.slice(2, -2))}</s>;
        } else if (part.startsWith('~') && part.endsWith('~')) {
            return <s key={index}>{renderEmojiText(part.slice(1, -1))}</s>;
        }
        return renderEmojiText(part);
    });
};

export const normalizeMessageText = (text) => {
    if (!text || typeof text !== 'string') return text || '';
    return text
        .replace(/\\r\\n/g, '\n')
        .replace(/\\n/g, '\n')
        .replace(/\\([\\\\*_[\]()~`>#+\-=|.!\n])/g, '$1');
};

export const renderTextWithLinks = (rawText, options = {}) => {
    const { linkStyle = {} } = options;

    const text = rawText == null ? '' : String(rawText);
    if (!text) return '';

    const urlRegex = /(?:https?:\/\/|www\.)[^\s]+/gi;
    const lines = text.split('\n');

    return lines.map((line, lineIndex) => {
        const nodes = [];
        let lastIndex = 0;
        let matchIndex = 0;

        for (const match of line.matchAll(urlRegex)) {
            const matchedUrl = match[0];
            const start = match.index ?? 0;
            const end = start + matchedUrl.length;

            if (start > lastIndex) {
                const textPart = line.slice(lastIndex, start);
                nodes.push(
                    <React.Fragment key={`t-${lineIndex}-${matchIndex}`}>
                        {formatWhatsAppText(textPart)}
                    </React.Fragment>
                );
            }

            const trimmed = matchedUrl.match(/^(.*?)([\]\[\)\}>,.!?:;]+)?$/);
            const urlPart = trimmed?.[1] ?? matchedUrl;
            const trailing = trimmed?.[2] ?? '';
            const href = urlPart.toLowerCase().startsWith('http') ? urlPart : `https://${urlPart}`;

            nodes.push(
                <React.Fragment key={`u-${lineIndex}-${matchIndex}`}>
                    <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            textDecoration: 'underline',
                            wordBreak: 'break-word',
                            ...linkStyle,
                        }}
                    >
                        {urlPart}
                    </a>
                    {trailing}
                </React.Fragment>
            );

            lastIndex = end;
            matchIndex += 1;
        }

        if (lastIndex < line.length) {
            const textPart = line.slice(lastIndex);
            nodes.push(
                <React.Fragment key={`e-${lineIndex}`}>
                    {formatWhatsAppText(textPart)}
                </React.Fragment>
            );
        }

        return (
            <React.Fragment key={`line-${lineIndex}`}>
                {nodes}
                {lineIndex < lines.length - 1 ? <br /> : null}
            </React.Fragment>
        );
    });
};

export const generateMediaFolderName = (conversationId, category = 'docs') => {
    const sanitizeSegment = (value) => {
        const raw = String(value ?? '').trim();
        if (!raw) return '';
        return raw
            .replace(/\\/g, '/')
            .split('/')
            .filter(Boolean)
            .join('_')
            .replace(/[^a-zA-Z0-9_-]/g, '_');
    };

    const conv = sanitizeSegment(conversationId || 'unknown');
    const cat = sanitizeSegment(category || 'docs') || 'docs';
    return `tecochat/conv_${conv}/${cat}`;
};

export const getSoftAvatarColors = (seed) => {
    const h = hashString(seed) % 360;
    const s = 45 + (hashString(`${seed}-s`) % 11);
    const l = 86 + (hashString(`${seed}-l`) % 8);

    const fgS = Math.min(72, s + 18);
    const fgL = 26 + (hashString(`${seed}-fg`) % 10);

    return {
        bg: `hsl(${h}, ${s}%, ${l}%)`,
        fg: `hsl(${h}, ${fgS}%, ${fgL}%)`,
    };
};

export const hasCustomerName = (customer) => {
    const name = (
        customer?.MemberName ??
        customer?.ConversationName ??
        customer?.name ??
        customer?.UserName ??
        customer?.CustomerName ??
        customer?.Name ??
        customer?.SenderInfo ??
        (customer?.FirstName || customer?.LastName ? `${customer?.FirstName || ''} ${customer?.LastName || ''}`.trim() : null)
    ) ?? '';
    return Boolean(String(name ?? '').trim());
};

export const getCustomerDisplayName = (customer) => {
    const name = String(
        customer?.MemberName ??
        customer?.ConversationName ??
        customer?.name ??
        customer?.UserName ??
        customer?.CustomerName ??
        customer?.Name ??
        customer?.SenderInfo ??
        (customer?.FirstName || customer?.LastName ? `${customer?.FirstName || ''} ${customer?.LastName || ''}`.trim() : '')
    ).trim();
    if (name) return name;

    const email = String(customer?.UserEmail ?? customer?.SenderEmail ?? '').trim();
    if (email) return email;

    return 'Unknown';
};

export const getCustomerAvatarSeed = (customer) => {
    const name = String(
        customer?.MemberName ??
        customer?.ConversationName ??
        customer?.name ??
        customer?.UserName ??
        customer?.CustomerName ??
        customer?.Name ??
        customer?.SenderInfo ??
        (customer?.FirstName || customer?.LastName ? `${customer?.FirstName || ''} ${customer?.LastName || ''}`.trim() : '')
    ).trim();
    if (name) return name;

    const email = String(customer?.UserEmail ?? customer?.SenderEmail ?? '').trim();
    if (email) return email;

    return 'Unknown';
};

export const getWhatsAppAvatarConfig = (name, size = 40) => {
    const cleaned = String(name ?? '').trim();
    const { bg, fg } = getSoftAvatarColors(cleaned || 'unknown');

    return {
        sx: {
            bgcolor: bg,
            color: fg,
            width: size,
            height: size,
            fontSize: Math.max(14, Math.round(size * 0.4)),
            fontWeight: 600,
        },
        children: getInitials(cleaned),
    };
};

// convert password to sha1 (HTTP + HTTPS safe)
export function passwordToSha1(password) {
    if (password === null || password === undefined) return "";

    return SHA1(password.toString()).toString(Hex);
}


export const handleDownloadFile = async (fileUrlOrMessage, filename = null, options = {}) => {
    if (typeof fileUrlOrMessage === 'object' && fileUrlOrMessage !== null && !options?.isRecursive) {
        const msg = fileUrlOrMessage;
        const mediaItems = Array.isArray(msg?.mediaItems) ? msg.mediaItems : [];
        if (mediaItems.length === 1 || (!mediaItems.length && (msg.FileUrl || msg.src || msg.FileUrlOrMessage))) {
            const url = mediaItems[0]?.url || msg.FileUrl || msg.src || msg.FileUrlOrMessage;
            const name = mediaItems[0]?.filename || msg.FileName || msg.name || filename;
            return handleDownloadFile(url, name, { ...options, isRecursive: true });
        }
        if (mediaItems.length > 1) {
            try {
                const zip = new JSZip();
                const timestamp = new Date().getTime();
                const zipFileName = `attachments_${timestamp}.zip`;

                const fetchPromises = mediaItems.map(async (item, idx) => {
                    try {
                        const url = item.url;
                        if (!url) return;

                        const name =
                            item.filename ||
                            `file_${idx + 1}${getFileExt(url) ? "." + getFileExt(url) : ""}`;
                        try {
                            const response = await fetch(url, {
                                responseType: 'blob',
                                headers: {
                                    ...(url.startsWith('http') ? {} : getHeaders())
                                }
                            });

                            const blob = response.data;
                            zip.file(name, blob);
                        } catch (err) {
                            console.warn("CORS or Download blocked for:", url, err);
                        }
                    } catch (err) {
                        console.error(`Failed to add item ${idx} to ZIP:`, err);
                    }
                });

                await Promise.all(fetchPromises);
                const content = await zip.generateAsync({ type: "blob" });
                const zipUrl = window.URL.createObjectURL(content);
                const link = document.createElement("a");
                link.href = zipUrl;
                link.download = zipFileName;
                link.style.display = "none";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(zipUrl);
                return { success: true, filename: zipFileName };
            } catch (error) {
                console.error("Bulk download ZIP creation failed:", error);
                return { success: false, error: error.message };
            }
        }
    }
    const fileUrl =
        typeof fileUrlOrMessage === "string"
            ? fileUrlOrMessage
            : fileUrlOrMessage?.FileUrl || fileUrlOrMessage?.src;

    if (!fileUrl) return { success: false, error: "No URL provided" };

    let resolvedFileUrl = fileUrl;

    // Generate filename with timestamp
    const timestamp = new Date().getTime();
    if (!filename) {
        const extensionMatch = fileUrl.match(/\.([a-zA-Z0-9]+)(?:$|[?#])/);
        const extension = extensionMatch?.[1] || 'jpg';
        filename = `generated-${timestamp}.${extension}`;
    } else {
        // Append timestamp to existing filename
        const lastDotIndex = filename.lastIndexOf('.');
        if (lastDotIndex > 0) {
            const nameWithoutExt = filename.substring(0, lastDotIndex);
            const extension = filename.substring(lastDotIndex);
            filename = `${nameWithoutExt}_${timestamp}${extension}`;
        } else {
            filename = `${filename}_${timestamp}`;
        }
    }

    // Try download API first (can return a resolved file URL or direct payload)
    try {
        const apiResponse = await downloadFileApi({ fileUrl, fileName: filename });
        const apiData = apiResponse?.data;

        const apiResolvedUrl =
            apiData?.Data?.rd?.[0]?.FileUrl ||
            apiData?.Data?.rd?.[0]?.fileUrl ||
            apiData?.Data?.rd?.[0]?.Url ||
            apiData?.Data?.rd?.[0]?.url ||
            apiData?.FileUrl ||
            apiData?.fileUrl ||
            apiData?.Url ||
            apiData?.url;

        if (apiResolvedUrl) {
            resolvedFileUrl = apiResolvedUrl;
        }
    } catch (apiError) {
        console.warn('downloadFileApi failed, falling back to direct URL download:', apiError);
    }

    // Try fetch blob first
    try {
        const response = await fetch(resolvedFileUrl);
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = objectUrl;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(objectUrl);
        return { success: true, filename };
    } catch {
        // Fallback to direct anchor download
        try {
            const anchor = document.createElement('a');
            anchor.href = resolvedFileUrl;
            anchor.download = filename;
            anchor.target = '_blank';
            anchor.rel = 'noopener noreferrer';
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            return { success: true, filename, fallback: true };
        } catch (fallbackError) {
            console.error("Fallback download failed:", fallbackError);
            return { success: false, error: fallbackError.message };
        }
    }
};

// for public ip address
export const getClientIpAddress = async () => {
    try {
        const cachedIp = sessionStorage.getItem("clientIpAddress");
        if (cachedIp) return cachedIp;

        const res = await fetch("https://api.ipify.org?format=json");
        const data = await res.json();
        const ip = data?.ip || "";

        sessionStorage.setItem("clientIpAddress", ip);
        return ip;
    } catch (error) {
        console.error("Error fetching IP address:", error);
        return "";
    }
};

export const getFileExt = (name = '') => {
    if (!name) return '';
    const cleaned = String(name).trim().toLowerCase();
    const idx = cleaned.lastIndexOf('.');
    return idx >= 0 ? cleaned.slice(idx + 1) : '';
};

const FILE_TYPES = {
    pdf: {
        label: 'PDF',
        tone: 'pdf',
        iconName: 'FileText',
        iconUrl: '/icons/pdf.png'
    },
    doc: {
        label: 'DOCS',
        tone: 'doc',
        iconName: 'FileType',
        iconUrl: '/icons/doc.png'
    },
    docx: {
        label: 'DOCS',
        tone: 'doc',
        iconName: 'FileType',
        iconUrl: '/icons/doc.png'
    },
    dcs: {
        label: 'DOCS',
        tone: 'doc',
        iconName: 'FileType',
        iconUrl: '/icons/doc.png'
    },
    rtf: {
        label: 'DOCS',
        tone: 'doc',
        iconName: 'FileType',
        iconUrl: '/icons/doc.png'
    },
    xls: {
        label: 'EXCEL',
        tone: 'sheet',
        iconName: 'FileSpreadsheet',
        iconUrl: '/icons/xls.png'
    },
    xlsx: {
        label: 'EXCEL',
        tone: 'sheet',
        iconName: 'FileSpreadsheet',
        iconUrl: '/icons/xls.png'
    },
    csv: {
        label: 'EXCEL',
        tone: 'sheet',
        iconName: 'FileSpreadsheet',
        iconUrl: '/icons/xls.png'
    },
    ppt: {
        label: 'PPT',
        tone: 'ppt',
        iconName: 'FileType',
        iconUrl: '/icons/ppt.png'
    },
    pptx: {
        label: 'PPT',
        tone: 'ppt',
        iconName: 'FileType',
        iconUrl: '/icons/ppt.png'
    },
    zip: {
        label: 'ZIP',
        tone: 'archive',
        iconName: 'FileArchive',
        iconUrl: '/icons/zip.png'
    },
    rar: {
        label: 'RAR',
        tone: 'archive',
        iconName: 'FileArchive',
        iconUrl: '/icons/rar.png'
    },
    '7z': {
        label: '7Z',
        tone: 'archive',
        iconName: 'FileArchive',
        iconUrl: '/icons/7z.png'
    },
    psd: {
        label: 'PSD',
        tone: 'psd',
        iconName: 'FileType',
        iconUrl: '/icons/psd-file.png'
    },
    apk: {
        label: 'APK',
        tone: 'apk',
        iconName: 'Smartphone',
        iconUrl: '/icons/apk.png'
    },
    txt: {
        label: 'TEXT',
        tone: 'default',
        iconName: 'FileText',
        iconUrl: '/icons/txt.png'
    },
    log: {
        label: 'TEXT',
        tone: 'default',
        iconName: 'FileText',
        iconUrl: '/icons/txt.png'
    },
    md: {
        label: 'TEXT',
        tone: 'default',
        iconName: 'FileText',
        iconUrl: '/icons/txt.png'
    },
    json: {
        label: 'CODE',
        tone: 'code',
        iconName: 'FileCode',
        iconUrl: '/icons/json-file.png'
    },
    xml: {
        label: 'CODE',
        tone: 'code',
        iconName: 'FileCode',
        iconUrl: '/icons/xml.png'
    },
    html: {
        label: 'HTML',
        tone: 'code',
        iconName: 'FileCode',
        iconUrl: '/icons/html.png'
    },
    htm: {
        label: 'HTML',
        tone: 'code',
        iconName: 'FileCode',
        iconUrl: '/icons/html.png'
    },
    js: {
        label: 'CODE',
        tone: 'code',
        iconName: 'FileCode',
        iconUrl: '/icons/java-script.png'
    },
    ts: {
        label: 'CODE',
        tone: 'code',
        iconName: 'FileCode',
        iconUrl: '/icons/java-script.png'
    },
    jsx: {
        label: 'CODE',
        tone: 'code',
        iconName: 'FileCode',
        iconUrl: '/icons/java-script.png'
    },
    tsx: {
        label: 'CODE',
        tone: 'code',
        iconName: 'FileCode',
        iconUrl: '/icons/java-script.png'
    },
    css: {
        label: 'CODE',
        tone: 'code',
        iconName: 'FileCode',
        iconUrl: '/icons/css-3.png'
    },
    py: {
        label: 'PYTHON',
        tone: 'code',
        iconName: 'FileCode',
        iconUrl: '/icons/python.png'
    },
    sql: {
        label: 'DATABASE',
        tone: 'code',
        iconName: 'FileCode',
        iconUrl: '/icons/database.png'
    },
    svg: {
        label: 'SVG',
        tone: 'image',
        iconName: 'FileImage',
        iconUrl: '/icons/svg.png'
    },
    eps: {
        label: 'SVG',
        tone: 'image',
        iconName: 'FileImage',
        iconUrl: '/icons/svg.png'
    },
    mp3: {
        label: 'AUDIO',
        tone: 'audio',
        iconName: 'FileAudio',
        iconUrl: '/icons/audio.png'
    },
    wav: {
        label: 'AUDIO',
        tone: 'audio',
        iconName: 'FileAudio',
        iconUrl: '/icons/audio.png'
    },
    ogg: {
        label: 'AUDIO',
        tone: 'audio',
        iconName: 'FileAudio',
        iconUrl: '/icons/audio.png'
    },
    m4a: {
        label: 'AUDIO',
        tone: 'audio',
        iconName: 'FileAudio',
        iconUrl: '/icons/audio.png'
    },
    flac: {
        label: 'AUDIO',
        tone: 'audio',
        iconName: 'FileAudio',
        iconUrl: '/icons/audio.png'
    },
    aac: {
        label: 'AUDIO',
        tone: 'audio',
        iconName: 'FileAudio',
        iconUrl: '/icons/audio.png'
    },
    wma: {
        label: 'AUDIO',
        tone: 'audio',
        iconName: 'FileAudio',
        iconUrl: '/icons/audio.png'
    },
    mp4: {
        label: 'VIDEO',
        tone: 'video',
        iconName: 'FileVideo',
        iconUrl: '/icons/video.png'
    },
    mov: {
        label: 'VIDEO',
        tone: 'video',
        iconName: 'FileVideo',
        iconUrl: '/icons/video.png'
    },
    avi: {
        label: 'VIDEO',
        tone: 'video',
        iconName: 'FileVideo',
        iconUrl: '/icons/video.png'
    },
    mkv: {
        label: 'VIDEO',
        tone: 'video',
        iconName: 'FileVideo',
        iconUrl: '/icons/video.png'
    },
    flv: {
        label: 'VIDEO',
        tone: 'video',
        iconName: 'FileVideo',
        iconUrl: '/icons/video.png'
    },
    wmv: {
        label: 'VIDEO',
        tone: 'video',
        iconName: 'FileVideo',
        iconUrl: '/icons/video.png'
    },
    m4v: {
        label: 'VIDEO',
        tone: 'video',
        iconName: 'FileVideo',
        iconUrl: '/icons/video.png'
    },
    webm: {
        label: 'VIDEO',
        tone: 'video',
        iconName: 'FileVideo',
        iconUrl: '/icons/video.png'
    }
};

export const getDocumentMeta = (name = '') => {
    const ext = getFileExt(name)?.toLowerCase();
    return (
        FILE_TYPES[ext] || {
            label: ext?.toUpperCase() || 'FILE',
            tone: 'default',
            iconName: 'File',
            iconUrl: '/icons/doc.png'
        }
    );
};

export const validateMediaFiles = (files) => {
    const MAX_FILES = 30;
    const MAX_SIZE_MB = 100;
    const MAX_TOTAL_SIZE_MB = 100;
    const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
    const MAX_TOTAL_BYTES = MAX_TOTAL_SIZE_MB * 1024 * 1024;

    const rawFiles = Array.from(files);
    const acceptedFiles = [];
    const skippedSize = [];
    const skippedTotal = [];
    let skippedCount = 0;
    let currentTotal = 0;

    for (const file of rawFiles) {
        if (acceptedFiles.length >= MAX_FILES) {
            skippedCount++;
            continue;
        }

        if (file.size > MAX_SIZE_BYTES) {
            skippedSize.push(file.name);
            continue;
        }

        if (currentTotal + file.size > MAX_TOTAL_BYTES) {
            skippedTotal.push(file.name);
            continue;
        }

        acceptedFiles.push(file);
        currentTotal += file.size;
    }

    return {
        acceptedFiles,
        skippedSize,
        skippedTotal,
        skippedCount,
        totalFiles: rawFiles.length,
        isLimitReached: rawFiles.length > MAX_FILES,
        totalSize: currentTotal
    };
};

export async function compressImagesToWebP(files, customOptions = {}) {
    const inputFiles = Array.isArray(files) ? files : [files];

    const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: "image/webp",
        initialQuality: 0.8,
        ...customOptions,
    };

    const results = [];

    for (const file of inputFiles) {
        if (!file?.type?.startsWith("image/")) continue;

        const compressedFile = await imageCompression(file, options);

        results.push({
            id: `${file.name}-${Date.now()}`,
            originalName: file.name,
            originalSize: file.size,
            compressedName:
                file.name.replace(/\.[^/.]+$/, "") + ".webp",
            compressedSize: compressedFile.size,
            blob: compressedFile,
            previewUrl: URL.createObjectURL(compressedFile),
        });
    }

    return results;
}


export const getTimeLabel = (input) => {
    if (!input) return "";
    const date = new Date(input);
    if (isNaN(date.getTime())) return "";

    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (isYesterday) {
        return "Yesterday";
    } else {
        return date.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' });
    }
};


export function formatISOTimeUTC(isoString) {
    const date = new Date(isoString);
    let hours = date.getUTCHours();
    let minutes = date.getUTCMinutes();
    let period = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours === 0 ? 12 : hours;
    return `${hours}:${minutes.toString().padStart(2, '0')} ${period}`;
}


export const highlightText = (text, query) => {
    if (!query) return text;

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
            <span key={i} style={{ color: '#685dd8', fontWeight: 600 }}>
                {renderEmojiText(part)}
            </span>
        ) : renderEmojiText(part)
    );
};

export const isMessageEditable = (message, timeLimit = 15) => {
    if (!message?.Date || !message?.Time) return false;
    const sentTime = new Date(`${message.Date} ${message.Time}`).getTime();
    const currentTime = Date.now();
    const diffInMinutes = (currentTime - sentTime) / (1000 * 60);
    return diffInMinutes <= timeLimit;
};

export const formatMessageFullDate = (dateStr, timeStr) => {
    if (!dateStr) return timeStr || '';

    try {
        // Combine date + time (fallback safe)
        const combined = timeStr ? `${dateStr} ${timeStr}` : dateStr;
        const dateObj = new Date(combined);

        if (isNaN(dateObj.getTime())) {
            return combined;
        }

        // Format Date (DD/MM/YYYY)
        const day = String(dateObj.getDate()).padStart(2, '0');
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const year = dateObj.getFullYear();
        const formattedDate = `${day}/${month}/${year}`;

        // Use your existing UTC formatter
        const isoString = dateObj.toISOString();
        const formattedTime = formatISOTimeUTC(isoString);

        return `${formattedDate} at ${formattedTime}`;
    } catch (e) {
        return dateStr + (timeStr ? ` ${timeStr}` : '');
    }
};