import { Tooltip, IconButton } from '@mui/material';
import { UserPlus, Search } from 'lucide-react';

const ActionButtons = ({
    customer,
    isCurrentUserAdmin,
    onAddClick,
    onSearchClick
}) => {
    if (customer?.IsGroup === 1) {
        return (
            <div className="action-buttons group-block-actions">
                <Tooltip
                    title={isCurrentUserAdmin ? '' : 'Only group admins can add members'}
                    placement="top"
                    arrow
                >
                    <div
                        className={`action-block-item ${!isCurrentUserAdmin ? 'disabled' : ''}`}
                        onClick={isCurrentUserAdmin ? onAddClick : undefined}
                        style={{ cursor: isCurrentUserAdmin ? 'pointer' : 'not-allowed' }}
                    >
                        <IconButton className="action-circle" disabled={!isCurrentUserAdmin} tabIndex={-1}>
                            <UserPlus size={20} />
                        </IconButton>
                        <span>Add</span>
                    </div>
                </Tooltip>
                <div className="action-block-item" onClick={onSearchClick}>
                    <IconButton className="action-circle">
                        <Search size={20} />
                    </IconButton>
                    <span>Search</span>
                </div>
            </div>
        );
    }

    return (
        <div className="action-buttons group-block-actions" style={{ marginBottom: '15px' }}>
            <div className="action-block-item" onClick={onSearchClick}>
                <IconButton className="action-circle">
                    <Search size={20} />
                </IconButton>
                <span>Search</span>
            </div>
        </div>
    );
};

export default ActionButtons;
