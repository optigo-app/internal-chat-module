import React, { useMemo, useState, useEffect, memo, useRef } from 'react'
import ReplyPreview from '../ReplyToComponents/ReplyPreview'
import { IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Popper, Paper, Box } from '@mui/material'
import AttachFile from '@mui/icons-material/AttachFile'
import ImageIcon from '@mui/icons-material/Image'
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import EmojiPicker from 'emoji-picker-react'
import TextField from '@mui/material/TextField'
import { SendHorizontal, Smile } from 'lucide-react'
import debounce from 'lodash.debounce'

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
    handleSendMessage
}) => {
    const inputRef = useRef(null);
    const attachButtonRef = useRef(null);
    const emojiButtonRef = useRef(null);
    const [emojiPickerPlacement, setEmojiPickerPlacement] = useState('top-start');
    const [emojiPickerHeight, setEmojiPickerHeight] = useState(400);

    // ✅ Focus whenever replyToMessage becomes true
    useEffect(() => {
        if (replyToMessage?.id !== "" && inputRef.current) {
            inputRef.current.focus();
        }
    }, [replyToMessage]);

    const [tempQuery, setTempQuery] = useState(inputValue || '')

    // ✅ Debounce updates to parent setInputValue (100ms after typing stops)
    const debouncedUpdateInputValue = useMemo(
        () =>
            debounce((value) => {
                setInputValue(value)
            }, 100),
        [setInputValue]
    )

    useEffect(() => {
        debouncedUpdateInputValue(tempQuery)
        return () => {
            debouncedUpdateInputValue.cancel()
        }
    }, [tempQuery, debouncedUpdateInputValue])

    const onEmojiClick = (emojiData) => {
        const emoji = emojiData?.emoji || '';
        setTempQuery((prev) => prev + emoji);

        // keep the cursor in input
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    useEffect(() => {
        if (!showPicker || !emojiButtonRef.current) return;

        const recompute = () => {
            if (!emojiButtonRef.current) return;

            const rect = emojiButtonRef.current.getBoundingClientRect();
            const vh = window.innerHeight || 0;
            const margin = 12;
            const chrome = 56;
            const maxH = 400;
            const minH = 200;

            const availableDown = Math.max(0, vh - rect.bottom - margin);
            const availableUp = Math.max(0, rect.top - margin);

            const fitDown = Math.max(0, Math.min(maxH, availableDown - chrome));
            const fitUp = Math.max(0, Math.min(maxH, availableUp - chrome));

            const openDown = fitDown >= fitUp;
            setEmojiPickerPlacement(openDown ? 'bottom-start' : 'top-start');
            setEmojiPickerHeight(Math.max(minH, openDown ? fitDown : fitUp));
        };

        recompute();
        window.addEventListener('resize', recompute);
        // capture scroll from any scroll parent
        window.addEventListener('scroll', recompute, true);

        return () => {
            window.removeEventListener('resize', recompute);
            window.removeEventListener('scroll', recompute, true);
        };
    }, [showPicker]);

    return (
        <div className="message-input-area">
            {replyToMessage && (
                <ReplyPreview message={replyToMessage} onCancel={handleCancelReply} />
            )}

            <div className="input-container">
                <IconButton ref={attachButtonRef} size="small" className="attach-button" onClick={handleAttachClick}>
                    <AttachFile />
                </IconButton>

                <IconButton ref={emojiButtonRef} size="small" className="attach-button" onClick={toggleEmojiPicker}>
                    <Smile />
                </IconButton>

                {showPicker && (
                    <Popper
                        open={showPicker}
                        anchorEl={emojiButtonRef.current}
                        placement={emojiPickerPlacement}
                        disablePortal={false}
                        strategy="fixed"
                        modifiers={[
                            { name: 'offset', options: { offset: [0, 10] } },
                            {
                                name: 'flip',
                                options: {
                                    padding: 12,
                                    fallbackPlacements: ['top-start', 'bottom-start', 'top-end', 'bottom-end'],
                                },
                            },
                            { name: 'preventOverflow', options: { padding: 12, altAxis: true, boundary: 'viewport' } },
                        ]}
                        sx={{ zIndex: (theme) => theme.zIndex.modal + 30 }}
                    >
                        <Paper
                            ref={emojiPickerRef}
                            elevation={0}
                            sx={{
                                borderRadius: 2.5,
                                overflow: 'hidden',
                                boxShadow: '0px 12px 30px rgba(0,0,0,0.12)',
                                maxWidth: 'min(350px, calc(100vw - 24px))',
                                maxHeight: 'calc(100vh - 24px)',
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Box sx={{ width: 350, maxWidth: '100%' }}>
                                <EmojiPicker
                                    onEmojiClick={onEmojiClick}
                                    width="100%"
                                    height={emojiPickerHeight}
                                    searchDisabled={false}
                                    skinTonesDisabled={true}
                                    previewConfig={{ showPreview: true }}
                                    emojiStyle="apple"
                                />
                            </Box>
                        </Paper>
                    </Popper>
                )}

                <Menu
                    anchorEl={attachButtonRef.current}
                    open={Boolean(attachButtonRef.current) && Boolean(showMedia)}
                    onClose={handleAttachClick}
                    onClick={(e) => e.stopPropagation()}
                    sx={{ zIndex: (theme) => theme.zIndex.modal + 20 }}
                    PaperProps={{
                        elevation: 0,
                        sx: {
                            minWidth: 200,
                            borderRadius: 2,
                            py: 0.5,
                            mb: 1,
                            boxShadow: "0px 6px 18px rgba(0,0,0,0.12), 0px 3px 6px rgba(0,0,0,0.08)",
                        },
                    }}
                    transformOrigin={{ horizontal: 'left', vertical: 'bottom' }}
                    anchorOrigin={{ horizontal: 'left', vertical: 'top' }}
                >
                    <MenuItem
                        onClick={(e) => {
                            handleAttachClick(e);
                            openFilePicker(e, imageParams);
                        }}
                        sx={{ py: 1.1, px: 2, borderRadius: 1.5 }}
                    >
                        <ListItemIcon sx={{ minWidth: '34px', color: '#0046FF' }}>
                            <ImageIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="Photo" />
                    </MenuItem>

                    <MenuItem
                        onClick={(e) => {
                            handleAttachClick(e);
                            openFilePicker(e, videoParams);
                        }}
                        sx={{ py: 1.1, px: 2, borderRadius: 1.5 }}
                    >
                        <ListItemIcon sx={{ minWidth: '34px', color: '#FF8040' }}>
                            <VideoLibraryIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="Video" />
                    </MenuItem>

                    <MenuItem
                        onClick={(e) => {
                            handleAttachClick(e);
                            openFilePicker(e, docsParams);
                        }}
                        sx={{ py: 1.1, px: 2, borderRadius: 1.5 }}
                    >
                        <ListItemIcon sx={{ minWidth: '34px', color: '#9929EA' }}>
                            <InsertDriveFileIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="Document" />
                    </MenuItem>
                </Menu>

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
                    onChange={(e) => setTempQuery(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleKeyPress(e)
                            setTempQuery('')
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
                        handleSendMessage()
                        setTempQuery('')
                    }}
                    disabled={!tempQuery.trim() && (!mediaFiles || mediaFiles.length === 0)}
                    className="send-button"
                    color="primary"
                >
                    <SendHorizontal style={{ marginLeft: '2px' }} />
                </IconButton>
            </div>
        </div>
    )
}

export default memo(ChatBox)
