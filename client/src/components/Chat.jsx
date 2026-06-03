import React, { useState, useRef, useEffect } from 'react';

export default function Chat({ messages, onSend, username }) {
  const [text, setText] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full bg-gray-800 rounded-xl border border-gray-700">
      <div className="px-4 py-3 border-b border-gray-700 font-semibold text-sm text-gray-300">Chat</div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {messages.map((msg, i) => (
          <div key={i} className={`text-sm ${msg.userId === 'system' ? 'text-gray-500 italic' : ''}`}>
            {msg.userId !== 'system' && (
              <span className={`font-semibold ${msg.username === username ? 'text-blue-400' : 'text-gold'}`}>
                {msg.username}:{' '}
              </span>
            )}
            <span className="text-gray-300">{msg.text}</span>
            <span className="text-gray-600 text-xs ml-1">{formatTime(msg.time)}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="p-3 border-t border-gray-700 flex gap-2">
        <input
          className="input flex-1 text-sm py-1"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Escribir mensaje..."
          maxLength={200}
        />
        <button type="submit" className="btn-primary px-3 py-1 text-sm">→</button>
      </form>
    </div>
  );
}
