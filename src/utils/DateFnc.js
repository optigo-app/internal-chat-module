export function formatChatTimestamp(input) {
    const date = new Date(input);
    const now = new Date();

    // Convert both to Indian timezone for accurate comparison
    const indianDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
    const indianNow = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));

    const isSameDay = (d1, d2) =>
        d1.getDate() === d2.getDate() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getFullYear() === d2.getFullYear();

    const indianYesterday = new Date(indianNow.getTime());
    indianYesterday.setDate(indianNow.getDate() - 1);

    if (isSameDay(indianDate, indianNow)) {
        // Show time: e.g., 5:30 PM in Indian timezone
        return indianDate.toLocaleTimeString('en-GB', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: 'GMT'
        });
    } else if (isSameDay(indianDate, indianYesterday)) {
        return 'Yesterday';
    } else if (indianNow - indianDate < 7 * 24 * 60 * 60 * 1000) {
        // Within last 7 days: show weekday (e.g., Monday)
        return indianDate.toLocaleDateString('en-IN', {
            weekday: 'long',
            timeZone: 'GMT'
        });
    } else if (indianDate.getFullYear() === indianNow.getFullYear()) {
        // Same year: show "5 Aug" in Indian format
        return indianDate.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            timeZone: 'GMT'
        });
    } else {
        // Different year: show full date in Indian format
        return indianDate.toLocaleDateString('en-GB', {
            timeZone: 'GMT'
        });
    }
}



// Extract current time from ISO date string in Indian timezone
export const extractTimeFromISO = (isoString) => {
    if (!isoString) return '';

    try {
        const date = new Date(isoString);


        if (isNaN(date.getTime())) {
            return '';
        }

        // Use GMT timezone
        return date.toLocaleTimeString('en-GB', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: 'GMT'
        });
    } catch (error) {
        console.warn('Error extracting time from ISO string:', isoString, error);
        return '';
    }
};

export const FormatDateIST = (date, formatOptions) => {
    if (!date) return { date: "N/A", time: "N/A" };

    try {
        const entryDate = new Date(date);

        // Handle invalid dates
        if (isNaN(entryDate.getTime())) {
            return { date: "Invalid Date", time: "Invalid Time" };
        }

        // --- Date Formatting ---
        const dd = String(entryDate.getUTCDate()).padStart(2, "0");
        const mm = String(entryDate.getUTCMonth() + 1).padStart(2, "0");
        const yyyy = entryDate.getUTCFullYear();

        let formattedDate;
        if (!formatOptions) {
            formattedDate = entryDate.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                timeZone: "UTC",
            });
        } else if (formatOptions === "dd-mm-yyyy") {
            formattedDate = `${dd}-${mm}-${yyyy}`;
        } else if (formatOptions === "dd/mm/yyyy") {
            formattedDate = `${dd}/${mm}/${yyyy}`;
        } else if (formatOptions === "yyyy-mm-dd") {
            formattedDate = `${yyyy}-${mm}-${dd}`;
        } else {
            formattedDate = `${dd}-${mm}-${yyyy}`; // fallback
        }

        // --- Time Formatting ---
        const formattedTime = entryDate.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
            timeZone: "UTC",
        });

        return { date: formattedDate, time: formattedTime };

    } catch (error) {
        console.error("Error formatting date:", error);
        return { date: "N/A", time: "N/A" };
    }
};

// Format date for display (like WhatsApp)
export const formatDateHeader = (dateString) => {
    if (!dateString) return 'Today';

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    if (dateString === today) {
        return 'Today';
    } else if (dateString === yesterday) {
        return 'Yesterday';
    } else {
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                return 'Today'; // Fallback for invalid dates
            }
            return date.toLocaleDateString('en-IN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (error) {
            console.warn('Error formatting date:', dateString, error);
            return 'Today';
        }
    }
};