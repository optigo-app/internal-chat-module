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

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <LoginData>
          <App />
        </LoginData>
      </BrowserRouter>
    </ThemeProvider>
  </>
);

reportWebVitals();