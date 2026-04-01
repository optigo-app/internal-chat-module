import { useState, useRef, useCallback, useLayoutEffect, useEffect } from 'react';

export const useScrollManagement = (
    selectedCustomerId,
    loading,
    messages,
    hasMore,
    loadOlderMessages
) => {
    const containerRef = useRef(null);
    const [showScrollToBottom, setShowScrollToBottom] = useState(false);
    const [isSwitchingConversation, setIsSwitchingConversation] = useState(false);

    const isAutoScrollingRef = useRef(false);
    const scrollListenerAttachedRef = useRef(false);
    const scrollTimeoutRef = useRef(null);
    const lastScrollTriggerRef = useRef(0);
    const lastMessageIdRef = useRef(null);
    const lastConversationIdRef = useRef(null);

    const scrollToBottom = useCallback((behavior = 'auto') => {
        if (!containerRef.current) return;

        isAutoScrollingRef.current = true;
        const normalizedBehavior = behavior === 'instant' ? 'auto' :
            ['smooth', 'auto'].includes(behavior) ? behavior : 'auto';

        containerRef.current.scrollTo({
            top: containerRef.current.scrollHeight,
            behavior: normalizedBehavior
        });
        setShowScrollToBottom(false);
        setTimeout(() => { isAutoScrollingRef.current = false; }, 100);
    }, []);

    const handleScroll = useCallback(() => {
        if (!containerRef.current) return;

        const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
        const scrollBottom = scrollHeight - clientHeight - scrollTop;

        if (!isAutoScrollingRef.current) {
            setShowScrollToBottom(scrollBottom > 300);
        }

        if (hasMore && !isAutoScrollingRef.current) {
            const dynamicThreshold = Math.max(50, Math.floor(clientHeight * 0.2));
            if (scrollTop <= dynamicThreshold) {
                const now = Date.now();
                if (now - lastScrollTriggerRef.current < 1000) return;

                if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
                scrollTimeoutRef.current = setTimeout(() => {
                    lastScrollTriggerRef.current = now;
                    loadOlderMessages(containerRef);
                }, 150);
            }
        }
    }, [hasMore, loadOlderMessages]);

    // Conversation switch handling
    useLayoutEffect(() => {
        if (!selectedCustomerId) return;

        if (selectedCustomerId !== lastConversationIdRef.current) {
            setIsSwitchingConversation(true);
            lastConversationIdRef.current = selectedCustomerId;
        }

        if (!loading && isSwitchingConversation && containerRef.current) {
            const scroll = () => {
                if (containerRef.current) {
                    containerRef.current.scrollTop = containerRef.current.scrollHeight;
                }
            };

            scroll();
            const t1 = setTimeout(scroll, 0);
            const t2 = setTimeout(scroll, 50);

            const messageList = Array.isArray(messages?.data) ? messages.data : [];
            if (messageList.length > 0) {
                const lastMessage = messageList[messageList.length - 1];
                lastMessageIdRef.current = lastMessage?.Id || lastMessage?.MessageId;
            }

            const timer = setTimeout(() => setIsSwitchingConversation(false), 150);

            return () => {
                clearTimeout(t1);
                clearTimeout(t2);
                clearTimeout(timer);
            };
        }
    }, [selectedCustomerId, loading, messages, isSwitchingConversation]);

    // Attach scroll listener
    useEffect(() => {
        const container = containerRef.current;
        if (!container || !selectedCustomerId) {
            scrollListenerAttachedRef.current = false;
            return;
        }

        scrollListenerAttachedRef.current = false;
        const timeoutId = setTimeout(() => {
            const checkContainer = containerRef.current;
            if (checkContainer?.scrollHeight > checkContainer?.clientHeight &&
                !scrollListenerAttachedRef.current) {
                checkContainer.addEventListener('scroll', handleScroll, { passive: true });
                scrollListenerAttachedRef.current = true;
            }
        }, 1200);

        return () => {
            clearTimeout(timeoutId);
            if (containerRef.current && scrollListenerAttachedRef.current) {
                containerRef.current.removeEventListener('scroll', handleScroll);
                scrollListenerAttachedRef.current = false;
            }
            if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        };
    }, [handleScroll, selectedCustomerId]);

    return {
        containerRef,
        showScrollToBottom,
        isSwitchingConversation,
        scrollToBottom
    };
};
