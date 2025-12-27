import { CommonAPI, buildCommonBody } from "../InitialApi/CommonApi";

export const fetchConversationLists = async (
    page = 1,
    pageSize = 50,
    auth,
    search = "",
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
        const response = await CommonAPI(body);
        if (response?.Data) {
            return {
                data: response?.Data || [],
                total: response?.Data?.total || response?.Data?.length || 0,
                currentPage: page,
                hasMore: response?.Data?.length === pageSize
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