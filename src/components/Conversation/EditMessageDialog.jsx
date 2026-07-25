import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    IconButton,
    Box,
    Typography,
    Popper,
    Paper,
    ClickAwayListener,
    Grow,
    useTheme,
    useMediaQuery
} from '@mui/material';
import { X, Smile } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import LexicalChatEditor from '../chat/input/LexicalChatEditor';
import FormattingToolbar from '../chat/input/FormattingToolbar';
import { normalizeMessageText } from '../../utils/globalFunc';
import { $getSelection, $isRangeSelection, $getRoot, $createParagraphNode, $createTextNode } from 'lexical';

const EditMessageDialog = ({ open, onClose, onSave, originalMessage }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isLarge = useMediaQuery(theme.breakpoints.up('lg'));
    const dialogMaxWidth = isLarge ? 'lg' : 'md';

    const [editText, setEditText] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showFormattingToolbar, setShowFormattingToolbar] = useState(false);
    const [toolbarPosition, setToolbarPosition] = useState({ top: 0, left: 0 });
    const editEditorRef = useRef(null);
    const emojiButtonRef = useRef(null);
    const editorWrapperRef = useRef(null);

    const normalizedOriginal = useMemo(
        () => normalizeMessageText(originalMessage?.Message || '').trim(),
        [originalMessage?.Message]
    );

    useEffect(() => {
        if (open) {
            setEditText(normalizedOriginal);
            setShowEmojiPicker(false);
            setShowFormattingToolbar(false);
            // Focus the editor after the dialog has mounted
            const timer = setTimeout(() => {
                editEditorRef.current?.focus();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [open, normalizedOriginal]);

    const handleLexicalChange = useCallback((markdown) => {
        setEditText(markdown);
    }, []);

    const handleSave = useCallback(() => {
        const trimmedText = editText.trim();
        if (trimmedText && trimmedText !== normalizedOriginal) {
            onSave(originalMessage.MessageId || originalMessage.Id, trimmedText);
        }
        onClose();
    }, [editText, normalizedOriginal, originalMessage, onSave, onClose]);

    const handleSelectionChange = useCallback(() => {
        const selection = window.getSelection();
        const hasSelection = selection.rangeCount > 0 && !selection.isCollapsed;
        if (hasSelection && editorWrapperRef.current) {
            const range = selection.getRangeAt(0);
            if (editorWrapperRef.current.contains(range.startContainer)) {
                const rect = range.getBoundingClientRect();
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

    const handleEmojiClick = useCallback((emojiData) => {
        const emoji = emojiData?.emoji || '';
        if (editEditorRef.current) {
            editEditorRef.current.update(() => {
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
            editEditorRef.current.focus();
        }
        setShowEmojiPicker(false);
    }, []);

    const handleKeyDown = useCallback((event) => {
        if (event && (event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            event.preventDefault();
            handleSave();
        }
    }, [handleSave]);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            fullScreen={isMobile}
            maxWidth={dialogMaxWidth}
            PaperProps={{
                sx: { borderRadius: '16px', p: 1 }
            }}
            slotProps={{
                backdrop: {
                    sx: {
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        backdropFilter: 'blur(4px)',
                        animation: 'fadeIn 0.25s ease-out'
                    }
                }
            }}
        >
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h6" fontWeight="600">Edit Message</Typography>
                <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
                    <X size={20} />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 2, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, alignItems: 'stretch' }}>
                {/* Original message preview */}
                <Box
                    sx={{
                        width: { xs: '100%', md: '35%' },
                        flexShrink: 0,
                        p: 2,
                        backgroundColor: '#f0f2f5',
                        borderRadius: '12px',
                        maxHeight: { xs: '120px', md: '55vh' },
                        overflowY: 'auto',
                    }}
                >
                    <Typography variant="caption" sx={{ color: '#7367f0', fontWeight: 600, display: 'block', mb: 0.5 }}>
                        Original Message
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                        <Typography variant="body2" sx={{ color: 'text.primary', whiteSpace: 'pre-wrap' }}>
                            {normalizedOriginal}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                            {originalMessage?.Time}
                        </Typography>
                    </Box>
                </Box>

                {/* Editor area */}
                <Box sx={{ flex: 1, position: 'relative', minWidth: 0 }}>
                    {showFormattingToolbar && (
                        <FormattingToolbar
                            editorRef={editEditorRef}
                            position={toolbarPosition}
                        />
                    )}

                    <Box
                        ref={editorWrapperRef}
                        onMouseUp={handleSelectionChange}
                        onKeyUp={handleSelectionChange}
                        sx={{
                            position: 'relative',
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: '12px',
                            backgroundColor: 'background.paper',
                            maxHeight: { xs: '50vh', md: '55vh' },
                            overflowY: 'auto',
                            p: 1,
                            pb: 5,
                            '& .lexical-editor-container': {
                                maxHeight: 'none',
                                overflowY: 'visible',
                            },
                        }}
                    >
                        <LexicalChatEditor
                            value={normalizedOriginal}
                            syncKey={originalMessage?.Id}
                            onChange={handleLexicalChange}
                            onKeyDown={handleKeyDown}
                            namespace="WhatsAppEditMessageEditor"
                            submitOnEnter={false}
                            placeholder="Edit your message..."
                            editorRef={editEditorRef}
                        />
                    <IconButton
                        ref={emojiButtonRef}
                        onClick={() => setShowEmojiPicker(prev => !prev)}
                        size="small"
                        sx={{
                            position: 'absolute',
                            bottom: 12,
                            right: 12,
                            zIndex: 1,
                            color: 'text.secondary',
                            bgcolor: 'background.paper',
                            borderRadius: '50%',
                            p: 0.5,
                            boxShadow: 1,
                            '&:hover': { bgcolor: 'action.hover' }
                        }}
                    >
                        <Smile size={20} />
                    </IconButton>
                    </Box>


                    <Popper
                        open={showEmojiPicker}
                        anchorEl={emojiButtonRef.current}
                        placement="top-end"
                        transition
                        sx={{ zIndex: 1400 }}
                    >
                        {({ TransitionProps }) => (
                            <Grow {...TransitionProps} timeout={200}>
                                <div>
                                    <ClickAwayListener onClickAway={() => setShowEmojiPicker(false)}>
                                        <Paper
                                            elevation={8}
                                            sx={{
                                                borderRadius: '12px',
                                                overflow: 'hidden',
                                                mt: 1
                                            }}
                                        >
                                            <EmojiPicker
                                                onEmojiClick={handleEmojiClick}
                                                width={300}
                                                height={400}
                                                emojiStyle="apple"
                                            />
                                        </Paper>
                                    </ClickAwayListener>
                                </div>
                            </Grow>
                        )}
                    </Popper>
                </Box>
            </DialogContent>

            <DialogActions sx={{ p: 2, gap: 1 }}>
                <Button
                    onClick={onClose}
                    className='secondaryBtnClassname'
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleSave}
                    variant="contained"
                    disabled={!editText.trim() || editText.trim() === normalizedOriginal}
                    className='primaryBtnClassname'
                >
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default EditMessageDialog;
