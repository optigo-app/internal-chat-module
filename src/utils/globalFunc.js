import React from 'react';
import { SHA1 } from "crypto-js";
import Hex from "crypto-js/enc-hex";
import imageCompression from 'browser-image-compression';

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
                nodes.push(
                    <React.Fragment key={`t-${lineIndex}-${matchIndex}`}>{line.slice(lastIndex, start)}</React.Fragment>
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
            nodes.push(<React.Fragment key={`e-${lineIndex}`}>{line.slice(lastIndex)}</React.Fragment>);
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
    const name = customer?.ConversationName ?? customer?.name ?? customer?.UserName ?? customer?.CustomerName;
    return Boolean(String(name ?? '').trim());
};

export const getCustomerDisplayName = (customer) => {
    const name = String(customer?.ConversationName ?? customer?.name ?? customer?.UserName ?? customer?.CustomerName ?? '').trim();
    if (name) return name;

    const phone = String(customer?.CustomerPhone ?? '').trim();
    if (phone) return phone;

    const fallback = String(customer?.ConversationName ?? customer?.name ?? customer?.UserName ?? customer?.CustomerName ?? '').trim();
    if (fallback) return fallback;

    return 'Unknown';
};

export const getCustomerAvatarSeed = (customer) => {
    const name = String(customer?.ConversationName ?? customer?.name ?? customer?.UserName ?? customer?.CustomerName ?? '').trim();
    if (name) return name;

    const phone = String(customer?.CustomerPhone ?? '').trim();
    if (phone) return phone;

    return String(customer?.ConversationName ?? customer?.name ?? customer?.UserName ?? customer?.CustomerName ?? '').trim();
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

export const handleDownloadFile = async (fileUrl, filename = null, options = {}) => {
    try {
        // 1️⃣ Generate filename if not provided
        if (!filename) {
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            // Try to infer extension from URL
            const extMatch = fileUrl.match(/\.[a-zA-Z0-9]+$/);
            const ext = extMatch ? extMatch[0] : '';
            filename = `file-${timestamp}${ext}`;
        }

        // 2️⃣ Ensure filename has extension (if possible)
        if (!filename.includes('.')) {
            const extMatch = fileUrl.match(/\.[a-zA-Z0-9]+$/);
            filename += extMatch ? extMatch[0] : '';
        }

        // 3️⃣ Resolve full URL if needed (optional helper)
        const fullFileUrl = fileUrl.startsWith('http') ? fileUrl : fileUrl;

        // 4️⃣ Fetch file as blob
        const response = await fetch(fullFileUrl, {
            method: 'GET',
            headers: {
                'Accept': '*/*',
                ...options.headers,
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);

        // 5️⃣ Create temporary link to trigger download
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();

        // 6️⃣ Cleanup
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        return { success: true, filename };
    } catch (error) {
        console.error('Download failed:', error);

        // 7️⃣ Fallback: open file in new tab
        try {
            const fallbackUrl = fileUrl.startsWith('http') ? fileUrl : fileUrl;
            const link = document.createElement('a');
            link.href = fallbackUrl;
            link.download = filename || 'file';
            link.target = '_blank';
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            return { success: true, filename, fallback: true };
        } catch (fallbackError) {
            console.error('Fallback download also failed:', fallbackError);
            return { success: false, error: error.message };
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

export const getDocumentMeta = (name = '') => {
    const ext = getFileExt(name);

    if (ext === 'pdf') return { label: 'PDF', tone: 'pdf', iconName: 'FileText', iconUrl: '/icons/pdf.png' };
    if (ext === 'doc' || ext === 'docx') return { label: 'DOCS', tone: 'doc', iconName: 'FileType', iconUrl: '/icons/doc.png' };
    if (ext === 'xls' || ext === 'xlsx' || ext === 'csv') return { label: 'EXCEL', tone: 'sheet', iconName: 'FileSpreadsheet', iconUrl: '/icons/xls.png' };
    if (ext === 'ppt' || ext === 'pptx') return { label: 'PPT', tone: 'ppt', iconName: 'FileType', iconUrl: '/icons/ppt.png' };
    if (ext === 'zip' || ext === 'rar' || ext === '7z') return { label: 'ZIP', tone: 'archive', iconName: 'FileArchive', iconUrl: '/icons/doc.png' };
    if (ext === 'psd') return { label: 'PSD', tone: 'psd', iconName: 'FileType', iconUrl: '/icons/doc.png' };
    if (ext === 'txt') return { label: 'TEXT', tone: 'default', iconName: 'FileText', iconUrl: '/icons/txt.png' };
    if (ext === 'json' || ext === 'xml' || ext === 'html' || ext === 'js' || ext === 'ts' || ext === 'css') {
        return { label: 'CODE', tone: 'code', iconName: 'FileCode', iconUrl: '/icons/doc.png' };
    }

    return { label: ext.toUpperCase() || 'FILE', tone: 'default', iconName: 'File', iconUrl: '/icons/doc.png' };
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


