/**
 * EXAMPLE: How to use useEffectEvent in App.js
 * 
 * This file demonstrates how to refactor the socket connection code
 * using the useEffectEvent hook instead of refs.
 */

import { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEffectEvent } from './useEffectEvent';
import { disconnectSocket, initializeSocket, isSocketConnected } from '../socket';
import { LoginContext } from '../context/LoginData';
import { registerSocketId } from '../utils/socketHelper';
import { notify } from '../utils/notificationTemplates';

function AppWithUseEffectEvent() {
    const navigate = useNavigate();
    const { auth } = useContext(LoginContext);

    const [isConnected, setIsConnected] = useState(false);
    const [socketStatus, setSocketStatus] = useState('disconnected');

    // Create stable event handlers that always use the latest values
    // These won't cause the socket effect to re-run
    const emitStoreSocketData = useEffectEvent(async () => {
        try {
            const data = {
                userId: auth?.id ?? auth?.userId,
                ufcc: auth?.ufcc
            };
            if (!data.userId || !data.ufcc) return;
            await registerSocketId(data);
            console.log('📡 Player ID saved successfully');
        } catch (err) {
            console.error('❌ Failed to save Player ID:', err);
        }
    });

    const handleSessionLogout = useEffectEvent(() => {
        console.log('🔒 Session logout received');
        sessionStorage.clear();
        disconnectSocket(true);
        navigate('/login');
        notify({}, 'SESSION_LOGOUT');
    });

    useEffect(() => {
        let isMounted = true;
        let socketCleanup = null;

        const checkAndInitializeSocket = async () => {
            let token = auth?.token;
            let userId = auth?.userId;

            // Fallback to sessionStorage if no token in context
            if (!token || !userId) {
                const isLoggedIn = sessionStorage.getItem('isLoggedIn');
                const userData = sessionStorage.getItem('userData');

                if (isLoggedIn && userData) {
                    try {
                        const parsedData = JSON.parse(userData);
                        token = parsedData.token;
                        userId = parsedData.userId;
                    } catch (err) {
                        console.error('❌ Error parsing user data:', err);
                        return;
                    }
                }

                if (!token || !userId) {
                    console.log('⚠️ No auth token or userId available');
                    return;
                }
            }

            try {
                const socket = initializeSocket(token);
                console.log('🔄 Initializing socket connection...');

                if (!socket) {
                    console.error('❌ Failed to initialize socket');
                    return;
                }

                const onConnect = async () => {
                    if (!isMounted) return;
                    console.log('✅ Socket Connected');

                    // These functions always use the latest auth/navigate values
                    await emitStoreSocketData();
                    setIsConnected(true);
                    setSocketStatus('connected');
                };

                const onDisconnect = (reason) => {
                    if (!isMounted) return;
                    console.warn('⚠️ Socket disconnected:', reason);
                    setIsConnected(false);
                    setSocketStatus('disconnected');
                };

                const onConnectError = (err) => {
                    if (!isMounted) return;
                    console.error('❌ Socket connection error:', err.message);
                    setIsConnected(false);
                    setSocketStatus('error');
                };

                socket.on('connect', onConnect);
                socket.on('disconnect', onDisconnect);
                socket.on('sessionLogout', handleSessionLogout);
                socket.on('connect_error', onConnectError);

                if (socket.connected) {
                    onConnect();
                }

                const interval = setInterval(() => {
                    if (!isMounted) return;
                    const connected = isSocketConnected();
                    setIsConnected(connected);
                    setSocketStatus(connected ? 'connected' : 'disconnected');
                }, 5000);

                socketCleanup = () => {
                    clearInterval(interval);
                    socket.off('connect', onConnect);
                    socket.off('disconnect', onDisconnect);
                    socket.off('sessionLogout', handleSessionLogout);
                    socket.off('connect_error', onConnectError);
                };

            } catch (err) {
                console.error('❌ Error in socket initialization:', err);
                setIsConnected(false);
                setSocketStatus('error');
            }
        };

        checkAndInitializeSocket();

        return () => {
            isMounted = false;
            if (typeof socketCleanup === 'function') {
                socketCleanup();
            }
        };
        // Only reconnect when token changes (login/logout)
        // emitStoreSocketData and handleSessionLogout are stable and won't cause re-runs
    }, [auth?.token, emitStoreSocketData, handleSessionLogout]);

    return { isConnected, socketStatus };
}

/**
 * KEY BENEFITS OF useEffectEvent:
 * 
 * 1. Cleaner code - no need for refs
 * 2. More intuitive - looks like regular event handlers
 * 3. Type-safe - TypeScript works better with this pattern
 * 4. Future-proof - matches React's upcoming official API
 * 
 * WHEN TO USE:
 * - When you need to access latest props/state in callbacks
 * - When you don't want those values to trigger effect re-runs
 * - For event handlers used in useEffect
 * 
 * WHEN NOT TO USE:
 * - For regular event handlers (onClick, onChange, etc.) - use regular functions
 * - When you DO want the effect to re-run on value changes
 */

export default AppWithUseEffectEvent;
