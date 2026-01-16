import './App.css';
import { useEffect, useState, useContext } from 'react';
import { useNavigate, Routes, Route, useLocation, matchPath, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import toast, { Toaster } from 'react-hot-toast';
import LoginPage1 from './components/LoginPage/LoginPage1';
import Home from './components/Home/Home';
import Customers from './components/Customers/Customers';
import Header from './components/Header/Header';
import Sidebar from './components/Siderbar/Sidebar';
import CustomerDetails from './components/CustomerDetails/CustomerDetails';
import { TagsProvider } from './contexts/TagsContexts';
import { ArchieveProvider } from './contexts/ArchieveContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { disconnectSocket, initializeSocket, isSocketConnected } from './socket';
import { toastConfig } from './toastConfig';
import { LoginContext } from './context/LoginData';
import { registerSocketId } from './utils/socketHelper';
import { notify } from './utils/notificationTemplates';
import { unlockAudio } from './utils/sound';
import LoginExists from './components/LoginExists/LoginExists';
import Changelog from './components/Changelog/Changelog';
import Lottie from 'lottie-react';
import loader from './assets/lotties/loader.json';
import ChatHeader from './TestPage/ChatHeader';

const PagenotFound = () => <div>404 - Page Not Found</div>;

function RedirectIfAuthenticated({ children }) {
  const isLoggedIn = sessionStorage.getItem('isLoggedIn');
  const userData = sessionStorage.getItem('userData');

  if (isLoggedIn && userData) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function Layout({ children, onStatusSelect, selectedStatus, onTagSelect, selectedTag }) {
  const location = useLocation();
  const match = matchPath('/conversation/:conversationId', location.pathname);
  const showCustomerDetails = Boolean(match);

  return (
    <Box>
      <TagsProvider>
        <ArchieveProvider>
          <Header />
          <Sidebar
            onStatusSelect={onStatusSelect}
            selectedStatus={selectedStatus}
            onTagSelect={onTagSelect}
            selectedTag={selectedTag}
          />

          {/* Global CustomerDetails view */}
          {showCustomerDetails && (
            <Box sx={{ marginLeft: '300px', padding: '16px', borderBottom: '1px solid #ccc' }}>
              <CustomerDetails />
            </Box>
          )}

          <Box sx={{ marginLeft: '260px' }}>
            {children}
          </Box>
        </ArchieveProvider>
      </TagsProvider>
    </Box>
  );
}

function App() {
  const navigate = useNavigate();
  const { auth, isSyncing } = useContext(LoginContext);

  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedTag, setSelectedTag] = useState('All');
  const [isConnected, setIsConnected] = useState(false);
  const [socketStatus, setSocketStatus] = useState('disconnected');

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
          return <div>Loading...</div>;
        }
      }

      try {
        const socket = initializeSocket(token);
        console.log('🔄 Initializing socket connection...');

        if (!socket) {
          console.error('❌ Failed to initialize socket');
          return;
        }

        const emitStoreSocketData = async () => {
          if (!isMounted) return;
          try {
            const data = {
              userId: auth?.id ?? auth?.userId ?? userId,
              ufcc: auth?.ufcc
            };
            if (!data.userId || !data.ufcc) return;
            await registerSocketId(data);
            console.log('📡 Player ID saved successfully');
          } catch (err) {
            console.error('❌ Failed to save Player ID:', err);
          }
        };

        /** 🔗 On successful connection (also fires after reconnect) */
        const onConnect = async () => {
          if (!isMounted) return;
          console.log('✅ Socket connected:', socket.id);
          await emitStoreSocketData();
          setIsConnected(true);
          setSocketStatus('connected');
        };

        /** ⚠️ On disconnect */
        const onDisconnect = (reason) => {
          if (!isMounted) return;
          console.warn('⚠️ Socket disconnected:', reason);
          setIsConnected(false);
          setSocketStatus('disconnected');
        };

        /** 🔐 Handle session logout */
        const onSessionLogout = () => {
          if (!isMounted) return;
          console.log('🔒 Session logout received');

          // Clear session data
          sessionStorage.clear();

          // Disconnect socket
          disconnectSocket(true);

          // Redirect to login page
          navigate('/login');

          // Show a message to the user
          notify({}, 'SESSION_LOGOUT');
        };

        /** ❌ On error */
        const onConnectError = (err) => {
          if (!isMounted) return;
          console.error('❌ Socket connection error:', err.message);
          setIsConnected(false);
          setSocketStatus('error');
        };

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('sessionLogout', onSessionLogout);
        socket.on('connect_error', onConnectError);

        // Reload case: socket may already be connected (restoreConnection ran before App mounted)
        if (socket.connected) {
          onConnect();
        }

        // Periodic connection status check
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
          socket.off('sessionLogout', onSessionLogout);
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
  }, [auth?.token, auth?.id, auth?.userId, auth?.ufcc, navigate]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const isLoggedIn = sessionStorage.getItem('isLoggedIn');
      const userData = JSON.parse(sessionStorage.getItem('userData') || '{}');
      const hasExistingSocket = sessionStorage.getItem('hasSocketId');

      if (!isLoggedIn) {
        if (hasExistingSocket) {
          navigate('/session-check');
        } else if (userData?.id) {
          navigate('/');
        } else {
          disconnectSocket(true);
          navigate('/login');
        }
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [navigate]);

  useEffect(() => {
    window.addEventListener('click', unlockAudio, { once: true });
    return () => window.removeEventListener('click', unlockAudio);
  }, []);

  return (
    <NotificationProvider>
      <Toaster {...toastConfig} />
      {isSyncing && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
            backdropFilter: 'blur(3px)',
          }}
        >
          <Box sx={{ width: 200, height: 200 }}>
            <Lottie
              animationData={loader}
              loop={true}
              style={{ width: '100%', height: '100%' }}
            />
            <Box sx={{ textAlign: 'center', mt: 2, color: '#333', fontWeight: 500 }}>
              Syncing Data...
            </Box>
          </Box>
        </Box>
      )}
      <div className="app_mainDiv">
        <Routes>
          <Route path="/login" element={<RedirectIfAuthenticated><LoginPage1 /></RedirectIfAuthenticated>} />
          <Route path="/session-check" element={<LoginExists />} />
          <Route path="/test" element={<ChatHeader chatId="123" />} />
          <Route
            path="*"
            element={
              <Layout
                onStatusSelect={setSelectedStatus}
                selectedStatus={selectedStatus}
                onTagSelect={setSelectedTag}
                selectedTag={selectedTag}
              >
                <Routes>
                  <Route
                    path="/"
                    element={<Home selectedStatus={selectedStatus} selectedTag={selectedTag} isConnected={isConnected} socketStatus={socketStatus} />}
                  />
                  <Route path="/changelog" element={<Changelog />} />
                  <Route path="/add-conversation" element={<Customers />} />
                  <Route path="/notification" element={<Customers />} />
                  <Route path="/archieve" element={<Customers />} />
                  <Route path="*" element={<PagenotFound />} />
                </Routes>
              </Layout>
            }
          />
        </Routes>
      </div>
    </NotificationProvider>
  );
}

export default App;
