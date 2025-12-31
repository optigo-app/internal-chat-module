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
    reactions,
    currentUser,
    onAddReaction,
    onRemoveReaction
}) {
    const open = Boolean(anchorEl);
    const [filter, setFilter] = React.useState("all");

    const allUsers = reactions.flatMap(r =>
        r.users.map(user => ({ user, emoji: r.emoji }))
    );

    const filteredUsers =
        filter === "all"
            ? allUsers
            : allUsers.filter(u => u.emoji === filter);

    return (
        <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: {
                    width: 320,
                    borderRadius: 2
                }
            }}
        >
            {/* Header */}

            {/* Emoji filters */}
            <Box
                px={2}
                py={1}
                display="flex"
                alignItems="center"
                justifyContent="space-between"
            >
                <Box display="flex" gap={1}>
                    <Chip
                        label={`All ${allUsers.length}`}
                        size="small"
                        clickable
                        color={filter === "all" ? "primary" : "default"}
                        onClick={() => setFilter("all")}
                    />

                    {reactions.map(r => (
                        <Chip
                            key={r.emoji}
                            label={`${r.emoji} ${r.users.length}`}
                            size="small"
                            clickable
                            color={filter === r.emoji ? "primary" : "default"}
                            onClick={() => setFilter(r.emoji)}
                        />
                    ))}
                </Box>
                <IconButton size="small" onClick={onAddReaction}>
                    <AddReactionIcon fontSize="small" />
                </IconButton>
            </Box>

            <Divider />

            {/* User list */}
            <Box sx={{ maxHeight: 240, overflowY: "auto" }}>
                {filteredUsers.map((u, i) => {
                    const isCurrentUser = u.user === currentUser;

                    return (
                        <MenuItem
                            key={i}
                            onClick={isCurrentUser ? onRemoveReaction : undefined}
                            sx={{
                                cursor: isCurrentUser ? "pointer" : "default"
                            }}
                        >
                            <Box flex={1}>
                                <Typography>{u.user}</Typography>

                                {isCurrentUser && (
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                    >
                                        Tap to remove
                                    </Typography>
                                )}
                            </Box>

                            <Typography fontSize={18}>{u.emoji}</Typography>
                        </MenuItem>
                    );
                })}

                {filteredUsers.length === 0 && (
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
