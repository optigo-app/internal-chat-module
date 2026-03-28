import React, { createContext, useState, useEffect, useCallback } from "react";

// Create Context
export const LoginContext = createContext();

// Provider Component
export const LoginData = ({ children }) => {


    const [token, setToken] = useState(() => {
        try {
            const sessionData = sessionStorage.getItem('token');
            if (sessionData) {
                return {
                    sv: sessionData?.rd?.[0]?.sv || "",
                    yc: sessionData?.rd?.[0]?.yc || "",
                };
            }
        } catch (error) {
            console.error('❌ LoginContext: Error fetching token from sessionStorage:', error);
            sessionStorage.removeItem('token');
        }

        return {
            sv: "",
            yc: "",
        };
    });

    // Initialize state from sessionStorage if available
    const [auth, setAuth] = useState(() => {
        try {
            const sessionData = sessionStorage.getItem('userData');
            if (sessionData) {
                const parsed = JSON.parse(sessionData);
                return {
                    ...parsed,
                    userId: parsed?.userId || "",
                    username: parsed?.username || "",
                    ukey: parsed?.ukey || "",
                    token: parsed?.token || "",
                    id: parsed?.id || "",
                    ufcc: parsed?.ufcc || parsed?.companycode || ""
                };
            }
        } catch (error) {
            console.error('❌ LoginContext: Error parsing userData from sessionStorage:', error);
            sessionStorage.removeItem('userData');
            sessionStorage.removeItem('isLoggedIn');
        }
        return {
            userId: "",
            username: "",
            ukey: "",
            token: "",
            id: "",
            ufcc: "",
        };
    });

    // State for sync functionality
    const [isSyncing, setIsSyncing] = useState(false);

    // Function to trigger sync from child components
    const startSync = useCallback(async (syncCallback) => {
        setIsSyncing(true);
        try {
            // If a callback is provided, wait for it to complete
            if (typeof syncCallback === 'function') {
                await syncCallback();
            }
            return true; // Indicate success
        } catch (error) {
            console.error('Sync error:', error);
            return false; // Indicate failure
        } finally {
            setIsSyncing(false);
        }
    }, []);

    const [permissions, setPermissions] = useState(() => {
        try {
            const permissionsData = sessionStorage.getItem('userPermissions');
            return permissionsData ? JSON.parse(permissionsData) : null;
        } catch (error) {
            console.error('❌ LoginContext: Error parsing permissions from sessionStorage:', error);
            sessionStorage.removeItem('userPermissions');
            return null;
        }
    });

    // Update sessionStorage whenever auth changes
    useEffect(() => {
        if (auth?.userId) {  // Check for userId instead of ukey
            sessionStorage.setItem('userData', JSON.stringify(auth));
        }
    }, [auth]);

    // Update sessionStorage whenever permissions change
    let PERMISSION_SET = new Set(permissions?.map(p => p.Id) || []);

    useEffect(() => {
        if (permissions) {
            sessionStorage.setItem('userPermissions', JSON.stringify(permissions));
        }
    }, [permissions]);
    return (
        <LoginContext.Provider
            value={{
                auth,
                setAuth,
                token,
                setToken,
                permissions,
                setPermissions,
                PERMISSION_SET,
                isSyncing,
                startSync,
                setIsSyncing
            }}
        >
            {children}
        </LoginContext.Provider>
    );
};