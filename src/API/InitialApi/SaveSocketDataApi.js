import { CommonAPI, buildCommonBody } from "../InitialApi/CommonApi";

export const saveSocketDataApi = async (
    SocketId,
    userData,
    fLabel = "internal Chat (Save Socket id )"
) => {
    try {
        const payload = {
            UserId: userData?.id ?? "",
            SocketId: SocketId ?? "",
        };

        const body = buildCommonBody("SaveSocketData", userData, payload, fLabel);

        const response = await CommonAPI(body);

        if (response?.Data) {
            return response?.Data?.rd || [];
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error in saveSocketDataApi:', error);
        return null;
    }
};