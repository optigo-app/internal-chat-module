import React from 'react';
import ReactDOM from 'react-dom';
import { X, Check } from 'lucide-react';
import './ConfirmationDialog.scss';

const ConfirmationDialog = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    description, 
    confirmText = "Confirm", 
    cancelText = "Cancel",
    icon: Icon,
    variant = "primary", // primary, danger, success
    showCancel = true
}) => {
    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className="confirmation-modal-overlay" onClick={onClose}>
            <div className="confirmation-modal-content" onClick={e => e.stopPropagation()}>
                <button className="close-btn-top" onClick={onClose}>
                    <X size={20} />
                </button>
                
                <div className={`modal-icon-wrapper ${variant}`}>
                    {Icon || <Check />}
                </div>

                <h2>{title}</h2>
                <p>{description}</p>

                <div className="modal-actions">
                    {showCancel && (
                        <button className="btn-cancel" onClick={onClose}>
                            {cancelText}
                        </button>
                    )}
                    <button className={`btn-confirm ${variant}`} onClick={onConfirm}>
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ConfirmationDialog;
