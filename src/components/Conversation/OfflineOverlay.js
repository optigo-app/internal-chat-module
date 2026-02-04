import { Box, Typography, Button } from '@mui/material';
import WifiIcon from '@mui/icons-material/Wifi';
import PublicIcon from '@mui/icons-material/Public';
import ReplayIcon from '@mui/icons-material/Replay';
import './OfflineOverlay.scss';
import offlineImage from '../../assets/offline-state.png';

const OfflineOverlay = () => {
    return (
        <Box className="offline-overlay-container">
            <div className="offline-image-container">
                <img src={offlineImage} alt="Offline" loading="lazy" />
            </div>

            <Typography variant="h4" className="offline-title">
                Internet not connected
            </Typography>

            <Typography variant="body1" className="offline-message">
                Make sure your internet connection is active.
                <span style={{ fontWeight: 'bold' }}>TeCoChat</span> will automatically sync your messages when you're back online.
            </Typography>

            <Button
                startIcon={<WifiIcon />}
                className="action-button"
                variant="outlined"
            >
                Check your Wi-Fi or Ethernet cable
            </Button>

            <Button
                startIcon={<PublicIcon />}
                className="action-button"
                variant="outlined"
            >
                Try opening other websites to verify access
            </Button>

            <Button
                startIcon={<ReplayIcon />}
                className="retry-button"
                onClick={() => window.location.reload()}
            >
                Retry
            </Button>

            {/* <a href="https://faq.whatsapp.com/web/troubleshooting/problems-connecting-to-whatsapp/?lang=en" target="_blank" rel="noreferrer" style={{ marginTop: '16px', color: '#00a884', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>
                Learn more about connectivity issues
            </a> */}
        </Box>
    );
};

export default OfflineOverlay;
