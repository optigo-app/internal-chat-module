import {
    Typography,
    styled,
    Switch,
    Divider,
    Box,
    Tooltip
} from "@mui/material";
import {
    Edit,
    MessageSquare,
    UserPlus,
    UserCheck,
    ChevronRight,
    UserStar,
    Link2,
    Trash
} from "lucide-react";

const IOSSwitch = styled((props) => (
    <Switch focusVisibleClassName=".Mui-focusVisible" disableRipple {...props} />
))(({ theme }) => ({
    width: 42,
    height: 26,
    padding: 0,
    "& .MuiSwitch-switchBase": {
        padding: 0,
        margin: 2,
        transitionDuration: "300ms",
        "&.Mui-checked": {
            transform: "translateX(16px)",
            color: "#fff",
            "& + .MuiSwitch-track": {
                backgroundColor: theme.palette.primary.main,
                opacity: 1,
                border: 0
            }
        }
    },
    "& .MuiSwitch-thumb": {
        boxSizing: "border-box",
        width: 22,
        height: 22
    },
    "& .MuiSwitch-track": {
        borderRadius: 13,
        backgroundColor: "#E9E9EA",
        opacity: 1
    }
}));

const GroupPermissions = ({
    permissions,
    onPermissionChange,
    groupMembers = [],
    onEditAdmins
}) => {
    console.log("permissions", permissions)
    const admins = groupMembers.filter(
        (m) => m.IsAdmin === 1 || m.IsAdmin === true
    );

    const adminNames = admins
        .map((m) => m.Name || m.DisplayName || m.UserName || "Admin")
        .join(", ");

    return (
        <div className="permissions-view">
            <div className="permissions-content">

                {/* MEMBERS PERMISSIONS */}
                <div className="permission_group">
                    <Typography className="group_label">
                        Members can:
                    </Typography>

                    <div className="permission_item">
                        <Edit className="item_icon" />
                        <div className="item_text">
                            <Typography variant="body1">
                                Edit group settings
                            </Typography>
                            <Typography variant="caption">
                                This includes the name, icon, description, disappearing message timer, and pin messages.
                            </Typography>
                        </div>

                        <IOSSwitch
                            checked={permissions?.editGroupSettings ?? true}
                            onChange={(e) =>
                                onPermissionChange("editGroupSettings", e.target.checked)
                            }
                        />
                    </div>

                    <div className="permission_item">
                        <MessageSquare className="item_icon" />
                        <div className="item_text">
                            <Typography variant="body1">
                                Send new messages
                            </Typography>
                        </div>

                        <IOSSwitch
                            checked={permissions?.sendMessages ?? true}
                            onChange={(e) =>
                                onPermissionChange("sendMessages", e.target.checked)
                            }
                        />
                    </div>

                    <div className="permission_item">
                        <UserPlus className="item_icon" />
                        <div className="item_text">
                            <Typography variant="body1">
                                Add other members
                            </Typography>
                        </div>

                        <IOSSwitch
                            checked={permissions?.addOtherMembers ?? true}
                            onChange={(e) =>
                                onPermissionChange("addOtherMembers", e.target.checked)
                            }
                        />
                    </div>

                    <div className="permission_item">
                        <Trash className="item_icon" />
                        <div className="item_text">
                            <Typography variant="body1">
                                Delete messages
                            </Typography>
                        </div>

                        <IOSSwitch
                            checked={permissions?.AllowDeleteForAll ?? true}
                            onChange={(e) =>
                                onPermissionChange("AllowDeleteForAll", e.target.checked)
                            }
                        />
                    </div>

                    <div className="permission_item" style={{ opacity: 0.6, cursor: 'not-allowed' }}>
                        <Link2 className="item_icon" />
                        <div className="item_text">
                            <Typography variant="body1">
                                Invite via link
                            </Typography>
                        </div>

                        <IOSSwitch
                            checked={permissions?.inviteToGroup ?? true}
                            onChange={(e) =>
                                onPermissionChange("inviteToGroup", e.target.checked)
                            }
                        />
                    </div>
                </div>

                <Divider />

                {/* ADMIN SETTINGS */}
                <div className="permission_group">
                    <Typography className="group_label">
                        Admins can:
                    </Typography>

                    <div className="permission_item" style={{ opacity: 0.6, cursor: 'not-allowed' }}>
                        <UserCheck className="item_icon" />
                        <div className="item_text">
                            <Typography variant="body1">
                                Approve new members
                            </Typography>
                            <Typography variant="caption">
                                When turned on, admins must approve anyone who wants to join this group.
                            </Typography>
                        </div>

                        <IOSSwitch
                            checked={permissions?.approveNewMembers ?? false}
                            onChange={(e) =>
                                onPermissionChange("approveNewMembers", e.target.checked)
                            }
                        />
                    </div>
                </div>

                <Divider />

                {/* ADMIN MANAGEMENT */}
                {permissions?.editGroupAdmins && (
                    <div className="permission_group">
                        <Typography className="group_label">
                            Group admin:
                        </Typography>

                        <Box className="permission_item clickable" onClick={onEditAdmins}>
                            <UserStar className="item_icon" />

                            <Box className="item_text">
                                <Typography variant="body1">
                                    Edit group admins
                                </Typography>

                                {adminNames && (
                                    <Typography variant="caption" className="admin_names">
                                        {adminNames}
                                    </Typography>
                                )}
                            </Box>

                            <ChevronRight className="chevron_icon" />
                        </Box>
                    </div>
                )}
            </div>
        </div >
    );
};

export default GroupPermissions;