import { logoutApi } from "../InitialApi/LogoutConfig";

export const LogoutApi = async (userId) => {
    try {
        const body = { "UserId": userId }

        const response = await logoutApi(body);
        if (response) {
            return response;
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}