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
