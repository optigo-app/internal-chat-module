import React, { useState, useEffect, memo, useRef, useCallback } from 'react'
import ReplyPreview from '../ReplyToComponents/ReplyPreview'
import { IconButton, Box, Paper, TextField, Typography } from '@mui/material'
import AttachFile from '@mui/icons-material/AttachFile'
import { SendHorizontal, Smile } from 'lucide-react'
import { emitInternalTyping } from '../../socket'
import { LoginContext } from '../../context/LoginData'
import { useContext } from 'react'
import { toast } from 'react-hot-toast'
import AttachmentMenu from '../chat/input/AttachmentMenu'
import EmojiPickerPopper from '../chat/input/EmojiPickerPopper'
import ChatStatusNotice from '../chat/input/ChatStatusNotice'
import ConfirmationDialog from '../ReusableComponent/ConfirmationDialog'
import FormattingToolbar from '../chat/input/FormattingToolbar'
import LexicalChatEditor from '../chat/input/LexicalChatEditor'
import { CLEAR_EDITOR_COMMAND, FORMAT_TEXT_COMMAND, $getSelection, $isRangeSelection, $getRoot, $createParagraphNode, $createTextNode } from 'lexical'

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
    fetchAndCacheGroupMembers,
    updateLatestInput
}) => {
    const inputRef = useRef(null);
    const lexicalEditorRef = useRef(null);
    const attachButtonRef = useRef(null);
    const emojiButtonRef = useRef(null);
    const [editorWrapperEl, setEditorWrapperEl] = useState(null);
    const showOnlyAdminNotice = isOnlyAdminSend && !isCurrentUserAdmin;

    useEffect(() => {
        if (replyToMessage?.id !== "" && lexicalEditorRef.current && !showOnlyAdminNotice && !isRemovedFromGroup) {
            lexicalEditorRef.current.focus();
        }
    }, [replyToMessage, showOnlyAdminNotice, isRemovedFromGroup]);

    // Focus input when conversation changes
    useEffect(() => {
        if (selectedCustomer?.ConversationId && lexicalEditorRef.current && !showOnlyAdminNotice && !isRemovedFromGroup) {
            lexicalEditorRef.current.focus();
        }
    }, [selectedCustomer?.ConversationId, showOnlyAdminNotice, isRemovedFromGroup]);

    const [tempQuery, setTempQuery] = useState(inputValue || '')
    const activeConversationIdRef = useRef(selectedCustomer?.ConversationId)
    const typingTimeoutRef = useRef(null)
    const { auth } = useContext(LoginContext)

    const [showFileConfirm, setShowFileConfirm] = useState(false);
    const [pendingPastedText, setPendingPastedText] = useState(null);
    const [pendingFileName, setPendingFileName] = useState('');
    const [showFormattingToolbar, setShowFormattingToolbar] = useState(false);
    const [toolbarPosition, setToolbarPosition] = useState({ top: 0, left: 0 });

    const MAX_CHARS = 2000;
    const WARNING_THRESHOLD = 1000;
    const charCount = tempQuery.length;
    const isNearLimit = charCount >= WARNING_THRESHOLD;
    const isAtLimit = charCount >= MAX_CHARS;

    const lastTypingEmitRef = useRef(0);

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
    }, [selectedCustomer, auth, fetchAndCacheGroupMembers]);

    const onLexicalChange = useCallback((markdown) => {
        let val = markdown;
        if (/^\s/.test(val)) {
            val = val.trimStart();
        }
        if (val.length > MAX_CHARS) {
            val = val.slice(0, MAX_CHARS);
        }
        setTempQuery(val);
        if (updateLatestInput) updateLatestInput(val);
        setInputValue(val);
        
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
    }, [handleTyping, setInputValue, updateLatestInput]);

    useEffect(() => {
        if (!inputValue && lexicalEditorRef.current) {
            lexicalEditorRef.current.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined);
        }
    }, [inputValue]);

    // Capture-phase paste interceptor to catch large text before Lexical processes it
    useEffect(() => {
        if (!editorWrapperEl) return;
        const handler = (e) => {
            const text = e.clipboardData?.getData('text') || '';
            if (text.length > MAX_CHARS) {
                e.preventDefault();
                e.stopPropagation();
                setPendingPastedText(text);
                setPendingFileName(`pasted-content-${Date.now()}.txt`);
                setShowFileConfirm(true);
            }
        };
        editorWrapperEl.addEventListener('paste', handler, true);
        return () => editorWrapperEl.removeEventListener('paste', handler, true);
    }, [editorWrapperEl]);

    const handlePaste = useCallback((e) => {
        // Handle files pasting
        if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
            const files = Array.from(e.clipboardData.files);
            if (captureMessageScrollState) captureMessageScrollState();
            if (processFiles) processFiles(files);
            // We don't preventDefault here to allow text that might be pasted alongside files
        }

        // Handle text pasting
        const pastedText = e.clipboardData.getData('text');
        if (pastedText) {
            // Check if pasted text exceeds max character limit
            if (pastedText.length > MAX_CHARS) {
                e.preventDefault();
                e.nativeEvent.stopImmediatePropagation();
                setPendingPastedText(pastedText);
                setPendingFileName(`pasted-content-${Date.now()}.txt`);
                setShowFileConfirm(true);
                return;
            }

            // Handle text pasting with trimming (including newlines)
            if (pastedText !== pastedText.trim()) {
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
                if (updateLatestInput) updateLatestInput(newValue);

                // Set cursor position after the pasted trimmed text
                setTimeout(() => {
                    if (input) {
                        input.selectionStart = input.selectionEnd = start + trimmedText.length;
                    }
                }, 0);
            }
        }
    }, [processFiles, captureMessageScrollState, tempQuery, setInputValue, updateLatestInput]);

    const handleConfirmFileConversion = useCallback(() => {
        if (!pendingPastedText) return;

        const safeFileName = pendingFileName?.trim() || `pasted-content-${Date.now()}.txt`;
        const fileNameWithExt = safeFileName.endsWith('.txt') ? safeFileName : `${safeFileName}.txt`;

        // Create a TXT file with the pasted content
        const file = new File(
            [pendingPastedText],
            fileNameWithExt,
            { type: "text/plain" }
        );

        // Add file to attachments
        if (processFiles) {
            processFiles([file]);
            if (captureMessageScrollState) captureMessageScrollState();
        }

        // Show notification to user
        toast.success(`Text converted to file (${pendingPastedText.length} characters exceeded ${MAX_CHARS} limit)`);

        // Clear any leaked text from editor
        setTempQuery('');
        if (lexicalEditorRef.current) {
            lexicalEditorRef.current.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined);
        }

        // Reset state
        setPendingPastedText(null);
        setPendingFileName('');
        setShowFileConfirm(false);
    }, [pendingPastedText, pendingFileName, processFiles, captureMessageScrollState, MAX_CHARS, setTempQuery]);

    const handleFormatText = useCallback((formatId) => {
        if (lexicalEditorRef.current) {
            lexicalEditorRef.current.dispatchCommand(FORMAT_TEXT_COMMAND, formatId);
        }
    }, []);

    const handleSelectionChange = useCallback(() => {
        const selection = window.getSelection();
        const hasSelection = selection.rangeCount > 0 && !selection.isCollapsed;
        
        if (hasSelection) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            // Ensure the selection is within the lexical editor
            const editorContainer = document.querySelector('.lexical-editor-container');
            if (editorContainer && editorContainer.contains(range.startContainer)) {
                setToolbarPosition({
                    top: rect.top - 50,
                    left: rect.left + rect.width / 2
                });
                setShowFormattingToolbar(true);
                return;
            }
        }
        setShowFormattingToolbar(false);
    }, []);

    useEffect(() => {
        const currentConversationId = selectedCustomer?.ConversationId;
        if (activeConversationIdRef.current !== currentConversationId) {
            activeConversationIdRef.current = currentConversationId;
            let draft = '';
            try {
                const storageKey = auth?.id ? `chat_drafts_${auth.id}` : 'chat_drafts';
                const saved = localStorage.getItem(storageKey);
                const drafts = saved ? JSON.parse(saved) : {};
                draft = currentConversationId ? drafts[currentConversationId] || '' : '';
            } catch {
                draft = '';
            }
            setTempQuery(draft);
            if (lexicalEditorRef.current) {
                if (!draft) {
                    lexicalEditorRef.current.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined);
                }
            }
            return;
        }
        setTempQuery(inputValue || '');
    }, [inputValue, selectedCustomer?.ConversationId, auth?.id]);

    const onEmojiClick = (emojiData) => {
        const emoji = emojiData?.emoji || '';
        
        if (lexicalEditorRef.current) {
            // Let the text change plugin sync it naturally by inserting text
            lexicalEditorRef.current.update(() => {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                    selection.insertText(emoji);
                } else {
                    const root = $getRoot();
                    let p = root.getLastChild();
                    if (!p) {
                        p = $createParagraphNode();
                        root.append(p);
                    }
                    p.append($createTextNode(emoji));
                }
            });
            lexicalEditorRef.current.focus();
        } else {
            setTempQuery((prev) => {
                const next = prev + emoji;
                setInputValue(next);
                if (updateLatestInput) updateLatestInput(next);
                return next;
            });
        }
        
        handleTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            handleTyping(false);
        }, 1000);
    };

    // =========================================================
    // UNIFIED SMART KEYDOWN CONTROLLER (WHATSAPP-STYLE LISTS) 👇
    // =========================================================
    const handleInputKeyDown = useCallback((e) => {
        if (e.key === 'Enter') {
            // Native Lexical handles newlines with Shift+Enter or implicitly, 
            // but if we hook into onKeyDown from our plugin without Shift, we submit.
            e.preventDefault();
            
            if (tempQuery.trim() || (mediaFiles && mediaFiles.length > 0)) {
                setInputValue(tempQuery);
                if (updateLatestInput) updateLatestInput('');
                handleSendMessage(tempQuery);
                setTempQuery('');
                
                if (lexicalEditorRef.current) {
                    lexicalEditorRef.current.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined);
                }
            }
        }
    }, [tempQuery, mediaFiles, handleSendMessage, setInputValue, updateLatestInput]);

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

                    {showFormattingToolbar && (
                        <FormattingToolbar
                            editorRef={lexicalEditorRef}
                            position={toolbarPosition}
                        />
                    )}

                    <div ref={setEditorWrapperEl} style={{ flexGrow: 1, width: '100%' }} onMouseUp={handleSelectionChange} onKeyUp={handleSelectionChange}>
                        <LexicalChatEditor
                            value={tempQuery}
                            syncKey={selectedCustomer?.ConversationId}
                            hasDraft={Boolean(tempQuery?.trim())}
                            onChange={onLexicalChange}
                            onPaste={handlePaste}
                            onKeyDown={handleInputKeyDown}
                            placeholder={
                                mediaFiles?.length > 0
                                    ? 'Type a caption...'
                                    : 'Type a message...'
                            }
                            editorRef={lexicalEditorRef}
                        />
                    </div>

                    {charCount > 0 && (
                        <Typography
                            variant="caption"
                            sx={{
                                position: 'absolute',
                                bottom: '-20px',
                                right: '50px',
                                fontSize: '11px',
                                color: isAtLimit ? '#ef4444' : isNearLimit ? '#f59e0b' : 'text.secondary',
                                fontWeight: isAtLimit ? 600 : 400,
                                transition: 'color 0.2s ease-in-out'
                            }}
                        >
                            {charCount}/{MAX_CHARS}
                        </Typography>
                    )}

                    <IconButton
                        onClick={() => {
                            if (tempQuery.trim() || (mediaFiles && mediaFiles.length > 0)) {
                                setInputValue(tempQuery)
                                if (updateLatestInput) updateLatestInput('')
                                handleSendMessage(tempQuery)
                                setTempQuery('')
                                if (lexicalEditorRef.current) {
                                    lexicalEditorRef.current.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined);
                                }
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

            <ConfirmationDialog
                isOpen={showFileConfirm}
                onClose={() => {
                    setShowFileConfirm(false);
                    setPendingPastedText(null);
                    setPendingFileName('');
                }}
                onConfirm={handleConfirmFileConversion}
                title="Convert to File"
                description="Your message is too long for chat display./nIt will be sent as a text file attachment."
                confirmText="Convert to File"
                cancelText="Cancel"
                variant="primary"
            >
                <TextField
                    label="File Name"
                    value={pendingFileName}
                    onChange={(e) => setPendingFileName(e.target.value)}
                    fullWidth
                    size="small"
                    sx={{ mt: 1, mb: 2 }}
                    autoFocus
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            handleConfirmFileConversion();
                        }
                    }}
                />
            </ConfirmationDialog>
        </div>
    )
}

export default memo(ChatBox)