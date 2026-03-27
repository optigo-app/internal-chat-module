import React, { useState, useEffect, useRef } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    IconButton,
    Box,
    Typography,
    Popper,
    Paper,
    ClickAwayListener,
    Grow
} from '@mui/material';
import { X, Smile } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';

const EditMessageDialog = ({ open, onClose, onSave, originalMessage }) => {
    const [editText, setEditText] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const emojiButtonRef = useRef(null);

    useEffect(() => {
        if (open) {
            setEditText(originalMessage?.Message || '');
            setShowEmojiPicker(false);
        }
    }, [open, originalMessage]);

    const handleSave = () => {
        if (editText.trim() && editText !== originalMessage?.Message) {
            onSave(originalMessage.MessageId || originalMessage.Id, editText);
        }
        onClose();
    };

    const onEmojiClick = (emojiData) => {
        setEditText(prev => prev + emojiData.emoji);
        setShowEmojiPicker(false);
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="sm"
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

            <DialogContent sx={{ p: 2 }}>
                <Box sx={{ mb: 2, p: 2, backgroundColor: '#f0f2f5', borderRadius: '12px' }}>
                    <Typography variant="caption" sx={{ color: '#7367f0', fontWeight: 600, display: 'block', mb: 0.5 }}>
                        Original Message
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="body2" sx={{ color: 'text.primary', whiteSpace: 'pre-wrap' }}>
                            {originalMessage?.Message}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', whiteSpace: 'pre-wrap' }}>
                            {originalMessage?.Time}
                        </Typography>
                    </Box>
                </Box>

                <TextField
                    fullWidth
                    multiline
                    minRows={3}
                    maxRows={6}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    variant="outlined"
                    placeholder="Edit your message..."
                    InputProps={{
                        sx: {
                            borderRadius: '12px',
                            backgroundColor: '#fff',
                        },
                        endAdornment: (
                            <IconButton
                                ref={emojiButtonRef}
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                sx={{ position: 'absolute', bottom: 8, right: 8 }}
                            >
                                <Smile size={20} />
                            </IconButton>
                        )
                    }}
                />

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
                                            onEmojiClick={onEmojiClick}
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
                    disabled={!editText.trim() || editText === originalMessage?.Message}
                    className='primaryBtnClassname'
                >
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default EditMessageDialog;
