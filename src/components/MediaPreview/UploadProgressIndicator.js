import React from 'react';
import './UploadProgressIndicator.scss';

const UploadProgressIndicator = ({ progress, fileName }) => {
  // Ensure progress is between 0 and 100
  const clampedProgress = Math.max(0, Math.min(100, progress || 0));
  
  return (
    <div className="upload-progress-indicator">
      <div className="progress-info">
        <span className="file-name">{fileName}</span>
        <span className="progress-percent">{Math.round(clampedProgress)}%</span>
      </div>
      <div className="progress-bar-container">
        <div 
          className="progress-bar-fill" 
          style={{ width: `${clampedProgress}%` }}
        ></div>
      </div>
    </div>
  );
};

export default UploadProgressIndicator;