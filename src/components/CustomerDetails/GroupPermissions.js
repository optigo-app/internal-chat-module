import {
    Typography,
    styled,
    Switch,
    Divider
} from '@mui/material';
import {
    Edit as EditIcon,
    Chat as ChatIcon,
    PersonAdd as PersonAddIcon,
    ManageAccounts as ManageAccountsIcon,
} from '@mui/icons-material';

const IOSSwitch = styled((props) => (
    <Switch focusVisibleClassName=".Mui-focusVisible" disableRipple {...props} />
))(({ theme }) => ({
    width: 42,
    height: 26,
    padding: 0,
    '& .MuiSwitch-switchBase': {
        padding: 0,
        margin: 2,
        transitionDuration: '300ms',
        '&.Mui-checked': {
            transform: 'translateX(16px)',
            color: '#fff',
            '& + .MuiSwitch-track': {
                backgroundColor: theme.palette.primary.main,
                opacity: 1,
                border: 0,
            },
            '&.Mui-disabled + .MuiSwitch-track': {
                opacity: 0.5,
            },
        },
        '&.Mui-focusVisible .MuiSwitch-thumb': {
            color: theme.palette.primary.main,
            border: '6px solid #fff',
        },
        '&.Mui-disabled .MuiSwitch-thumb': {
            color: theme.palette.mode === 'light' ? theme.palette.grey[100] : theme.palette.grey[600],
        },
        '&.Mui-disabled + .MuiSwitch-track': {
            opacity: theme.palette.mode === 'light' ? 0.7 : 0.3,
        },
    },
    '& .MuiSwitch-thumb': {
        boxSizing: 'border-box',
        width: 22,
        height: 22,
    },
    '& .MuiSwitch-track': {
        borderRadius: 26 / 2,
        backgroundColor: theme.palette.mode === 'light' ? '#E9E9EA' : '#39393D',
        opacity: 1,
        transition: theme.transitions.create(['background-color'], {
            duration: 500,
        }),
    },
}));

const GroupPermissions = ({ permissions, onPermissionChange, onBack }) => {
    return (
        <div className="media-panel-view permissions-view">
            <div className="permissions-content" style={{ padding: '0 0 20px 0' }}>
                <div className="permission_group" style={{ padding: '20px' }}>
                    <Typography className="group_label" sx={{ mb: 2, color: '#667781', fontSize: '14px', fontWeight: 500 }}>
                        Members can:
                    </Typography>

                    <div className="permission_item" style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                        <EditIcon sx={{ color: '#667781', fontSize: '22px' }} />
                        <div className="item_text" style={{ flex: 1 }}>
                            <Typography variant="body1" sx={{ fontSize: '16px', color: '#111b21' }}>Edit group settings</Typography>
                            <Typography variant="caption" sx={{ color: '#667781', fontSize: '13px', display: 'block', mt: 0.5 }}>
                                This includes the name, icon, description, disappearing message timer, and the ability to pin, keep or unkeep messages.
                            </Typography>
                        </div>
                        <IOSSwitch
                            checked={permissions?.editGroupSettings ?? true}
                            onChange={(e) => onPermissionChange('editGroupSettings', e.target.checked)}
                        />
                    </div>

                    <div className="permission_item" style={{ display: 'flex', gap: '15px', marginBottom: '20px', alignItems: 'center' }}>
                        <ChatIcon sx={{ color: '#667781', fontSize: '22px' }} />
                        <div className="item_text" style={{ flex: 1 }}>
                            <Typography variant="body1" sx={{ fontSize: '16px', color: '#111b21' }}>Send new messages</Typography>
                        </div>
                        <IOSSwitch
                            checked={permissions?.sendMessages ?? true}
                            onChange={(e) => onPermissionChange('sendMessages', e.target.checked)}
                        />
                    </div>

                    <div className="permission_item" style={{ display: 'flex', gap: '15px', marginBottom: '20px', alignItems: 'center' }}>
                        <PersonAddIcon sx={{ color: '#667781', fontSize: '22px' }} />
                        <div className="item_text" style={{ flex: 1 }}>
                            <Typography variant="body1" sx={{ fontSize: '16px', color: '#111b21' }}>Add other members</Typography>
                        </div>
                        <IOSSwitch
                            checked={permissions?.addOtherMembers ?? true}
                            onChange={(e) => onPermissionChange('addOtherMembers', e.target.checked)}
                        />
                    </div>

                </div>

                <Divider sx={{ mx: 0, my: 1, borderColor: 'rgba(134, 150, 160, 0.15)' }} />

                <div className="permission_group" style={{ padding: '20px' }}>
                    <Typography className="group_label" sx={{ mb: 2, color: '#667781', fontSize: '14px', fontWeight: 500 }}>
                        Admins can:
                    </Typography>

                    <div className="permission_item" style={{ display: 'flex', gap: '15px' }}>
                        <ManageAccountsIcon sx={{ color: '#667781', fontSize: '22px' }} />
                        <div className="item_text" style={{ flex: 1 }}>
                            <Typography variant="body1" sx={{ fontSize: '16px', color: '#111b21' }}>Approve new members</Typography>
                            <Typography variant="caption" sx={{ color: '#667781', fontSize: '13px', display: 'block', mt: 0.5 }}>
                                When turned on, admins must approve anyone who wants to join this group.
                            </Typography>
                        </div>
                        <IOSSwitch
                            checked={permissions?.approveNewMembers ?? false}
                            onChange={(e) => onPermissionChange('approveNewMembers', e.target.checked)}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GroupPermissions;
