import ReactDOM from 'react-dom/client';
import './index.css';
import './global.scss';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';
import { LoginData } from './context/LoginData';
import { FavoriteProvider } from './contexts/FavoriteContext';
import { RemoveInGroupProvider } from './contexts/RemoveInGroupContext';
import { GroupAdminModeProvider } from './contexts/GroupAdminModeContext';
import { GroupSocketProvider } from './contexts/GroupSocketContext';

import { HelmetProvider } from 'react-helmet-async';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <HelmetProvider>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <LoginData>
          <FavoriteProvider>
            <RemoveInGroupProvider>
              <GroupAdminModeProvider>
                <GroupSocketProvider>
                  <App />
                </GroupSocketProvider>
              </GroupAdminModeProvider>
            </RemoveInGroupProvider>
          </FavoriteProvider>
        </LoginData>
      </BrowserRouter>
    </ThemeProvider>
  </HelmetProvider>
);

reportWebVitals();