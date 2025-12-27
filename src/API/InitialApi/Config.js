import { GetCredentialsFromCookie } from "../../utils/FetchToken";

const isLocal = ["localhost", "nzen", '9511a53f910a.ngrok-free.app'].includes(window.location.hostname);

export const MEDIAAPIURL = "https://crmapp.mpillarapi.com/api/meta/v19.0/622385334300738/Media/";
export const MESSAGEAPIURL = isLocal ? "http://192.168.1.71:3001/api/whatsapp/chat/send" : "https://nxtapi.optigoapps.com/api/whatsapp/chat/send";
export const MESSAGEAPIURLBULK = isLocal ? "http://192.168.1.71:3001/api/whatsapp/chat/send-bulk" : "https://nxtapi.optigoapps.com/api/whatsapp/chat/send-bulk";
export const GETCONVERSATIONURL = isLocal ? "http://newnextjs.web/api/report" : "https://nxtapi.optigoapps.com/api/report";
export const LOGOUTAPI = isLocal ? "http://192.168.1.71:3001/api/whatsapp/chat/logout" : "https://nxtapi.optigoapps.com/api/whatsapp/chat/logout";
export const UPLOADMEDIA = "https://crmapp.mpillarapi.com/api/meta/v19.0/622385334300738/Media/";
export const SAVEPLAYERID = isLocal ? "http://newnextjs.web/api/report" : "https://nxtapi.optigoapps.com/api/report";

//main api 
export const APIURL = isLocal ? "http://newnextjs.web/api/report" : "https://nxtapi.optigoapps.com/api/report";

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