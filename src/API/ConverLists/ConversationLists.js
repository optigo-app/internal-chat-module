import { CommonAPI, buildCommonBody } from "../InitialApi/CommonApi";

export const fetchConversationLists = async (
    page = 1,
    pageSize = 50,
    auth,
    search = "",
    signal = null,
    fLabel = "Chat ( List Conversation )"
) => {
    try {
        const payload = {
            Page: page ?? 1,
            PageSize: pageSize ?? 50,
            UserId: auth?.id ?? "",
            SearchTerm: search ?? "",
        };

        const body = buildCommonBody("GetConversationList", auth, payload, fLabel);
        const response = await CommonAPI(body, { signal });
        if (response?.Data) {
            const rdLength = response.Data.rd?.length || 0;
            const rd1Length = response.Data.rd1?.length || 0;
            const totalItems = rdLength + rd1Length;

            return {
                data: response?.Data || [],
                total: response?.Data?.total || totalItems || 0,
                currentPage: page,
                hasMore: rdLength === pageSize // Check against rd length for pagination
            };
        } else {
            return {
                data: [],
                total: 0,
                currentPage: page,
                hasMore: false
            };
        }
    } catch (error) {
        console.error('Error:', error);
        return {
            data: [],
            total: 0,
            currentPage: page,
            hasMore: false
        };
    }
};