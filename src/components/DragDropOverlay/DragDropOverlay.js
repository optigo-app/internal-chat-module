import { Box, Typography } from '@mui/material';
import './DragDropOverlay.scss';
import { CloudUpload } from 'lucide-react';

const DragDropOverlay = ({ isDragging }) => {
    return (
        <Box className={`drag-drop-overlay ${isDragging ? 'visible' : ''}`}>
            <Box className="overlay-content">
                <CloudUpload className="upload-icon" />
                <Typography variant="h5" className="overlay-text">
                    Drop files here to upload
                </Typography>
            </Box>
        </Box>
    );
};

export default DragDropOverlay;
