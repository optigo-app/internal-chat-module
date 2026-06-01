import React, { useState, useEffect, memo, useRef, useCallback } from 'react'
import ReplyPreview from '../ReplyToComponents/ReplyPreview'
import { IconButton, Box, Paper, TextField } from '@mui/material'
import AttachFile from '@mui/icons-material/AttachFile'
import { SendHorizontal, Smile } from 'lucide-react'
import { emitInternalTyping } from '../../socket'
import { LoginContext } from '../../context/LoginData'
import { useContext } from 'react'
import AttachmentMenu from '../chat/input/AttachmentMenu'
import EmojiPickerPopper from '../chat/input/EmojiPickerPopper'
import ChatStatusNotice from '../chat/input/ChatStatusNotice'

const ChatBox = ({
    mediaFiles,
    replyToMessage,
    handleCancelReply,
    handleAttachClick,
    toggleEmojiPicker,
    showPicker,
    emojiPickerRef,
    showMedia,
    fileInputRef,
    openFilePicker,
    imageParams,
    videoParams,
    docsParams,
    handleFileChange,
    inputValue,
    setInputValue,
    handleKeyPress,
    handleSendMessage,
    isRemovedFromGroup = false,
    isOnlyAdminSend = false,
    isCurrentUserAdmin = false,
    selectedCustomer,
    processFiles,
    captureMessageScrollState,
    groupMembers,
    fetchAndCacheGroupMembers
}) => {
    const inputRef = useRef(null);
    const attachButtonRef = useRef(null);
    const emojiButtonRef = useRef(null);
    const showOnlyAdminNotice = isOnlyAdminSend && !isCurrentUserAdmin;

    useEffect(() => {
        if (replyToMessage?.id !== "" && inputRef.current && !showOnlyAdminNotice && !isRemovedFromGroup) {
            inputRef.current.focus();
        }
    }, [replyToMessage, showOnlyAdminNotice, isRemovedFromGroup]);

    // Focus input when conversation changes
    useEffect(() => {
        if (selectedCustomer?.ConversationId && inputRef.current && !showOnlyAdminNotice && !isRemovedFromGroup) {
            inputRef.current.focus();
        }
    }, [selectedCustomer?.ConversationId, showOnlyAdminNotice, isRemovedFromGroup]);

    const [tempQuery, setTempQuery] = useState(inputValue || '')
    const prevInputValueRef = useRef(inputValue)
    const typingTimeoutRef = useRef(null)
    const { auth } = useContext(LoginContext)

    const lastTypingEmitRef = useRef(0);

    const onInputChange = (e) => {
        let val = e.target.value;
        // Prevent leading whitespace (spaces, newlines, tabs, etc.)
        if (/^\s/.test(val)) {
            val = val.trimStart();
        }
        setTempQuery(val);
        
        // Sync typing status
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        const now = Date.now();
        if (now - lastTypingEmitRef.current > 1000) {
            handleTyping(true);
            lastTypingEmitRef.current = now;
        }
        typingTimeoutRef.current = setTimeout(() => {
            handleTyping(false);
            lastTypingEmitRef.current = 0;
        }, 1000);
    };

    // Sync with parent state for drafts and media preview with debounce
    // This prevents the entire Conversation component from re-rendering on every keystroke
    useEffect(() => {
        if (tempQuery === inputValue) return;

        const syncTimeout = setTimeout(() => {
            setInputValue(tempQuery);
        }, 800); // Sync after 800ms of inactivity

        return () => clearTimeout(syncTimeout);
    }, [tempQuery, setInputValue, inputValue]);

    const handlePaste = useCallback((e) => {
        // Handle files pasting
        if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
            const files = Array.from(e.clipboardData.files);
            if (captureMessageScrollState) captureMessageScrollState();
            if (processFiles) processFiles(files);
            // We don't preventDefault here to allow text that might be pasted alongside files
        }

        // Handle text pasting with trimming (including newlines)
        const pastedText = e.clipboardData.getData('text');
        if (pastedText && pastedText !== pastedText.trim()) {
            e.preventDefault();
            const trimmedText = pastedText.trim();
            
            const input = e.target;
            const start = input.selectionStart || 0;
            const end = input.selectionEnd || 0;
            const textBefore = tempQuery.substring(0, start);
            const textAfter = tempQuery.substring(end);
            
            const newValue = textBefore + trimmedText + textAfter;
            setTempQuery(newValue);
            setInputValue(newValue);

            // Set cursor position after the pasted trimmed text
            setTimeout(() => {
                if (input) {
                    input.selectionStart = input.selectionEnd = start + trimmedText.length;
                }
            }, 0);
        }
    }, [processFiles, captureMessageScrollState, tempQuery, setInputValue]);

    const handleTyping = useCallback(async (isTyping) => {
        if (!selectedCustomer?.ConversationId || !auth) return;
        const senderId = auth?.id || auth?.userId;
        const isGroup = selectedCustomer?.IsGroup == 1;
        let receiverIdValue;
        if (isGroup) {
            try {
                const groupData = await fetchAndCacheGroupMembers(selectedCustomer.ConversationId);
                const memberIds = (groupData?.members || []).map(m => Number(m.UserId || m.userId || m.id)).filter(Boolean);
                receiverIdValue = memberIds.length > 0 ? memberIds : [];
            } catch (error) {
                console.error('Error fetching group members for typing status:', error);
                receiverIdValue = [];
            }
        } else {
            receiverIdValue = selectedCustomer.ReceiverId || selectedCustomer.UserId || selectedCustomer.CustomerId;
        }
        emitInternalTyping({
            ConversationId: selectedCustomer.ConversationId,
            SenderId: senderId,
            ReceiverId: receiverIdValue,
            IsGroup: isGroup ? 1 : 0,
            UserName: auth?.username || auth?.name,
            ProfileImageUrl: auth?.ProfileImageUrl || auth?.profileImage || auth?.AvatarUrl || '',
            ProfileImage: auth?.ProfileImage || auth?.profileImage || auth?.AvatarUrl || '',
            ufcc: auth?.ufcc,
            isTyping: isTyping
        });
    }, [selectedCustomer, auth]);

    useEffect(() => {
        if (inputValue !== tempQuery) {
            setTempQuery(inputValue || '');
        }
    }, [inputValue]);

    const onEmojiClick = (emojiData) => {
        const emoji = emojiData?.emoji || '';
        setTempQuery((prev) => {
            const newVal = prev + emoji;
            handleTyping(true);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                handleTyping(false);
            }, 1000);
            return newVal;
        });
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };


    return (
        <div className="message-input-area">
            {replyToMessage && (
                <ReplyPreview key={replyToMessage?.Id || 'reply'} message={replyToMessage} onCancel={handleCancelReply} />
            )}

            <ChatStatusNotice
                isRemovedFromGroup={isRemovedFromGroup}
                isOnlyAdminSend={isOnlyAdminSend}
                isCurrentUserAdmin={isCurrentUserAdmin}
            />

            {!isRemovedFromGroup && (!isOnlyAdminSend || isCurrentUserAdmin) && (
                <div className="input-container">
                    <IconButton ref={attachButtonRef} size="small" className="attach-button" onClick={handleAttachClick}>
                        <AttachFile />
                    </IconButton>

                    <IconButton ref={emojiButtonRef} size="small" className="attach-button" onClick={toggleEmojiPicker}>
                        <Smile />
                    </IconButton>

                    <EmojiPickerPopper
                        open={showPicker}
                        anchorEl={emojiButtonRef.current}
                        onEmojiClick={onEmojiClick}
                        onClose={toggleEmojiPicker}
                    />

                    <AttachmentMenu
                        anchorEl={attachButtonRef.current}
                        open={Boolean(attachButtonRef.current) && Boolean(showMedia)}
                        onClose={handleAttachClick}
                        onFilePick={(e, params) => {
                            handleAttachClick(e);
                            openFilePicker(e, params);
                        }}
                        imageParams={imageParams}
                        videoParams={videoParams}
                        docsParams={docsParams}
                    />

                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                        multiple
                    />

                    <TextField
                        fullWidth
                        inputRef={inputRef}
                        multiline
                        autoFocus={replyToMessage?.Id !== '' ? true : false}
                        maxRows={4}
                        value={tempQuery}
                        onChange={onInputChange}
                        onPaste={handlePaste}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                // Pass the current value directly to avoid async state issues
                                if (tempQuery.trim() || (mediaFiles && mediaFiles.length > 0)) {
                                    setInputValue(tempQuery)
                                    // Call handleSendMessage directly with tempQuery
                                    handleSendMessage(tempQuery)
                                    setTempQuery('')
                                }
                            }
                        }}
                        placeholder={
                            mediaFiles?.length > 0
                                ? 'Type a caption...'
                                : 'Type a message...'
                        }
                        variant="outlined"
                        size="small"
                        className="message-input"
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: '24px',
                                backgroundColor: '#f9fafb',
                            },
                        }}
                    />

                    <IconButton
                        onClick={() => {
                            if (tempQuery.trim() || (mediaFiles && mediaFiles.length > 0)) {
                                setInputValue(tempQuery)
                                // Pass tempQuery directly to handleSendMessage
                                handleSendMessage(tempQuery)
                                setTempQuery('')
                            }
                        }}
                        disabled={!tempQuery.trim() && (!mediaFiles || mediaFiles.length === 0)}
                        className="send-button"
                        color="primary"
                    >
                        <SendHorizontal style={{ marginLeft: '2px' }} />
                    </IconButton>
                </div>
            )}
        </div>
    )
}

export default memo(ChatBox)
