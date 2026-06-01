import React from "react";
import {
    Menu,
    MenuItem,
    Box,
    Typography,
    Divider,
    Chip,
    alpha
} from "@mui/material";
import { Emoji } from 'emoji-picker-react';
import { charToUnified } from '../../utils/EmojiUtils';

export default function ReactionDetailsMenu({
    anchorEl,
    onClose,
    reactions = [],
    auth,
    onRemoveReaction,
    disablePortal = false
}) {
    const open = Boolean(anchorEl);
    const [filter, setFilter] = React.useState("all");

    // reactions is now an array of objects like:
    // { Id, UserId, Emoji, UserName, ... }

    const reactionGroups = React.useMemo(() => {
        const groups = {};
        reactions.forEach(r => {
            const emoji = r.Emoji || r.Reaction;
            if (!groups[emoji]) {
                groups[emoji] = [];
            }
            groups[emoji].push(r);
        });
        return groups;
    }, [reactions]);

    const currentUserId = auth?.id ?? auth?.userId;
    const filteredReactions = React.useMemo(() => {
        const list = filter === "all"
            ? reactions
            : (reactionGroups[filter] || []);

        return [...list].sort((a, b) => {
            const aIsMe = String(a.UserId) === String(currentUserId);
            const bIsMe = String(b.UserId) === String(currentUserId);
            if (aIsMe) return -1;
            if (bIsMe) return 1;
            return 0;
        });
    }, [filter, reactions, reactionGroups, currentUserId]);

    return (
        <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={onClose}
            disablePortal={disablePortal}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            transformOrigin={{ vertical: 'top', horizontal: 'center' }}
            TransitionProps={{ timeout: 350 }}
            PaperProps={{
                sx: {
                    width: 320,
                    borderRadius: 3,
                    maxHeight: 400,
                    zIndex: 11000,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                    backdropFilter: 'blur(8px)',
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                }
            }}
        >
            {/* Emoji filters */}
            <Box
                px={2}
                py={1.5}
                display="flex"
                alignItems="center"
                justifyContent="space-between"
            >
                <Box
                    display="flex"
                    gap={1}
                    sx={{
                        overflowX: 'auto',
                        pb: 0.5,
                        '&::-webkit-scrollbar': { display: 'none' },
                        msOverflowStyle: 'none',
                        scrollbarWidth: 'none'
                    }}
                >
                    <Chip
                        label={`All ${reactions.length}`}
                        size="small"
                        clickable
                        color={filter === "all" ? "primary" : "default"}
                        onClick={() => setFilter("all")}
                        sx={{ transition: 'all 0.2s', borderRadius: '8px' }}
                    />

                    {Object.entries(reactionGroups).map(([emoji, group]) => {
                        const unified = charToUnified(emoji);
                        return (
                            <Chip
                                key={emoji}
                                label={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        {unified ? <Emoji unified={unified} size={16} emojiStyle="apple" /> : emoji}
                                        <Typography variant="body2">{group.length}</Typography>
                                    </Box>
                                }
                                size="small"
                                clickable
                                color={filter === emoji ? "primary" : "default"}
                                onClick={() => setFilter(emoji)}
                                sx={{ transition: 'all 0.2s', borderRadius: '8px', px: 0.5 }}
                            />
                        );
                    })}
                </Box>
            </Box>

            <Divider />

            {/* User list */}
            <Box sx={{ maxHeight: 240, overflowY: "auto", py: 1, px: 1 }}>
                {filteredReactions.map((r, i) => {
                    const isCurrentUser = String(r.UserId) === String(currentUserId);
                    const emojiValue = r.Emoji || r.Reaction;

                    return (
                        <MenuItem
                            key={r.Id || i}
                            onClick={isCurrentUser ? () => onRemoveReaction(r) : undefined}
                            sx={{
                                cursor: isCurrentUser ? "pointer" : "default",
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.5,
                                py: 1.2,
                                px: 1.5,
                                mb: 0.5,
                                borderRadius: '12px',
                                transition: 'all 0.2s ease',
                                overflow: 'hidden',
                                '&:hover': {
                                    backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.08),
                                    transform: 'translateX(4px)',
                                }
                            }}
                        >
                            <Box flex={1}>
                                <Typography fontWeight={isCurrentUser ? 600 : 400}>
                                    {isCurrentUser ? "You" : (r.UserName || "User")}
                                </Typography>

                                {isCurrentUser && (
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                    >
                                        Tap to remove
                                    </Typography>
                                )}
                            </Box>

                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                {(() => {
                                    const unified = charToUnified(emojiValue);
                                    return unified ? <Emoji unified={unified} size={20} emojiStyle="apple" /> : <Typography fontSize={18}>{emojiValue}</Typography>;
                                })()}
                            </Box>
                        </MenuItem>
                    );
                })}

                {filteredReactions.length === 0 && (
                    <MenuItem disabled>
                        <Typography color="text.secondary">
                            No reactions
                        </Typography>
                    </MenuItem>
                )}
            </Box>
        </Menu>
    );
}
