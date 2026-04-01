// ─── Action types ────────────────────────────────────────────────────────────
export const MSG = {
  LOAD:           'LOAD',
  APPEND:         'APPEND',
  UPSERT:         'UPSERT',
  UPDATE_STATUS:  'UPDATE_STATUS',
  UPDATE_REACTION:'UPDATE_REACTION',
  EDIT:           'EDIT',
  DELETE_ME:      'DELETE_ME',
  DELETE_ALL:     'DELETE_ALL',
  CLEAR:          'CLEAR',
  SET_LOADING:    'SET_LOADING',
  SET_LOADING_OLDER: 'SET_LOADING_OLDER',
  SET_HAS_MORE:   'SET_HAS_MORE',
  SET_PAGE:       'SET_PAGE',
  SET_TEMP_CONV:  'SET_TEMP_CONV',
  SET_MESS_ID:    'SET_MESS_ID',
  SET_STORE_MESS: 'SET_STORE_MESS',
};

export const msgInitialState = {
  data: [],
  total: 0,
  loading: false,
  loadingOlder: false,
  hasMore: true,
  currentPage: 1,
  tempConversationId: null,
  messId: '',
  storeMessData: { messageId: '' },
};

export function messagesReducer(state, action) {
  switch (action.type) {

    case MSG.LOAD:
      return { ...state, data: action.data, total: action.total };

    case MSG.APPEND:
      return { ...state, data: [...state.data, ...action.data], total: action.total };

    case MSG.UPSERT: {
      const incoming = action.msg;
      const id = action.id;
      const idx = state.data.findIndex(m =>
        m?.MessageId === id || m?.Id === id || m?.id === id
      );
      if (idx >= 0) {
        const existing = state.data[idx];
        const next = [...state.data];
        next[idx] = {
          ...existing,
          ...incoming,
          // Only preserve existing isUploading/percent if the incoming update doesn't explicitly set them
          isUploading: 'isUploading' in incoming ? incoming.isUploading : existing.isUploading,
          percent:     'percent'     in incoming ? incoming.percent     : existing.percent,
        };
        return { ...state, data: next };
      }
      return { ...state, data: [...state.data, incoming] };
    }

    case MSG.UPDATE_STATUS: {
      const { messageId, conversationId, status, extra } = action;
      return {
        ...state,
        data: state.data.map(msg => {
          if (msg.Direction !== 1) return msg;
          const idMatch = messageId && (
            msg.Id === messageId || msg.id === messageId || msg.MessageId === messageId ||
            (msg.Message === extra?.Message && Math.abs(new Date(msg.DateTime) - new Date(extra?.DateTime)) < 60000)
          );
          const convMatch = !messageId && conversationId && Number(msg.ConversationId) === Number(conversationId);
          if (!idMatch && !convMatch) return msg;

          const current = parseInt(msg.Status, 10) || 0;
          if (current >= status) return msg;
          return { ...msg, Status: status, ...extra };
        }),
      };
    }

    case MSG.UPDATE_REACTION: {
      const { messageId, reactions } = action;
      return {
        ...state,
        data: state.data.map(msg => {
          const id = msg.MessageId || msg.Id || msg.id;
          if (String(id) !== String(messageId)) return msg;
          return { ...msg, ReactionEmojis: JSON.stringify(reactions) };
        }),
      };
    }

    case MSG.EDIT: {
      const { messageId, newMessage, time, date } = action;
      return {
        ...state,
        data: state.data.map(msg => {
          const id = msg.MessageId || msg.Id || msg.id;
          if (String(id) !== String(messageId)) return msg;
          return { ...msg, Message: newMessage, IsEdited: 1, Direction: 1, Time: time, Date: date };
        }),
      };
    }

    case MSG.DELETE_ME:
      return { ...state, data: state.data.filter(m => String(m.MessageId || m.Id || m.id) !== String(action.messageId)) };

    case MSG.DELETE_ALL: {
      const { messageId, deletedInfo } = action;
      return {
        ...state,
        data: state.data.map(msg => {
          if (String(msg.MessageId || msg.Id || msg.id) !== String(messageId)) return msg;
          return {
            ...msg,
            Message: deletedInfo.Message || 'This message was deleted.',
            Message1: deletedInfo.Message1 || 'You deleted this message.',
            IsDeletedForEveryone: 1,
            DeletedAt: deletedInfo.DeletedAt || new Date().toISOString(),
            Attachments: null, attachments: null, MediaUrl: null, mediaItems: null, MessageType: 'text',
          };
        }),
      };
    }

    case MSG.CLEAR:
      return { ...msgInitialState };

    case MSG.SET_LOADING:       return { ...state, loading: action.value };
    case MSG.SET_LOADING_OLDER: return { ...state, loadingOlder: action.value };
    case MSG.SET_HAS_MORE:      return { ...state, hasMore: action.value };
    case MSG.SET_PAGE:          return { ...state, currentPage: action.value };
    case MSG.SET_TEMP_CONV:     return { ...state, tempConversationId: action.value };
    case MSG.SET_MESS_ID:       return { ...state, messId: action.value };
    case MSG.SET_STORE_MESS:    return { ...state, storeMessData: action.value };

    default: return state;
  }
}