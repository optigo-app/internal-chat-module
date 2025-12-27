import { passwordToSha1 } from "../../utils/globalFunc";
import { CommonAPI } from "../InitialApi/CommonApi";
import { buildLoginBody } from "../InitialApi/CommonApi1";

export const fetchLoginApi = async (data) => {
    try {
        const payload = {
            Ufcc: data?.companycode ?? "",
            UserEmail: data?.userId ?? "",
            PWD: (await passwordToSha1(data?.password)) ?? "",
        };

        const body = buildLoginBody("login", data?.userId ?? "", payload, "Chat module (login)");

        const response = await CommonAPI(body, "login");

        if (response?.Data) {
            return response?.Data;
        } else {
            return [];
        }
    } catch (error) {
        console.error('Error:', error);
        return [];
    }
};