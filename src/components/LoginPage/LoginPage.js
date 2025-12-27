import React, { useState, useContext } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import './LoginPage.scss';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { toastConfig } from '../../toastConfig';
import { useNavigate } from 'react-router-dom';
import { initializeSocket, disconnectSocket } from '../../socket';
import { savePlayerId } from '../../API/SavePlayerId/SavePlayerId';
import OneSignal from 'react-onesignal';
import { LoginContext } from '../../context/LoginData';

const OptigoLogin = () => {
    const [email, setEmail] = useState('subrata@eg.com');
    const [password, setPassword] = useState('pasta');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const { setAuth } = useContext(LoginContext);

    const connectSocket = async (token = 'dummy-token') => {
        try {
            console.log('Starting socket initialization during login...');
            
            // Initialize new socket with auth token
            const socket = initializeSocket(token);
            console.log('Socket initialized successfully with token:', token);
            
            // Wait a moment to see if connection succeeds
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Check if connection was successful
            const { getSocketStatus, tryAlternativeServers } = await import('../../socket');
            const status = getSocketStatus();
            
            if (!status.connected && process.env.NODE_ENV !== 'production') {
                console.log('Primary server connection failed, trying alternatives...');
                toast.loading('Primary server unavailable, trying backup servers...', { duration: 3000 });
                
                try {
                    await tryAlternativeServers(token);
                    toast.success('Connected to backup server!', { duration: 2000 });
                } catch (altError) {
                    console.error('All servers failed:', altError);
                    toast.error('Unable to connect to any server. The app will work in offline mode.', { duration: 4000 });
                }
            }
            
            return socket;
        } catch (error) {
            console.error('Error initializing socket during login:', error);
            toast.error('Socket connection failed, but login will continue', { duration: 3000 });
            // Don't throw the error - let login continue even if socket fails
            return null;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!email || !password) {
            toast.error('Please fill in all fields');
            return;
        }

        if (!email.includes('@')) {
            toast.error('Please enter a valid email address');
            return;
        }

        setIsLoading(true);

        const loadingToast = toast.loading('Signing in...', {
            duration: 2000,
        });

        try {
            await new Promise(resolve => setTimeout(resolve, 2000));

            if (email === 'subrata@eg.com' && password === 'pasta') {
                toast.dismiss(loadingToast);
                
                // Create dummy user data for demo login
                const userData = {
                    userId: 'demo-user-123',
                    username: 'subrata',
                    ukey: 'demo-ukey',
                    token: 'dummy-demo-token',
                };
                
                // Initialize socket with auth token  
                await connectSocket(userData.token);
                
                // Set auth context and session storage
                setAuth(userData);
                sessionStorage.setItem('userData', JSON.stringify(userData));
                sessionStorage.setItem('isLoggedIn', true);
                
                // Show success message
                toast.success('Login successful! Welcome back!', {
                    duration: 4000,
                    icon: '🎉',
                });
                
                // Optional: OneSignal integration
                // try {
                //     await OneSignal.User.PushSubscription.optIn();
                //     const playerId = await OneSignal.User.PushSubscription?.id;
                //     if (playerId && socket?.id) {
                //         await savePlayerId(socket.id, playerId, userData.userId);
                //     }
                // } catch (err) {
                //     console.error("Error with OneSignal subscription or saving player ID:", err);
                // }
                
                console.log('Demo login completed successfully');
                navigate('/');
            } else {
                toast.dismiss(loadingToast);
                toast.error('Invalid email or password. Please try again.', {
                    duration: 4000,
                });
            }
        } catch (error) {
            toast.dismiss(loadingToast);
            console.error('Login error:', error);
            
            toast.error('Something went wrong. Please try again.', {
                duration: 4000,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const handleEmailChange = (e) => {
        setEmail(e.target.value);
        if (e.target.value && e.target.value.includes('@')) {
            toast.dismiss();
        }
    };

    const handlePasswordChange = (e) => {
        setPassword(e.target.value);
        if (e.target.value && e.target.value.length >= 6) {
            toast.dismiss();
        }
    };

    return (
        <div className="login-container">
            <Toaster {...toastConfig} />
            <div className="login-card">
                <div className="login-content">
                    <div className="logo-section">
                        <div className="loginPage_logoDiv">
                            <img src="./logo.png" alt="logo" className='loginPage_logo' />
                        </div>
                        <div className="logo-underline"></div>
                        <p className="logo-subtitle">Sign in to your account to continue</p>
                    </div>

                    <form className="login-form" onSubmit={handleSubmit}>
                        <div className="input-group">
                            <div className="input-wrapper">
                                <Mail className="input-icon" size={20} />
                                <input
                                    type="email"
                                    placeholder="Enter your email"
                                    value={email}
                                    onChange={handleEmailChange}
                                    className="form-input"
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        <div className="input-group">
                            <div className="input-wrapper">
                                <Lock className="input-icon" size={20} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Password"
                                    value={password}
                                    onChange={handlePasswordChange}
                                    className="form-input"
                                    required
                                    disabled={isLoading}
                                />
                                <button
                                    type="button"
                                    onClick={togglePasswordVisibility}
                                    className="password-toggle"
                                    disabled={isLoading}
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        <div className="checkbox-group">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="checkbox-input"
                                    disabled={isLoading}
                                />
                                <span className="checkbox-custom"></span>
                                Remember me
                            </label>
                        </div>

                        <button
                            type="submit"
                            className="sign-in-button"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default OptigoLogin;