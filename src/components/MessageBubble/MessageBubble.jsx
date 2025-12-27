import { useState } from 'react';
import MessageContextMenu from './MessageContextMenu';

const MessageBubble = ({ message, onReply, onForward }) => {
  const [contextMenu, setContextMenu] = useState(null);

  const handleContextMenu = (event) => {
    event.preventDefault();
    
    // Get the message bubble element
    const messageBubble = event.currentTarget;
    const messageContent = messageBubble.querySelector('.message-content');
    const rect = messageContent.getBoundingClientRect();
    
    // Position menu based on message type
    // Sent messages: menu appears on the left side
    // Received messages: menu appears on the right side
    const isSentMessage = message.sender === 'You';
    const menuX = isSentMessage 
      ? rect.left - 8 // Left side for sent messages
      : rect.right + 8; // Right side for received messages
    const menuY = rect.top + (rect.height / 2); // Center vertically with the message
    
    setContextMenu(
      contextMenu === null
        ? {
            mouseX: menuX,
            mouseY: menuY,
          }
        : null,
    );
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  return (
    <>
      <div
        className={`message-bubble ${message.sender === 'You' ? 'sent' : 'received'}`}
        onContextMenu={handleContextMenu}
        style={{ cursor: 'context-menu' }}
      >
        {/* ---- Reply Preview (Quoted message) ---- */}
        {message.replyTo && (
          <div className="reply-preview">
            <div className="reply-line"></div>
            <div className="reply-content">
              <div className="reply-sender">
                {message.replyTo.sender === 'You' ? 'You' : message.replyTo.sender}
              </div>
              <div className="reply-text">
                {message.replyTo.text.length > 50
                  ? `${message.replyTo.text.substring(0, 50)}...`
                  : message.replyTo.text}
              </div>
            </div>
          </div>
        )}

        {/* ---- Message Content ---- */}
        <div className="message-content">
          <div className="message-text">{message.text}</div>
          <div className="message-time">{message.time}</div>
        </div>
      </div>

      {/* Context Menu */}
      <MessageContextMenu
        open={contextMenu !== null}
        onClose={handleCloseContextMenu}
        onReply={onReply}
        onForward={onForward}
        message={message}
        mouseX={contextMenu?.mouseX || null}
        mouseY={contextMenu?.mouseY || null}
      />
    </>
  );
};

export default MessageBubble;
