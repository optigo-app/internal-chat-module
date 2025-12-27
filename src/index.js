import { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './global.scss';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';
import { LoginData } from './context/LoginData';
import { GetCredentialsFromCookie } from './utils/FetchToken';

// Create a wrapper component to handle the redirection logic
// const AppWithAuth = () => {
//   const navigate = useNavigate();

//   useEffect(() => {
//     // Check authentication status on initial load
//     const checkAuth = () => {
//       const credentials = GetCredentialsFromCookie();
//       const isLoginPage = window.location.pathname === '/login';

//       // If user is authenticated and on login page, redirect to home
//       if (credentials && isLoginPage) {
//         navigate('/');
//         return;
//       }

//       // If user is not authenticated and not on login page, redirect to login
//       if (!credentials && !isLoginPage) {
//         // Check sessionStorage as fallback
//         const sessionToken = JSON.parse(sessionStorage.getItem("token"));
//         if (!sessionToken) {
//           navigate('/login');
//         }
//       }
//     };

//     checkAuth();
//   }, [navigate]);

//   return <App />;
// };

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  // <React.StrictMode>
  <>
    {/* <div
      style={{
        position: 'fixed',
        top: '10px',
        right: '50%',
        background: 'red',
        color: 'white',
        padding: '6px 40px',
        fontWeight: 'bold',
        fontSize: '20px',
        zIndex: 999999,
        whiteSpace: 'nowrap',
        boxShadow: '2px 2px 10px rgba(0,0,0,0.2)',
      }}
    >
      Prototype
    </div> */}
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <LoginData>
          {/* <AppWithAuth /> */}
          <App />
        </LoginData>
      </BrowserRouter>
    </ThemeProvider>
  </>
  // </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();