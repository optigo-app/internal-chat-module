import React from "react";
import {
    Menu,
    MenuItem,
    Box,
    Typography,
    Divider,
    IconButton,
    Chip
} from "@mui/material";
import AddReactionIcon from "@mui/icons-material/AddReaction";

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

    const filteredReactions = filter === "all"
        ? reactions
        : (reactionGroups[filter] || []);

    const currentUserId = auth?.id ?? auth?.userId;

    return (
        <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={onClose}
            disablePortal={disablePortal}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            transformOrigin={{ vertical: 'top', horizontal: 'center' }}
            PaperProps={{
                sx: {
                    width: 320,
                    borderRadius: 2,
                    maxHeight: 400,
                    zIndex: 11000,
                }
            }}
        >
            {/* Emoji filters */}
            <Box
                px={2}
                py={1}
                display="flex"
                alignItems="center"
                justifyContent="space-between"
            >
                <Box display="flex" gap={1} sx={{ overflowX: 'auto', pb: 0.5 }}>
                    <Chip
                        label={`All ${reactions.length}`}
                        size="small"
                        clickable
                        color={filter === "all" ? "primary" : "default"}
                        onClick={() => setFilter("all")}
                    />

                    {Object.entries(reactionGroups).map(([emoji, group]) => (
                        <Chip
                            key={emoji}
                            label={`${emoji} ${group.length}`}
                            size="small"
                            clickable
                            color={filter === emoji ? "primary" : "default"}
                            onClick={() => setFilter(emoji)}
                        />
                    ))}
                </Box>
            </Box>

            <Divider />

            {/* User list */}
            <Box sx={{ maxHeight: 240, overflowY: "auto" }}>
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
                                gap: 1
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

                            <Typography fontSize={18}>{emojiValue}</Typography>
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
