import React, { useState, useEffect, useContext } from "react";
import './AssigneeDropdown.scss';
import {
    Box,
    Typography,
    Avatar,
    Select,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    FormControl,
    AvatarGroup,
    Tooltip,
} from "@mui/material";
import { alpha, useTheme } from '@mui/material/styles';
import CheckIcon from "@mui/icons-material/Check";
import { addAssignUser } from "../../API/AssignUser/AssignUserApi";
import toast from "react-hot-toast";
import { removeAssignUser } from "../../API/UnAssignUser/UnAssignUserApi";
import { LoginContext } from "../../context/LoginData";
import { getWhatsAppAvatarConfig } from "../../utils/globalFunc";

export const colors = [
    "#FF5722", "#4CAF50", "#2196F3", "#FFC107", "#E91E63", "#9C27B0", "#3F51B5", "#00BCD4",
    "#FF9800", "#9E9E9E", "#795548", "#607D8B", "#8BC34A", "#FFEB3B", "#FF4081", "#673AB7",
    "#ff7f50", "#F44336", "#3F51B5", "#CDDC39", "#03A9F4", "#9C27B0", "#FF1744", "#00E5FF",
    "#9E9E9E", "#4CAF50", "#00BCD4", "#8B4513", "#6A5ACD", "#F08080", "#32CD32", "#FF6347"
];

export const getRandomAvatarColor = (name) => {
    const charSum = name
        ?.split("")
        ?.reduce((sum, char) => sum + char?.charCodeAt(0), 0);
    return colors[charSum % colors.length];
};

