// Simple module-level queue for files dropped on conversation items
// before the conversation component mounts.
const pendingDrops = new Map();

export const queueDroppedFiles = (conversationId, files) => {
    if (!conversationId || !files?.length) return;
    pendingDrops.set(Number(conversationId), files);
};

export const getAndClearDroppedFiles = (conversationId) => {
    if (!conversationId) return null;
    const key = Number(conversationId);
    const files = pendingDrops.get(key);
    if (files) {
        pendingDrops.delete(key);
    }
    return files || null;
};
