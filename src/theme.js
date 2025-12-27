import { createTheme } from '@mui/material/styles';

const poppinsFont = "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif";

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#7367f0',
      light: '#7367f0',
      dark: '#7367f0',
      gradient: 'linear-gradient(270deg, rgba(115, 103, 240, 0.7) 0%, #7367f0 100%)',
      blue: '#007bfc',
      secondary: '#7D7f85',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#7367f0',
      light: '#7367f0',
      dark: '#7367f0',
      contrastText: '#ffffff',
    },
    success: {
      main: '#1d9051ff',
      light: '#c8e6c9',
      lightBg: 'rgba(40, 199, 111, 0.16)',
    },

    error: {
      main: '#d32f2f',
      light: '#ffcdd2',
      lightBg: 'rgba(211, 47, 47, 0.16)',
    },

    warning: {
      main: '#f57c00',
      light: '#ffe0b2',
      lightBg: 'rgba(245, 124, 0, 0.16)',
    },

    info: {
      main: '#00CFE8',
      light: '#b3e5fc',
      lightBg: 'rgba(0, 207, 232, 0.16)',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
      hightlight: '#7367f0'
    },
    text: {
      primary: '#444050',
      secondary: '#7D7f85',
      disabled: '#666666',
      dark: '#0A0A0A',
      light: '#bebebeff',
      extraLight: '#f1f1f1',
    },
    borderColor: {
      main: '#7367f0',
      light: '#7367f0',
      dark: '#7367f0',
      secondary: '#7D7f85',
      extraLight: '#5a5a5a0e',
      contrastText: '#ffffff',
    },
    button: {
      background: 'linear-gradient(270deg, rgba(115, 103, 240, 0.7) 0%, #7367f0 100%);',
      color: '#ffffff',
      hilightColor: '#7367f0',
      hoverColor: '#7367f0',
      activeColor: '#7367f0',
      disabledColor: '#7367f0',
      focusColor: '#7367f0',
      selectedColor: '#7367f0',
    },
    importance: {
      high: {
        background: 'linear-gradient(270deg, rgba(115, 103, 240, 0.7) 0%, #7367f0 100%);',
        text: '#444050',
      },
      low: {
        background: 'linear-gradient(135deg, #f7f7f7 0%, #e5e5e5 100%)',
        text: '#444050',
      },
    },
    shadow: {
      boxShadow: 'rgba(0, 0, 0, 0.05) 0px 6px 24px, rgba(0, 0, 0, 0.03) 0px 0px 0px 1px;',
      boxShadow1:
        "0 4px 16px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.08)",
    },
    grey: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#eeeeee',
      300: '#e0e0e0',
      400: '#bdbdbd',
      500: '#9e9e9e',
      600: '#757575',
      700: '#616161',
      800: '#424242',
      900: '#212121',
    },
  },
  typography: {
    fontFamily: poppinsFont,
    h1: {
      fontFamily: poppinsFont,
      fontWeight: 700,
      fontSize: '2.5rem',
      lineHeight: 1.2,
    },
    h2: {
      fontFamily: poppinsFont,
      fontWeight: 600,
      fontSize: '2rem',
      lineHeight: 1.3,
    },
    h3: {
      fontFamily: poppinsFont,
      fontWeight: 600,
      fontSize: '1.75rem',
      lineHeight: 1.3,
    },
    h4: {
      fontFamily: poppinsFont,
      fontWeight: 600,
      fontSize: '1.5rem',
      lineHeight: 1.4,
    },
    h5: {
      fontFamily: poppinsFont,
      fontWeight: 600,
      fontSize: '1.25rem',
      lineHeight: 1.4,
    },
    h6: {
      fontFamily: poppinsFont,
      fontWeight: 600,
      fontSize: '1.125rem',
      lineHeight: 1.4,
    },
    subtitle1: {
      fontFamily: poppinsFont,
      fontWeight: 500,
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    subtitle2: {
      fontFamily: poppinsFont,
      fontWeight: 500,
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    body1: {
      fontFamily: poppinsFont,
      fontWeight: 400,
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    body2: {
      fontFamily: poppinsFont,
      fontWeight: 400,
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    button: {
      fontFamily: poppinsFont,
      fontWeight: 500,
      fontSize: '0.875rem',
      lineHeight: 1.75,
      textTransform: 'none',
    },
    caption: {
      fontFamily: poppinsFont,
      fontWeight: 400,
      fontSize: '0.75rem',
      lineHeight: 1.66,
    },
    overline: {
      fontFamily: poppinsFont,
      fontWeight: 400,
      fontSize: '0.75rem',
      lineHeight: 2.66,
      textTransform: 'uppercase',
    },
  },
  shape: {
    borderRadius: 8,
  },
  spacing: 8,
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          fontFamily: poppinsFont,
      },
    },
  },
  MuiButton: {
    styleOverrides: {
      root: {
        fontFamily: poppinsFont,
        fontWeight: 500,
        textTransform: 'none',
        borderRadius: 8,
        padding: '8px 16px',
      },
    },
  },
  MuiTextField: {
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          fontFamily: poppinsFont,
        },
        '& .MuiInputLabel-root': {
          fontFamily: poppinsFont,
        },
      },
    },
  },
  MuiMenuItem: {
    styleOverrides: {
      root: {
        fontFamily: poppinsFont,
        fontWeight: 500,
      },
    },
  },
  MuiTypography: {
    styleOverrides: {
      root: {
        fontFamily: poppinsFont,
      },
    },
  },
  MuiIconButton: {
    styleOverrides: {
      root: {
        fontFamily: poppinsFont,
      },
    },
  },
},
});

export default theme; 