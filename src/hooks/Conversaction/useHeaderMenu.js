import { useState, useMemo, useCallback } from 'react';
import {
    Info,
    CheckSquare,
    BellOff,
    X,
    Trash2,
    LogOut,
    Star,
    CircleMinus
} from 'lucide-react';

export const useHeaderMenu = ({ selectedCustomer, isFavorite, isRemovedFromGroup }) => {
    const [headerMenuAnchorEl, setHeaderMenuAnchorEl] = useState(null);

    const headerMenuItems = useMemo(() => [
        {
            label: selectedCustomer?.IsGroup === 1 ? 'Group Info' : 'Contact Info',
            action: 'groupInfo',
            icon: <Info size={18} />
        },
        {
            label: 'Select messages',
            action: 'selectMessages',
            icon: <CheckSquare size={18} />
        },
        { label: 'Mute notification', action: 'mute', icon: <BellOff size={18} /> },
        {
            label: isFavorite ? 'Remove from favourite' : 'Add to favourite',
            action: 'favourite',
            icon: <Star size={18} fill={isFavorite ? '#FFD700' : 'none'} color={isFavorite ? '#FFD700' : 'currentColor'} />
        },
        { label: 'Close chat', action: 'close', icon: <X size={18} /> },
        { divider: true },
        {
            label: 'Clear chat',
            action: 'clearChat',
            icon: <CircleMinus size={18} />
        },
        ...(selectedCustomer?.IsGroup === 1
            ? (isRemovedFromGroup
                ? [{
                    label: 'Delete group',
                    action: 'deleteGroup',
                    icon: <Trash2 size={18} />,
                    danger: true
                }]
                : [{
                    label: 'Exit group',
                    action: 'exitGroup',
                    icon: <LogOut size={18} />,
                    danger: true
                }]
            )
            : [{
                label: 'Delete chat',
                action: 'deleteChat',
                icon: <Trash2 size={18} />,
                danger: true
            }]
        ),
    ], [selectedCustomer?.IsGroup, isFavorite, isRemovedFromGroup]);

    const openMenu = useCallback((event) => {
        setHeaderMenuAnchorEl(event.currentTarget);
    }, []);

    const closeMenu = useCallback(() => {
        setHeaderMenuAnchorEl(null);
    }, []);

    return {
        headerMenuAnchorEl,
        headerMenuItems,
        openMenu,
        closeMenu
    };
};
