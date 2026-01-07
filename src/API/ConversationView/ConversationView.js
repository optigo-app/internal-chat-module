import { CommonAPI, buildCommonBody } from "../InitialApi/CommonApi";

export const conversationView = async (
    ConversationId,
    Page = 1,
    PageSize = 10,
    auth,
    pageName,
    signal,
    fLabel = "Chat ( list )"
) => {
    try {
        const payload = {
            Page,
            PageSize,
            ConversationId,
            UserId: auth?.id,
        };

        const body = buildCommonBody("GetMessages", auth, payload, fLabel);

        const response = await CommonAPI(body, { pageName, signal });
        if (response?.Data) {
            return {
                data: response?.Data || [],
                total: response?.Data?.total || response?.Data?.rd?.length || 0,
                currentPage: Page,
                hasMore: response?.Data?.rd?.length === PageSize
            };
        } else {
            return {
                data: [],
                total: 0,
                currentPage: Page,
                hasMore: false
            };
        }
    } catch (error) {
        if (error.message === 'AbortError') {
            throw error;
        }
        console.error('Error:', error);
        return {
            data: [],
            total: 0,
            currentPage: Page,
            hasMore: false
        };
    }
}