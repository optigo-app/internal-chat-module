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
    showCancel = true,
    actions = [], // Array of { label, onClick, variant, danger }
    children
}) => {
    if (!isOpen) return null;

    const renderActions = () => {
        if (actions && actions.length > 0) {
            return actions.map((action, index) => (
                <button 
                    key={index} 
                    className={`btn-action ${action.variant || ''} ${action.danger ? 'danger' : ''}`}
                    onClick={() => {
                        action.onClick?.();
                        if (action.autoClose !== false) onClose();
                    }}
                >
                    {action.label}
                </button>
            ));
        }

        return (
            <>
                {showCancel && (
                    <button className="btn-cancel" onClick={onClose}>
                        {cancelText}
                    </button>
                )}
                <button className={`btn-confirm ${variant}`} onClick={onConfirm}>
                    {confirmText}
                </button>
            </>
        );
    };

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
                <p>{description?.replace(/\/n/g, '\n')}</p>

                {children}

                <div className={`modal-actions ${actions.length > 2 ? 'vertical' : ''}`}>
                    {renderActions()}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ConfirmationDialog;
