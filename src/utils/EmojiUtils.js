/**
 * Converts a raw emoji character into its unified hex string format.
 * Handles ZWJ sequences and skin tone variations.
 */
export const charToUnified = (char) => {
    if (!char) return null;
    try {
        return Array.from(char)
            .map(c => c.codePointAt(0).toString(16))
            .filter(hex => hex !== 'fe0f')
            .join('-');
    } catch (e) {
        return null;
    }
};

/**
 * Parses the raw ReactionEmojis string into a JSON array.
 * @param {string} rawString 
 * @returns {Array}
 */
export const parseReactions = (rawString) => {
    try {
        if (!rawString || rawString === "" || rawString === "[]") return [];
        const raw = JSON.parse(rawString);
        return Array.isArray(raw) ? raw : [];
    } catch (e) {
        console.error("Error parsing reactions:", e);
        return [];
    }
};