const AssigneeDropdown = ({ options, label, assignedList = [], selectedCustomer, fetchAssigneeList }) => {
    const [assigned, setAssigned] = useState(options);
    const { auth } = useContext(LoginContext);
    const theme = useTheme();
    const [moreAnchorEl, setMoreAnchorEl] = useState(null);

    const getUserAvatar = (user, size = 38) => {
        const seed = String(user?.FullName ?? user?.FirstName ?? user?.UserId ?? '').trim();
        return getWhatsAppAvatarConfig(seed || 'user', size);
    };

    const handleAssign = async (userId) => {
        if (!selectedCustomer?.ConversationId) {
            console.error('No conversation selected');
            return;
        }

        try {
            const response = await addAssignUser(selectedCustomer.ConversationId, userId, auth?.userId);

            if (response) {
                toast.success("User assigned successfully");
                fetchAssigneeList();
                setAssigned((prev) =>
                    prev.includes(userId) ? prev : [...prev, userId]
                );
            }
        } catch (err) {
            console.error("Assign failed:", err);
            toast.error("Failed to assign user");
        }
    };

    const handleUnAssign = async (userId) => {
        if (!selectedCustomer?.ConversationId) {
            console.error('No conversation selected');
            return;
        }

        try {
            const response = await removeAssignUser(selectedCustomer.ConversationId, userId, auth?.userId);

            if (response) {
                toast.success("User unassigned successfully");
                fetchAssigneeList();
                setAssigned((prev) =>
                    prev.includes(userId) ? prev : [...prev, userId]
                );
            }
        } catch (err) {
            console.error("Assign failed:", err);
            toast.error("Failed to unassign user");
        }
    };

    const isUserAssignedToConversation = (option) => {
        const conversationIds = option?.ConversationIds ? JSON.parse(option.ConversationIds) : [];
        return conversationIds.some(item =>
            item.ConversationId === selectedCustomer?.ConversationId &&
            item.UserId === option.UserId
        );
    };

    const assignedUsers = Array.isArray(options)
        ? options.filter((option) => isUserAssignedToConversation(option))
        : [];
    const visibleAssignedUsers = assignedUsers.slice(0, 2);
    const overflowAssignedUsers = assignedUsers.slice(2);
    const openMoreMenu = Boolean(moreAnchorEl);

    return (
        <Box className="form-group_ll">
            <Typography variant="subtitle1" className="form-label">{label}</Typography>

            {/* Avatar Group for assigned users */}
            <Box>
                <AvatarGroup>
                    {visibleAssignedUsers.map((option) => {
                        const avatarCfg = getUserAvatar(option, 32);

                        return (
                            <Tooltip
                                key={option.UserId}
                                title={option?.FullName || option?.FirstName || 'User'}
                                arrow
                                placement="top"
                            >
                                <Avatar
                                    {...avatarCfg}
                                    sx={{
                                        ...avatarCfg.sx,
                                        fontSize: "13px"
                                    }}
                                >
                                    {avatarCfg.children}
                                </Avatar>
                            </Tooltip>
                        );
                    })}

                    {overflowAssignedUsers.length > 0 ? (
                        <Tooltip
                            title={overflowAssignedUsers
                                .map((u) => (u?.FullName || u?.FirstName || 'User'))
                                .filter(Boolean)
                                .join(', ')}
                            arrow
                            placement="top"
                        >
                            <Avatar
                                role="button"
                                tabIndex={0}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setMoreAnchorEl(e.currentTarget);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setMoreAnchorEl(e.currentTarget);
                                    }
                                }}
                                sx={{
                                    width: 32,
                                    height: 32,
                                    fontSize: 12,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    bgcolor: alpha(theme.palette.primary.main, 0.16),
                                    color: theme.palette.primary.main,
                                    border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`,
                                    '&:hover': {
                                        bgcolor: alpha(theme.palette.primary.main, 0.22),
                                    },
                                }}
                            >
                                +{overflowAssignedUsers.length}
                            </Avatar>
                        </Tooltip>
                    ) : null}

                </AvatarGroup>

                <Menu
                    anchorEl={moreAnchorEl}
                    open={openMoreMenu}
                    onClose={() => setMoreAnchorEl(null)}
                    PaperProps={{
                        sx: {
                            minWidth: 220,
                        }
                    }}
                >
                    {overflowAssignedUsers.map((user) => {
                        const avatarCfg = getUserAvatar(user, 32);

                        return (
                            <MenuItem
                                key={user.UserId}
                                onClick={() => setMoreAnchorEl(null)}
                                sx={{
                                    gap: 1.25,
                                    backgroundColor: alpha(theme.palette.primary.main, 0.06),
                                    '&:hover': {
                                        backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                    },
                                }}
                            >
                                <Tooltip
                                    title={user?.FullName || user?.FirstName || 'User'}
                                    arrow
                                    placement="right"
                                >
                                    <Avatar
                                        {...avatarCfg}
                                        sx={{
                                            ...avatarCfg.sx,
                                            width: 28,
                                            height: 28,
                                            fontSize: 12,
                                        }}
                                    >
                                        {avatarCfg.children}
                                    </Avatar>
                                </Tooltip>
                                <ListItemText primary={user?.FullName || user?.FirstName || 'User'} />
                            </MenuItem>
                        );
                    })}
                </Menu>
            </Box>

            <FormControl fullWidth size="small">
                <Select
                    value="" // always empty → no chip shown
                    displayEmpty
                    renderValue={() => "Assign User"}
                    sx={{
                        borderRadius: 2,
                        fontSize: 14,
                        '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: theme.palette.borderColor.extraLight,
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: theme.palette.borderColor.extraLight,
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: theme.palette.borderColor.extraLight,
                        },
                        "& .MuiSelect-select": {
                            paddingY: "6px",
                        },
                    }}
                    MenuProps={{
                        PaperProps: {
                            sx: {
                                border: `1px solid ${theme.palette.borderColor.extraLight}`,
                            },
                        },
                    }}
                >
                    {options.map((option) => {
                        const isAssigned = isUserAssignedToConversation(option);

                        return (
                            <MenuItem
                                key={option.UserId}
                                value={option.UserId}
                                onClick={() => { isAssigned ? handleUnAssign(option.UserId) : handleAssign(option.UserId) }}
                                sx={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    backgroundColor: isAssigned
                                        ? alpha(theme.palette.primary.main, 0.14)
                                        : 'transparent',
                                    '&:hover': {
                                        backgroundColor: isAssigned
                                            ? alpha(theme.palette.primary.main, 0.2)
                                            : alpha(theme.palette.primary.main, 0.1),
                                    },
                                }}
                            >
                                <Box sx={{ display: "flex", alignItems: "center", width: "100%" }}>
                                    {(() => {
                                        const avatarCfg = getUserAvatar(option, 32);
                                        return (
                                    <Tooltip
                                        title={option?.FullName || option?.FirstName || 'User'}
                                        arrow
                                        placement="left"
                                    >
                                        <Avatar
                                            {...avatarCfg}
                                            sx={{
                                                ...avatarCfg.sx,
                                                mr: 1.5,
                                                fontSize:'13px'
                                            }}
                                        >
                                            {avatarCfg.children}
                                        </Avatar>
                                    </Tooltip>
                                        );
                                    })()}
                                    <ListItemText primary={option.FullName} />
                                    {isAssigned && <CheckIcon sx={{ color: theme.palette.primary.main }} />}
                                </Box>
                            </MenuItem>
                        );
                    })}
                </Select>
            </FormControl>
        </Box>
    );
};

export default AssigneeDropdown;
