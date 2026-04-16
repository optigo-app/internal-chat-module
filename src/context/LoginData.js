import React, { createContext, useState, useEffect, useCallback } from "react";
import { getCookie, setCookie, eraseCookie } from "../utils/cookieUtils";

// Create Context
export const LoginContext = createContext();

// Provider Component
export const LoginData = ({ children }) => {


    const [token, setToken] = useState(() => {
        try {
            const sessionData = sessionStorage.getItem('token');
            if (sessionData) {
                const parsed = JSON.parse(sessionData);
                return {
                    sv: parsed?.sv || parsed?.rd?.[0]?.sv || "",
                    yc: parsed?.yc || parsed?.rd?.[0]?.yc || "",
                };
            }
            // Fallback to cookie for Remember Me
            const cookieData = getCookie('token');
            if (cookieData) {
                const parsed = JSON.parse(cookieData);
                return {
                    sv: parsed?.sv || "",
                    yc: parsed?.yc || "",
                };
            }
        } catch (error) {
            console.error('❌ LoginContext: Error fetching token:', error);
            sessionStorage.removeItem('token');
            eraseCookie('token');
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
            let parsed = null;
            if (sessionData) {
                parsed = JSON.parse(sessionData);
            } else {
                // Fallback to cookie for Remember Me
                const cookieData = getCookie('userData');
                if (cookieData) {
                    parsed = JSON.parse(cookieData);
                }
            }

            if (parsed) {
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
            console.error('❌ LoginContext: Error parsing userData:', error);
            sessionStorage.removeItem('userData');
            sessionStorage.removeItem('isLoggedIn');
            eraseCookie('userData');
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
            sessionStorage.setItem('isLoggedIn', 'true');
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