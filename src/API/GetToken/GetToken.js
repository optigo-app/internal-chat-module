import { CommonAPI1, buildLoginBody } from "../InitialApi/CommonApi1";

export const getToken = async (companyCode) => {
    try {
        const payload = { Ufcc: companyCode };
        const body = buildLoginBody("GetToken", "", payload, "Gettoken By Company Code (ConversionDetail)");

        const response = await CommonAPI1(body);
        if (response?.Data) {
            return response?.Data;
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
};