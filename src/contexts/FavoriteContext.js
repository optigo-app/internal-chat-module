import React, { createContext, useContext, useState, useCallback } from 'react';

const FavoriteContext = createContext();

export const FavoriteProvider = ({ children }) => {
    // State to track favorite status updates
    // Key: conversationId, Value: { isStar: 0 or 1, timestamp }
    const [favoriteState, setFavoriteState] = useState({});

    // Get favorite status for a conversation
    const getFavoriteStatus = useCallback((conversationId) => {
        return favoriteState[conversationId]?.isStar;
    }, [favoriteState]);

    // Update favorite status
    const updateFavoriteStatus = useCallback((conversationId, isStar) => {
        setFavoriteState(prev => ({
            ...prev,
            [conversationId]: {
                isStar,
                timestamp: Date.now(),
            },
        }));
    }, []);

    const value = {
        favoriteState,
        getFavoriteStatus,
        updateFavoriteStatus,
    };

    return (
        <FavoriteContext.Provider value={value}>
            {children}
        </FavoriteContext.Provider>
    );
};

export const useFavorite = () => {
    const context = useContext(FavoriteContext);
    if (!context) {
        throw new Error('useFavorite must be used within a FavoriteProvider');
    }
    return context;
};
