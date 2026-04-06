import { Box, Typography, Button } from '@mui/material';
import WifiIcon from '@mui/icons-material/Wifi';
import PublicIcon from '@mui/icons-material/Public';
import ReplayIcon from '@mui/icons-material/Replay';
import { WifiOff } from 'lucide-react';
import './OfflineOverlay.scss';

const OfflineOverlay = () => {
    return (
        <Box className="offline-overlay-container">

            <div className="offline-icon-container">
                <WifiOff size={120} strokeWidth={1.5} />
            </div>

            <Typography variant="h4" className="offline-title">
                Internet not connected
            </Typography>

            <Typography variant="body1" className="offline-message">
                Make sure your internet connection is active.
                <span style={{ fontWeight: 'bold' }}> TeCoChat </span>
                will automatically sync your messages when you're back online.
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

        </Box>
    );
};

export default OfflineOverlay;