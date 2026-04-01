import { formatTime12h } from '../../../utils/DateFnc';

/** Stable string ID for any message shape. */
export const getMessageId = (msg) => {
  const primary = msg?.MessageId ?? msg?.Id ?? msg?.id;
  if (primary) return String(primary);
  return `temp_${msg?.Direction}_${msg?.Message}_${msg?.DateTime}`;
};

/** Normalise messages state to a plain array. */
export const toArray = (prev) =>
  Array.isArray(prev) ? prev : (prev?.data || []);

/** Current local time components (local-as-UTC pattern). */
export const getLocalTime = () => {
  const now = new Date();
  const localISO = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString();
  return {
    time: formatTime12h(localISO),
    date: localISO.split('T')[0],
    dateTime: localISO,
  };
};

/** Resolve a numeric status from any raw status value. */
export const resolveStatus = (raw) => {
  if (typeof raw === 'string') {
    const l = raw.toLowerCase();
    if (l === 'read') return 3;
    if (l === 'delivered') return 2;
    if (l === 'sent') return 1;
    if (l === 'failed') return 4;
  }
  const n = typeof raw === 'number' ? raw : parseInt(raw, 10);
  return Number.isNaN(n) ? 0 : n;
};

/** Merge server messages with any optimistic/socket messages already in state. */
export const mergeMessages = (serverMessages, prevData, selectedId) => {
  const recentSocket = prevData.filter(m => Number(m.ConversationId) === Number(selectedId));
  const optimistic   = recentSocket.filter(m => m.Direction === 1 && (m.status === 'pending' || m.status === 3));

  const map = new Map();

  for (const sm of serverMessages) {
    const id = getMessageId(sm);
    if (id && !id.startsWith('temp_')) map.set(id, sm);
  }

  for (const msg of recentSocket) {
    const id = getMessageId(msg);
    if (!id || map.has(id)) continue;
    if (id.startsWith('temp_')) {
      const ts = new Date(msg.DateTime).getTime();
      const matched = serverMessages.some(sm =>
        sm.Direction === msg.Direction && sm.Message === msg.Message &&
        Math.abs(new Date(sm.DateTime).getTime() - ts) < 15000
      );
      if (matched) continue;
    }
    map.set(id, msg);
  }

  for (const om of optimistic) {
    const id = getMessageId(om);
    if (!id || map.has(id)) continue;
    const ts = new Date(om.DateTime).getTime();
    const matched = serverMessages.some(sm =>
      sm.Direction === om.Direction && sm.Message === om.Message &&
      Math.abs(new Date(sm.DateTime).getTime() - ts) < 15000
    );
    if (!matched) map.set(id, om);
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(a.DateTime).getTime() - new Date(b.DateTime).getTime()
  );
};