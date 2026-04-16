import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { VariableSizeList as List } from 'react-window';
import { Box, CircularProgress, Typography } from '@mui/material';
import TypingIndicator from '../chat/messages/TypingIndicator';
import MediaPreview from '../MediaPreview/MediaPreview';
import MessageItem from './MessageItem';
import ScrollToBottomButton from './ScrollToBottomButton';
import DragDropOverlay from '../DragDropOverlay/DragDropOverlay';

const DATE_HEADER_HEIGHT = 40;
const TYPING_ROW_HEIGHT = 48;

const getRowStableKey = (row) => {
    if (!row) return null;
    if (row.type === 'date') return `date:${row.date}`;
    if (row.type === 'typing') return 'typing';
    if (row.type === 'spacer-top') return 'spacer-top';
    if (row.type === 'spacer-bottom') return 'spacer-bottom';
    if (row.type === 'message') {
        const msg = row.msg;
        return `msg:${msg?.Id ?? msg?.MessageId ?? msg?.CreatedAt ?? row.msgIndex}`;
    }
    return `unknown:${row.type}`;
};

// ─── VirtualRow ───────────────────────────────────────────────────────────────
const VirtualRow = React.memo(({ data, index, style }) => {
    const {
        rows, setSize, auth, handlePaste, selectedCustomer, blinkMessageId,
        hoveredMessageId, setHoveredMessageId, reactionMenuMessageId,
        reactionMenuAnchorEl, setReactionMenuAnchorEl, setReactionMenuMessageId,
        closeReactionMenu, handleMessageEmojiClick, handleMenuClick,
        handleContextMenu, scrollToMessage, containerRef, parseTemplateData,
        getMediaKey, getMediaSrcForMessage, loadedMedia, markLoaded,
        handleMediaClick, getMessageStatusIcon, handleRemoveReaction,
        messageById, handleForward, setDrawerViewState, setDrawerOpen,
        formatDateHeader, typingStatus,
    } = data;

    const rowRef = useRef(null);
    const row = rows[index];

    useEffect(() => {
        if (!rowRef.current || !row) return;
        const stableKey = getRowStableKey(row);
        const observer = new ResizeObserver(([entry]) => {
            const h = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
            if (h > 0) setSize(stableKey, index, Math.ceil(h));
        });
        observer.observe(rowRef.current);
        const initialH = rowRef.current.getBoundingClientRect().height;
        if (initialH > 0) setSize(stableKey, index, Math.ceil(initialH));
        return () => observer.disconnect();
    }, [index, row, setSize]);

    if (!row) return <div style={style} />;

    if (row.type === 'typing') {
        return (
            <div style={style}>
                <div ref={rowRef} style={{ padding: '0 50px 4px 24px' }}>
                    <TypingIndicator typingStatus={typingStatus} isGroup={selectedCustomer?.IsGroup === 1} />
                </div>
            </div>
        );
    }

    if (row.type === 'spacer-top' || row.type === 'spacer-bottom') {
        return <div style={style}><div ref={rowRef} style={{ height: 8 }} /></div>;
    }

    if (row.type === 'date') {
        return (
            <div style={style}>
                <div ref={rowRef} style={{ display: 'flex', justifyContent: 'center', margin: '8px 0 4px 0' }}>
                    <Typography variant="caption" className="typoDate">
                        {formatDateHeader(row.date)}
                    </Typography>
                </div>
            </div>
        );
    }

    const { msg, msgIndex } = row;
    return (
        <div style={style}>
            <div ref={rowRef} style={{ padding: '0 50px 4px 24px' }}>
                <MessageItem
                    msg={msg} index={msgIndex} auth={auth} handlePaste={handlePaste}
                    selectedCustomer={selectedCustomer} blinkMessageId={blinkMessageId}
                    hoveredMessageId={hoveredMessageId} setHoveredMessageId={setHoveredMessageId}
                    reactionMenuMessageId={reactionMenuMessageId} reactionMenuAnchorEl={reactionMenuAnchorEl}
                    setReactionMenuAnchorEl={setReactionMenuAnchorEl} setReactionMenuMessageId={setReactionMenuMessageId}
                    closeReactionMenu={closeReactionMenu} handleMessageEmojiClick={handleMessageEmojiClick}
                    handleMenuClick={handleMenuClick} handleContextMenu={handleContextMenu}
                    scrollToMessage={scrollToMessage} containerRef={containerRef}
                    parseTemplateData={parseTemplateData} getMediaKey={getMediaKey}
                    getMediaSrcForMessage={getMediaSrcForMessage} loadedMedia={loadedMedia}
                    markLoaded={markLoaded} handleMediaClick={handleMediaClick}
                    getMessageStatusIcon={getMessageStatusIcon} handleRemoveReaction={handleRemoveReaction}
                    messageById={messageById} handleForward={handleForward}
                    setDrawerViewState={setDrawerViewState} setDrawerOpen={setDrawerOpen}
                />
            </div>
        </div>
    );
});

