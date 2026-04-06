export const UI = {
  SET_INPUT:          'SET_INPUT',
  SET_MEDIA_FILES:    'SET_MEDIA_FILES',
  SET_SHOW_MEDIA:     'SET_SHOW_MEDIA',
  SET_REPLY:          'SET_REPLY',
  SET_FORWARD:        'SET_FORWARD',
  SET_FORWARD_ANCHOR: 'SET_FORWARD_ANCHOR',
  SET_BLINK:          'SET_BLINK',
  SET_VIEWER:         'SET_VIEWER',
  SET_SEARCHING:      'SET_SEARCHING',
  SET_SEARCH_RESULTS: 'SET_SEARCH_RESULTS',
  SET_UPLOAD_PROGRESS:'SET_UPLOAD_PROGRESS',
  SET_LOADED_MEDIA:   'SET_LOADED_MEDIA',
};

export const uiInitialState = {
  inputValue: '',
  mediaFiles: [],
  showMedia: false,
  replyToMessage: null,
  forwardMessage: null,
  forwardAnchorEl: null,
  blinkMessageId: null,
  mediaViewerOpen: false,
  mediaViewerItems: [],
  mediaViewerIndex: 0,
  mediaViewerMessage: null,
  isSearching: false,
  searchResults: [],
  uploadProgress: {},
  loadedMedia: {},
};

export function uiReducer(state, action) {
  switch (action.type) {
    case UI.SET_INPUT:          return state.inputValue === action.value ? state : { ...state, inputValue: action.value };
    case UI.SET_MEDIA_FILES:    return state.mediaFiles === action.value ? state : { ...state, mediaFiles: action.value };
    case UI.SET_SHOW_MEDIA:     return state.showMedia === action.value ? state : { ...state, showMedia: action.value };
    case UI.SET_REPLY:          return state.replyToMessage === action.value ? state : { ...state, replyToMessage: action.value };
    case UI.SET_FORWARD:        return state.forwardMessage === action.value ? state : { ...state, forwardMessage: action.value };
    case UI.SET_FORWARD_ANCHOR: return state.forwardAnchorEl === action.value ? state : { ...state, forwardAnchorEl: action.value };
    case UI.SET_BLINK:          return state.blinkMessageId === action.value ? state : { ...state, blinkMessageId: action.value };
    case UI.SET_SEARCHING:      return state.isSearching === action.value ? state : { ...state, isSearching: action.value };
    case UI.SET_SEARCH_RESULTS: return state.searchResults === action.value ? state : { ...state, searchResults: action.value };
    case UI.SET_UPLOAD_PROGRESS:
      return { ...state, uploadProgress: { ...state.uploadProgress, ...action.value } };
    case UI.SET_LOADED_MEDIA:
      if (state.loadedMedia[action.key]) return state;
      return { ...state, loadedMedia: { ...state.loadedMedia, [action.key]: true } };
    case UI.SET_VIEWER:
      if (
        (action.open === undefined || state.mediaViewerOpen === action.open) &&
        (action.items === undefined || state.mediaViewerItems === action.items) &&
        (action.index === undefined || state.mediaViewerIndex === action.index) &&
        (action.message === undefined || state.mediaViewerMessage === action.message)
      ) {
        return state;
      }
      return {
        ...state,
        mediaViewerOpen: action.open ?? state.mediaViewerOpen,
        mediaViewerItems: action.items ?? state.mediaViewerItems,
        mediaViewerIndex: action.index ?? state.mediaViewerIndex,
        mediaViewerMessage: action.message ?? state.mediaViewerMessage,
      };
    default: return state;
  }
}