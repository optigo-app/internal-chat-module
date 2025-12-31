import { GetCredentialsFromCookie } from "../../utils/FetchToken";

const isLocal = ["localhost", "nzen", '9511a53f910a.ngrok-free.app'].includes(window.location.hostname);

// Base URLs
const API_BASE_URL = isLocal
    ? "http://newnextjs.web/api"
    : "https://nxtapi.optigoapps.com/api";

const WHATSAPP_BASE_URL = isLocal
    ? "http://192.168.1.71:3001/api"
    : "https://nxtapi.optigoapps.com/api";

const MEDIA_BASE_URL =
    "https://crmapp.mpillarapi.com/api/meta/v19.0/622385334300738/Media/";

// Media
export const MEDIAAPIURL = MEDIA_BASE_URL;
export const UPLOADMEDIA = MEDIA_BASE_URL;
export const UPLOAD_URL = `${API_BASE_URL}/upload`;
export const REMOVE_FILE_URL = `${API_BASE_URL}/removefile`;

// WhatsApp APIs
export const MESSAGEAPIURL = `${WHATSAPP_BASE_URL}/whatsapp/chat/send`;
export const MESSAGEAPIURLBULK = `${WHATSAPP_BASE_URL}/whatsapp/chat/send-bulk`;
export const LOGOUTAPI = `${WHATSAPP_BASE_URL}/whatsapp/chat/logout`;

// Report / Common APIs
export const APIURL = `${API_BASE_URL}/report`;
export const GETCONVERSATIONURL = `${API_BASE_URL}/report`;
export const SAVEPLAYERID = `${API_BASE_URL}/report`;


export const getHeaders = () => {
    let credentials = GetCredentialsFromCookie();
    const version = "R50B3";

    if (!credentials) {
        const sessionToken = JSON.parse(sessionStorage.getItem("token"));
        if (sessionToken) {
            credentials = {
                yc: sessionToken.yc,
                sv: sessionToken.sv,
            };
        }
    }

    const headers = {
        Version: version,
        sp: "80",
        whatsappNumber: "622385334300738",
    };

    if (credentials && credentials.yc && credentials.sv) {
        headers.Yearcode = credentials.yc;
        headers.sv = credentials.sv;
    }

    return headers;
};

export const getLoginHeaders = (init = {}) => {
    let credentials = GetCredentialsFromCookie();
    const { version = "R50B3" } = init;

    if (!credentials) {
        const sessionToken = JSON.parse(sessionStorage.getItem("token"));
        if (sessionToken) {
            credentials = {
                yc: sessionToken.yc,
                sv: sessionToken.sv,
            };
        }
    }

    const headers = {
        Version: version,
        sp: "80",
    };

    if (credentials && credentials.yc && credentials.sv) {
        headers.Yearcode = credentials.yc;
        headers.sv = credentials.sv;
    }

    return headers;
};