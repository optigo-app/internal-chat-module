import React, { useContext, useState } from "react";
import './EscalatedDropdown.scss';
import {
    Box,
    Typography,
    Avatar,
    Select,
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

const EscalatedDropdown = ({ options, label, assignedList = [], selectedCustomer, fetchEscalatedList }) => {
    const [assigned, setAssigned] = useState(options);
    const { auth } = useContext(LoginContext);
    const theme = useTheme();

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
                toast.success("User escalated successfully");
                fetchEscalatedList();
                setAssigned((prev) =>
                    prev.includes(userId) ? prev : [...prev, userId]
                );
            }
        } catch (err) {
            console.error("Escalated failed:", err);
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
                fetchEscalatedList();
                setAssigned((prev) =>
                    prev.includes(userId) ? prev : [...prev, userId]
                );
            }
        } catch (err) {
            console.error("Assign failed:", err);
            toast.error("Failed to unassign user");
        }
    };

    return (
        <Box className="form-group-escalated">
            <Typography variant="subtitle1" className="form-label">{label}</Typography>
            <FormControl fullWidth size="small">
                <Select
                    value="" // always empty → no chip shown
                    displayEmpty
                    renderValue={() => "Escalate User"}
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
                        const conversationIds = option?.ConversationIds ? JSON.parse(option.ConversationIds) : [];

                        const isAssigned = conversationIds.some(item =>
                            item.ConversationId === selectedCustomer?.ConversationId &&
                            item.UserId === option.UserId
                        );

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

export default EscalatedDropdown;
