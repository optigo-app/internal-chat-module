import { useState, useEffect, useRef } from 'react';
import { addInternalTypingHandler } from '../../socket';

export const useTypingIndicator = (conversationId, currentUserId) => {
    const [typingStatus, setTypingStatus] = useState(null);
    const typingTimeoutRef = useRef(null);

    useEffect(() => {
        const cleanup = addInternalTypingHandler((data) => {
            if (Number(data.ConversationId) !== Number(conversationId)) return;
            if (Number(data.SenderId) === Number(currentUserId)) return;

            if (data.isTyping === false) {
                setTypingStatus(null);
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            } else {
                setTypingStatus({
                    ...data,
                    UserName: data.UserName || data.senderName || 'Someone'
                });
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(() => setTypingStatus(null), 5000);
            }
        });

        return () => {
            cleanup();
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        };
    }, [conversationId, currentUserId]);

    return typingStatus;
};