// ─── MessageArea ──────────────────────────────────────────────────────────────
const MessageArea = ({
    auth, showMedia, setShowMedia, loading, loadingOlder,
    mediaFiles, setMediaFiles, handleClosePreview, containerRef,
    showScrollToBottom, scrollToBottomRightOffset, setContextMenu,
    selectedCustomer, scrollToBottom, groupMessagesByDate, formatDateHeader,
    getMessageStatusIcon: getMessageStatusIconProp, parseTemplateData,
    getMediaSrcForMessage, handleMediaClick, handleMessageEmojiClick,
    handleMenuClick, handleContextMenu, scrollToMessage, blinkMessageId,
    loadedMedia, getMediaKey, markLoaded, handleRemoveReaction,
    replyToMessage, handleForward, processFiles, captureMessageScrollState,
    typingStatus, setDrawerViewState, setDrawerOpen, handleSendMessage,
}) => {
    const [hoveredMessageId, setHoveredMessageId] = useState(null);
    const [reactionMenuAnchorEl, setReactionMenuAnchorEl] = useState(null);
    const [reactionMenuMessageId, setReactionMenuMessageId] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [listHeight, setListHeight] = useState(0);
    // Hidden until we've scrolled to exact bottom — then fades in smoothly
    const [listVisible, setListVisible] = useState(false);
    const [showScrollBtn, setShowScrollBtn] = useState(false);

    const dragCounter = useRef(0);
    const listRef = useRef(null);
    const outerRef = useRef(null);
    const wrapperRef = useRef(null);

    const stableKeyToHeight = useRef({});
    const indexToStableKey = useRef({});

    // Track distance-from-bottom via scroll event so it's always accurate
    // even when react-window's virtual scrollHeight changes mid-render
    const distanceFromBottomRef = useRef(0);
    const onListScroll = useCallback(({ scrollOffset, scrollUpdateWasRequested }) => {
        const outer = outerRef.current;
        if (!outer) return;
        const dist = outer.scrollHeight - outer.clientHeight - outer.scrollTop;
        distanceFromBottomRef.current = dist;
        // Show scroll-to-bottom button when user has scrolled up more than 300px
        setShowScrollBtn(dist > 300);
    }, []);

    const isMediaPreviewOpen = (mediaFiles?.length || 0) > 0;
    const scrollToBottomBotOffset = replyToMessage ? 170 : 110;

    // ── Rows ──────────────────────────────────────────────────────────────
    const rows = useMemo(() => {
        const list = [{ type: 'spacer-top' }];
        Object.entries(groupMessagesByDate || {}).forEach(([date, msgs]) => {
            if (!msgs?.length) return;
            list.push({ type: 'date', date });
            msgs.forEach((msg, i) => list.push({ type: 'message', msg, msgIndex: i }));
        });
        if (typingStatus) list.push({ type: 'typing' });
        list.push({ type: 'spacer-bottom' });
        return list;
    }, [groupMessagesByDate, typingStatus]);

    // Rebuild index map on every rows change
    const prevRowsLengthRef = useRef(0);
    useEffect(() => {
        const prevLen = prevRowsLengthRef.current;
        prevRowsLengthRef.current = rows.length;
        const map = {};
        rows.forEach((row, i) => { map[i] = getRowStableKey(row); });
        indexToStableKey.current = map;
        // Only reset from the first changed index instead of resetting everything
        const resetFrom = rows.length !== prevLen ? Math.max(0, Math.min(prevLen, rows.length) - 1) : 0;
        listRef.current?.resetAfterIndex(resetFrom, false);
    }, [rows]);

    // ── Height helpers ────────────────────────────────────────────────────
    const getSize = useCallback((index) => {
        const stableKey = indexToStableKey.current[index];
        if (stableKey && stableKeyToHeight.current[stableKey] != null) {
            return stableKeyToHeight.current[stableKey];
        }
        const row = rows[index];
        if (!row) return 80;
        if (row.type === 'date') return DATE_HEADER_HEIGHT;
        if (row.type === 'typing') return TYPING_ROW_HEIGHT;
        if (row.type === 'spacer-top' || row.type === 'spacer-bottom') return 8;
        if (row.type === 'message') {
            const m = row.msg;
            if (m?.IsDeletedForEveryone === 1) return 46; // System message estimate

            const mt = m?.MessageType;
            if (mt === 'image' || mt === 'video') return 300;
            if (mt === 'document' || mt === 'audio') return 120;

            const msgLen = (m?.Message || '').length;
            const isGroup = selectedCustomer?.IsGroup === 1 && m?.Direction === 0;
            const base = isGroup ? 95 : 72;

            // Adjust base for multi-line messages
            if (msgLen > 50) return base + Math.min(100, Math.floor(msgLen / 45) * 20);
            return base;
        }
        return 80;
    }, [rows, selectedCustomer?.IsGroup]);

    const setSize = useCallback((stableKey, index, size) => {
        const prevSize = stableKeyToHeight.current[stableKey];
        // Only trigger update if height has changed significantly (avoiding sub-pixel jitter)
        if (prevSize != null && Math.abs(prevSize - size) < 1.5) return;

        stableKeyToHeight.current[stableKey] = size;
        listRef.current?.resetAfterIndex(index, false);

        // Sticky bottom: if user was already at the bottom, stay there.
        // We check distanceFromBottomRef which is updated in onScroll.
        if (distanceFromBottomRef.current < 40) {
            requestAnimationFrame(() => {
                listRef.current?.scrollToItem(rows.length - 1, 'end');
                const o = outerRef.current;
                if (o) o.scrollTop = o.scrollHeight;
            });
        }
    }, [rows.length]);

    // ── Conversation change: reset & hide list ────────────────────────────
    const prevConvIdRef = useRef(null);
    const didInitialScroll = useRef(false);
    const convLoadTimerRef = useRef(null);
    const scrollSettleRef = useRef(null);

    useEffect(() => {
        const id = selectedCustomer?.ConversationId;
        if (id === prevConvIdRef.current) return;
        prevConvIdRef.current = id;
        didInitialScroll.current = false;
        stableKeyToHeight.current = {};
        indexToStableKey.current = {};
        distanceFromBottomRef.current = 0;
        setShowScrollBtn(false);
        setListVisible(false);
        clearTimeout(convLoadTimerRef.current);
        // Absolute safety net — never stuck forever
        convLoadTimerRef.current = setTimeout(() => setListVisible(true), 5000);
    }, [selectedCustomer?.ConversationId]);

    useEffect(() => () => {
        clearTimeout(convLoadTimerRef.current);
        clearTimeout(scrollSettleRef.current);
    }, []);

    // ── Initial scroll-to-bottom then reveal ─────────────────────────────
    // Phase 1 (immediate): scrollToItem so react-window renders bottom rows.
    // Phase 2 (after 150ms): heights are measured by ResizeObserver → force
    //   scrollTop = scrollHeight for pixel-perfect bottom → fade list in.
    useEffect(() => {
        if (!rows || rows.length <= 2) {
            // Empty conversation — just reveal
            didInitialScroll.current = false;
            clearTimeout(convLoadTimerRef.current);
            convLoadTimerRef.current = setTimeout(() => setListVisible(true), 200);
            return;
        }
        if (didInitialScroll.current) return;
        didInitialScroll.current = true;

        clearTimeout(convLoadTimerRef.current);
        clearTimeout(scrollSettleRef.current);

        // Phase 1 — jump react-window to last item right away
        listRef.current?.resetAfterIndex(0, false);
        listRef.current?.scrollToItem(rows.length - 1, 'end');

        // Phase 2 — wait for ResizeObserver measurements to settle, then pin to true bottom
        scrollSettleRef.current = setTimeout(() => {
            listRef.current?.resetAfterIndex(0, false);
            listRef.current?.scrollToItem(rows.length - 1, 'end');
            requestAnimationFrame(() => {
                const outer = outerRef.current;
                if (outer) outer.scrollTop = outer.scrollHeight;
                distanceFromBottomRef.current = 0;
                // Extra frame to catch any late-measuring rows (images etc.)
                requestAnimationFrame(() => {
                    if (outer) outer.scrollTop = outer.scrollHeight;
                    setListVisible(true);
                });
            });
        }, 250);
    }, [rows.length]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Auto-scroll on new incoming/outgoing message ──────────────────────
    const prevMsgCountRef = useRef(0);
    // Count only real message rows — ignore typing/spacer/date rows
    const msgRowCount = useMemo(
        () => rows.filter(r => r.type === 'message').length,
        [rows]
    );

    useEffect(() => {
        const prev = prevMsgCountRef.current;
        const curr = msgRowCount;
        prevMsgCountRef.current = curr;

        if (!didInitialScroll.current || curr <= prev || curr === 0) return;

        const outer = outerRef.current;
        if (!outer) return;

        // Check if the last real message is outgoing
        const lastMsgRow = [...rows].reverse().find(r => r.type === 'message');
        const isOutgoing = lastMsgRow?.msg?.Direction === 1;

        // Calculate distance from bottom; be more forgiving when pinned
        const isNearBottom = distanceFromBottomRef.current < 250;

        if (isOutgoing || isNearBottom) {
            // Use smooth behavior for new messages to feel "premium"
            requestAnimationFrame(() => {
                const o = outerRef.current;
                if (o) {
                    o.scrollTo({
                        top: o.scrollHeight,
                        behavior: 'smooth'
                    });
                }
            });
            setShowScrollBtn(false);
        }
    }, [msgRowCount, rows]);

    // ── Expose scroll container ───────────────────────────────────────────
    useEffect(() => {
        if (outerRef.current) containerRef.current = outerRef.current;
    });

    // ── Measure wrapper height ────────────────────────────────────────────
    useEffect(() => {
        const el = wrapperRef.current;
        if (!el) return;
        setListHeight(el.clientHeight || el.offsetHeight || 600);
        const ro = new ResizeObserver(([entry]) => {
            const h = entry.contentRect.height;
            if (h > 0) setListHeight(h);
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    useEffect(() => {
        if (mediaFiles?.length > 0) setShowMedia(false);
    }, [mediaFiles, setShowMedia]);

    const closeReactionMenu = useCallback(() => {
        setReactionMenuAnchorEl(null);
        setReactionMenuMessageId(null);
    }, []);

    const messageById = useMemo(() => {
        const map = new Map();
        Object.values(groupMessagesByDate || {}).forEach((arr) => {
            if (!Array.isArray(arr)) return;
            arr.forEach((m) => {
                const key = m?.Id ?? m?.MessageId;
                if (key != null) map.set(key, m);
            });
        });
        return map;
    }, [groupMessagesByDate]);

    const getMessageStatusIcon = useCallback(
        (msg) => getMessageStatusIconProp ? getMessageStatusIconProp(msg) : null,
        [getMessageStatusIconProp]
    );

    // ── Drag-and-drop ─────────────────────────────────────────────────────
    const handleDragEnter = useCallback((e) => {
        e.preventDefault(); e.stopPropagation();
        // Only trigger overlay for actual external files
        const isFile = e.dataTransfer.types?.includes('Files');
        if (!isFile) return;

        dragCounter.current++;
        if (e.dataTransfer.items?.length > 0) setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault(); e.stopPropagation();
        const isFile = e.dataTransfer.types?.includes('Files');
        if (!isFile) return;

        if (--dragCounter.current === 0) setIsDragging(false);
    }, []);

    const handleDragOver = useCallback((e) => {
        e.preventDefault(); e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault(); e.stopPropagation();
        const isFile = e.dataTransfer.types?.includes('Files');

        if (isFile) {
            setIsDragging(false);
            dragCounter.current = 0;
            if (e.dataTransfer.files?.length > 0) {
                captureMessageScrollState?.();
                processFiles?.(Array.from(e.dataTransfer.files));
                e.dataTransfer.clearData();
            }
        }
    }, [processFiles, captureMessageScrollState]);

    const handlePaste = useCallback((e) => {
        if (e.clipboardData?.files?.length > 0) {
            captureMessageScrollState?.();
            processFiles?.(Array.from(e.clipboardData.files));
        }
    }, [processFiles, captureMessageScrollState]);

    const itemData = useMemo(() => ({
        rows, setSize, auth, handlePaste, selectedCustomer, blinkMessageId,
        hoveredMessageId, setHoveredMessageId, reactionMenuMessageId,
        reactionMenuAnchorEl, setReactionMenuAnchorEl, setReactionMenuMessageId,
        closeReactionMenu, handleMessageEmojiClick, handleMenuClick,
        handleContextMenu, scrollToMessage, containerRef, parseTemplateData,
        getMediaKey, getMediaSrcForMessage, loadedMedia, markLoaded,
        handleMediaClick, getMessageStatusIcon, handleRemoveReaction,
        messageById, handleForward, setDrawerViewState, setDrawerOpen,
        formatDateHeader, typingStatus,
    }), [
        rows, setSize, auth, handlePaste, selectedCustomer, blinkMessageId,
        hoveredMessageId, reactionMenuMessageId, reactionMenuAnchorEl,
        closeReactionMenu, handleMessageEmojiClick, handleMenuClick,
        handleContextMenu, scrollToMessage, containerRef, parseTemplateData,
        getMediaKey, getMediaSrcForMessage, loadedMedia, markLoaded,
        handleMediaClick, getMessageStatusIcon, handleRemoveReaction,
        messageById, handleForward, setDrawerViewState, setDrawerOpen,
        formatDateHeader, typingStatus,
    ]);

    const isEmpty = !groupMessagesByDate || Object.keys(groupMessagesByDate).length === 0;
    const showLoader = !listVisible || (loading && isEmpty);

    return (
        <div
            className="messages-area"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onPaste={handlePaste}
            onContextMenu={(e) => {
                if (isMediaPreviewOpen) return;
                e.preventDefault();
                setContextMenu({ mouseX: e.clientX + 2, mouseY: e.clientY + 2 });
            }}
            style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}
        >
            <DragDropOverlay isDragging={isDragging} />

            {/* Smooth loader — fades out once list is ready at exact bottom */}
            <Box sx={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                display: 'flex', flexDirection: 'column', justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: 'rgba(249, 250, 251, 0.97)',
                zIndex: 20, gap: 2,
                opacity: showLoader ? 1 : 0,
                pointerEvents: showLoader ? 'all' : 'none',
                transition: 'opacity 0.35s ease',
            }}>
                <CircularProgress size={40} thickness={3.5} sx={{ color: 'primary.main', opacity: 0.8 }} />
                <Typography variant="body2" color="textSecondary" sx={{ fontWeight: 500, opacity: 0.65 }}>
                    Loading messages...
                </Typography>
            </Box>

            {loadingOlder && (
                <Box sx={{
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    gap: 1, py: 0.75, flexShrink: 0,
                    backgroundColor: 'rgba(249, 250, 251, 0.92)',
                    borderBottom: '1px solid rgba(0,0,0,0.06)',
                }}>
                    <CircularProgress size={16} thickness={5} />
                    <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 500 }}>
                        Loading older messages…
                    </Typography>
                </Box>
            )}

            <ScrollToBottomButton
                open={listVisible && showScrollBtn}
                onClick={() => {
                    listRef.current?.scrollToItem(rows.length - 1, 'end');
                    requestAnimationFrame(() => {
                        const o = outerRef.current;
                        if (o) o.scrollTop = o.scrollHeight;
                    });
                    scrollToBottom?.('smooth');
                }}
                right={scrollToBottomRightOffset ?? 30}
                bottom={scrollToBottomBotOffset}
            />

            {/* List — invisible until scrolled to exact bottom, then fades in */}
            <div
                ref={wrapperRef}
                style={{
                    flex: 1,
                    minHeight: 0,
                    opacity: listVisible ? 1 : 0,
                    transition: 'opacity 0.3s ease',
                    pointerEvents: isMediaPreviewOpen ? 'none' : 'auto',
                    filter: isMediaPreviewOpen ? 'blur(2px)' : 'none',
                    backgroundImage: 'linear-gradient(rgba(249, 250, 251, 0.80), rgba(249, 250, 251, 0.80)), url(/icons/bg-3.jpg)',
                    backgroundSize: 'auto, contain',
                    backgroundPosition: 'center, center',
                    backgroundRepeat: 'repeat, repeat',
                    backgroundAttachment: 'scroll, scroll',
                }}
            >
                {listHeight > 0 && (
                    <List
                        ref={listRef}
                        outerRef={outerRef}
                        height={listHeight}
                        itemCount={rows.length}
                        itemSize={getSize}
                        itemData={itemData}
                        width="100%"
                        overscanCount={8}
                        onScroll={onListScroll}
                        style={{ willChange: 'transform', outline: 'none' }}
                    >
                        {VirtualRow}
                    </List>
                )}
            </div>

            {isMediaPreviewOpen && (
                <MediaPreview
                    mediaFiles={mediaFiles}
                    scrollToBottom={scrollToBottom}
                    setMediaFiles={setMediaFiles}
                    handleClosePreview={handleClosePreview}
                    handleSendMessage={handleSendMessage}
                />
            )}
        </div>
    );
};

export default React.memo(MessageArea);
