export function formatChatTimestamp(input) {
    const date = new Date(input);
    if (isNaN(date.getTime())) return '';

    const now = new Date();
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const getTzDateKey = (d) => new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(d);

    const dateKey = getTzDateKey(date);
    const nowKey = getTzDateKey(now);

    const nowStart = new Date(`${nowKey}T00:00:00`);
    const dateStart = new Date(`${dateKey}T00:00:00`);
    const diffDays = Math.floor((nowStart.getTime() - dateStart.getTime()) / (24 * 60 * 60 * 1000));

    const yesterdayKey = new Date(nowStart.getTime() - (24 * 60 * 60 * 1000)).toISOString().slice(0, 10);

    if (dateKey === nowKey) {
        // Show time: e.g., 5:30 PM in local timezone
        return new Intl.DateTimeFormat('en-US', {
            timeZone,
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        }).format(date);
    }

    if (dateKey === yesterdayKey) {
        return 'Yesterday';
    }

    if (diffDays >= 0 && diffDays < 7) {
        // Within last 7 days: show weekday (e.g., Mon)
        return new Intl.DateTimeFormat('en-US', {
            timeZone,
            weekday: 'short',
        }).format(date);
    }

    return new Intl.DateTimeFormat('en-GB', {
        timeZone,
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
    }).format(date);
}


// Extract current time from ISO date string in UTC timezone
export const extractTimeFromISO = (isoString) => {
    if (!isoString) return '';

    try {
        const date = new Date(isoString);

        if (isNaN(date.getTime())) {
            return '';
        }

        return new Intl.DateTimeFormat('en-US', {
            timeZone: 'UTC',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        }).format(date);
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