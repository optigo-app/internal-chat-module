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
    const name = customer?.CustomerName;
    return Boolean(String(name ?? '').trim());
};

export const getCustomerDisplayName = (customer) => {
    const name = String(customer?.CustomerName ?? '').trim();
    if (name) return name;

    const phone = String(customer?.CustomerPhone ?? '').trim();
    if (phone) return phone;

    const fallback = String(customer?.name ?? '').trim();
    if (fallback) return fallback;

    return 'Unknown';
};

export const getCustomerAvatarSeed = (customer) => {
    const name = String(customer?.CustomerName ?? '').trim();
    if (name) return name;

    const phone = String(customer?.CustomerPhone ?? '').trim();
    if (phone) return phone;

    return String(customer?.name ?? '').trim();
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

// convert password to sha1
export async function passwordToSha1(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-1", data);
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
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