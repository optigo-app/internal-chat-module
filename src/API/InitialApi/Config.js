const isLocal = ["localhost", "nzen", 'tecochat.web', 'web', '5svsmvp4-4000.inc1.devtunnels.ms'].includes(window.location.hostname);

// Base URLs
const API_BASE_URL = isLocal
    ? "http://newnextjs.web/api"
    : "https://apilx.optigoapps.com/api";

const WHATSAPP_BASE_URL = isLocal
    ? "http://newnextjs.web/api"
    : "https://apilx.optigoapps.com/api";

// Media
export const UPLOAD_URL = `${API_BASE_URL}/upload`;
export const REMOVE_FILE_URL = `${API_BASE_URL}/removefile`;

// WhatsApp APIs
export const LOGOUTAPI = `${WHATSAPP_BASE_URL}/whatsapp/chat/logout`;

// Report / Common APIs
export const APIURL = `${API_BASE_URL}/report`;
export const GETCONVERSATIONURL = `${API_BASE_URL}/report`;
export const SAVEPLAYERID = `${API_BASE_URL}/report`;


export const getApiHeaders = (init = {}) => {
    const normalizedInit = init && typeof init === "object" ? init : {};

    let credentials = null;
    debugger
    const sessionToken = JSON.parse(sessionStorage.getItem("token"));
    const userData = JSON.parse(sessionStorage.getItem("userData"));
    if (sessionToken || userData) {
        credentials = {
            yc: (sessionToken && sessionToken.yc) ?? (userData && userData.yearcode),
            sv: (sessionToken && sessionToken.sv) ?? (userData && userData.svid),
        };
    }

    const headers = {
        Version: isLocal ? "R50B3" : "R75PRO",
        sp: "80",
    };

    if (credentials && credentials.yc) {
        headers.Yearcode = credentials.yc;
    }

    if (credentials && credentials.sv) {
        headers.sv = credentials.sv;
    }

    return headers;
};

export const getHeaders = (init = {}) => {
    return getApiHeaders(init);
};

export const getLoginHeaders = (init = {}) => {
    return getApiHeaders(init);
};