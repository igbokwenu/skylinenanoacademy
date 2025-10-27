// src/components/ShareModal.jsx

import React from "react";
import "./ShareModal.css";

const ShareModal = ({ isOpen, onClose, onConfirm, title, mailtoLink }) => {
  if (!isOpen) {
    return null;
  }

  const handleModalContentClick = (e) => {
    e.stopPropagation();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={handleModalContentClick}>
        <h3>{title}</h3>
        <div className="modal-body">
          <p>The content has been copied to your clipboard.</p>
          <p>
            Click 'Launch Email Client' to open your default email app. You can
            then paste the content into the email body.
          </p>
          <div className="fallback-container">
            <p>If the button doesn't work, please click this direct link:</p>
            {/* The visible, 100% reliable fallback link */}
            <a href={mailtoLink} className="fallback-link" onClick={onClose}>
              Launch Mail Manually
            </a>
          </div>
        </div>
        <div className="modal-actions">
          <button className="modal-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="modal-btn-primary" onClick={onConfirm}>
            Launch Email Client
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
