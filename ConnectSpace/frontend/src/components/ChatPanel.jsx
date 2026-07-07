import { useState } from 'react';
import './ChatPanel.css';

export default function ChatPanel({ messages, onSend }) {
  const [text, setText] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
  }

  return (
    <div className="chat-panel">
      <div className="chat-messages">
        {messages.length === 0 && (
          <p className="empty-state">
            No messages yet. Start the conversation!
          </p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className="chat-message">
            <div className="sender">{msg.sender}</div>
            <div>{msg.message}</div>
            <div className="time">{new Date(msg.timestamp).toLocaleTimeString()}</div>
          </div>
        ))}
      </div>
      <form className="chat-input" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className="btn-primary">Send</button>
      </form>
    </div>
  );
}
