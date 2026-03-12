/**
 * Check if the device has a camera available
 * @returns {Promise<boolean>} - Returns true if camera is available, false otherwise
 */
export const checkCameraAvailability = async () => {
    try {
        // Check if mediaDevices API is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
            return false;
        }

        // Get list of media devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        
        // Check if any video input device (camera) exists
        const hasCamera = devices.some(device => device.kind === 'videoinput');
        
        return hasCamera;
    } catch (error) {
        console.error('Error checking camera availability:', error);
        return false;
    }
};

/**
 * Request camera permission and check if it's granted
 * @returns {Promise<{granted: boolean, stream: MediaStream|null}>}
 */
export const requestCameraPermission = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: true 
        });
        
        return { granted: true, stream };
    } catch (error) {
        console.error('Camera permission denied or error:', error);
        return { granted: false, stream: null };
    }
};

/**
 * Stop all tracks in a media stream
 * @param {MediaStream} stream - The media stream to stop
 */
export const stopMediaStream = (stream) => {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
};

/**
 * Open file picker for image selection
 * @param {Function} onFileSelect - Callback function when file is selected
 * @param {boolean} multiple - Allow multiple file selection
 */
export const openImageFilePicker = (onFileSelect, multiple = false) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = multiple;
    
    input.onchange = (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            onFileSelect(files);
        }
    };
    
    input.click();
};

/**
 * Capture photo from camera
 * @param {Function} onCapture - Callback function when photo is captured
 */
export const capturePhotoFromCamera = (onCapture) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // Use rear camera on mobile
    
    input.onchange = (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            onCapture(files);
        }
    };
    
    input.click();
};
