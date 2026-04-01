import { useState, useEffect, useCallback } from 'react';

export const useDrawerState = (conversationId) => {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerViewState, setDrawerViewState] = useState('info');
    const [selectedMessageForInfo, setSelectedMessageForInfo] = useState(null);
    const [infoMember, setInfoMember] = useState(null);

    // Reset drawer when conversation changes
    useEffect(() => {
        setDrawerOpen(false);
        setDrawerViewState('info');
    }, [conversationId]);

    // Listen for member info events
    useEffect(() => {
        const handleShowInfo = (e) => {
            const memberData = e.detail;
            setDrawerOpen(true);
            setDrawerViewState('info');
            setInfoMember(memberData);
        };
        window.addEventListener('SHOW_MEMBER_INFO', handleShowInfo);
        return () => window.removeEventListener('SHOW_MEMBER_INFO', handleShowInfo);
    }, []);

    const openInfo = useCallback(() => {
        setDrawerViewState('info');
        setDrawerOpen(true);
    }, []);

    const openSearch = useCallback(() => {
        setDrawerViewState('search');
        setDrawerOpen(true);
    }, []);

    const openMessageInfo = useCallback((message) => {
        setSelectedMessageForInfo(message);
        setDrawerViewState('messageInfo');
        setDrawerOpen(true);
    }, []);

    const closeDrawer = useCallback(() => {
        setDrawerOpen(false);
        setInfoMember(null);
    }, []);

    return {
        drawerOpen,
        setDrawerOpen,
        drawerViewState,
        setDrawerViewState,
        selectedMessageForInfo,
        infoMember,
        openInfo,
        openSearch,
        openMessageInfo,
        closeDrawer
    };
};
