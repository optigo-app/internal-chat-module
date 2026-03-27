import { Tooltip, IconButton, Grid } from "@mui/material";
import { UserPlus, Search } from "lucide-react";

const ActionButtons = ({
    customer,
    isCurrentUserAdmin,
    onAddClick,
    onSearchClick,
    groupPermissions
}) => {
    const canAddMembers = isCurrentUserAdmin || groupPermissions?.addOtherMembers;

    const ActionItem = ({ icon, label, onClick, disabled, tooltip }) => (
        <Tooltip title={tooltip || ""} placement="top" arrow>
            <div
                className={`action-block-item ${disabled ? "disabled" : ""}`}
                onClick={!disabled ? onClick : undefined}
            >
                <IconButton className="action-circle" disabled={disabled}>
                    {icon}
                </IconButton>
                <span className="action-label">{label}</span>
            </div>
        </Tooltip>
    );

    if (customer?.IsGroup === 1) {
        return (
            <Grid
                container
                spacing={2}
                className="action-buttons group-block-actions"
                justifyContent="center"
            >
                <Grid size={{ xs: 6, sm: 4 }}>
                    <ActionItem
                        icon={<UserPlus size={20} />}
                        label="Add"
                        onClick={onAddClick}
                        disabled={!canAddMembers}
                        tooltip={!canAddMembers ? "Only group admins can add members" : ""}
                    />
                </Grid>

                <Grid size={{ xs: 6, sm: 4 }}>
                    <ActionItem
                        icon={<Search size={20} />}
                        label="Search"
                        onClick={onSearchClick}
                    />
                </Grid>
            </Grid>
        );
    }

    return (
        <Grid
            container
            spacing={2}
            className="action-buttons group-block-actions"
            justifyContent="center"
            sx={{ mb: 2 }}
        >
            <Grid size={{ xs: 4 }}>
                <ActionItem
                    icon={<Search size={20} />}
                    label="Search"
                    onClick={onSearchClick}
                />
            </Grid>
        </Grid>
    );
};

export default ActionButtons;