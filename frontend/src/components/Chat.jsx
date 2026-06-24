import React, { useState, useRef, useEffect } from 'react';

const SUGGESTED = [
  "What courses does SECE offer?",
  "Tell me about the CSE department",
  "What are the admission requirements?",
  "Who is the principal of SECE?",
  "What are the placement statistics?",
  "Tell me about SECE research facilities",
];

function TypingIndicator() {
  return (
    <div className="msg-row bot">
      <Avatar />
      <div className="bubble bot typing-bubble">
        <span className="dot" /><span className="dot" /><span className="dot" />
      </div>
    </div>
  );
}

function Avatar() {
  return (
    <div className="avatar">
      <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="18" cy="18" r="18" fill="url(#grad)" />
        <text x="18" y="23" textAnchor="middle" fontSize="14" fill="white" fontWeight="bold">SE</text>
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
            <stop stopColor="#2563eb" /><stop offset="1" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

function MessageBubble({ msg }) {
  const isBot = msg.sender === 'bot';
  // Convert **bold** and newlines to formatted text
  const formatted = msg.text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>');

  return (
    <div className={`msg-row ${isBot ? 'bot' : 'user'}`}>
      {isBot && <Avatar />}
      <div className={`bubble ${isBot ? 'bot' : 'user'}`}>
        <div className="msg-text" dangerouslySetInnerHTML={{ __html: formatted }} />
        <div className="msg-time">{msg.time}</div>
      </div>
    </div>
  );
}

export default function Chat() {
  const [messages, setMessages] = useState([
    {
      id: 0, sender: 'bot', time: now(),
      text: "👋 Hello! I'm the **SECE AI Assistant**, trained on the official Sri Eshwar College of Engineering website.\n\nAsk me anything — courses, departments, admissions, faculty, events, placements, and more!",
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  function now() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  async function send(text) {
    const query = (text || input).trim();
    if (!query || loading) return;
    setInput('');
    setMessages(prev => [...prev, { id: Date.now(), sender: 'user', text: query, time: now() }]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, {
        id: Date.now() + 1, sender: 'bot',
        text: data.response || data.error || 'Something went wrong.',
        time: now(),
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now() + 1, sender: 'bot',
        text: 'Network error. Please check the backend server.',
        time: now(),
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div className="app">
      {/* Animated background orbs */}
      <div className="orb orb1" />
      <div className="orb orb2" />
      <div className="orb orb3" />

      <div className="chat-shell">
        {/* Header */}
        <header className="chat-header">
          <div className="header-left">
            <div className="header-logo">
              <svg viewBox="0 0 40 40" fill="none" width="40" height="40">
                <circle cx="20" cy="20" r="20" fill="url(#hgrad)" />
                <text x="20" y="26" textAnchor="middle" fontSize="15" fill="white" fontWeight="bold">SE</text>
                <defs>
                  <linearGradient id="hgrad" x1="0" y1="0" x2="40" y2="40">
                    <stop stopColor="#2563eb" /><stop offset="1" stopColor="#7c3aed" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div>
              <div className="header-title">SECE AI Assistant</div>
              <div className="header-sub">Sri Eshwar College of Engineering · sece.ac.in</div>
            </div>
          </div>
          <div className="status-pill">
            <span className="status-dot" />
            Online
          </div>
        </header>

        {/* Messages */}
        <div className="messages">
          {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
          {loading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        {/* Suggestions — only on empty chat */}
        {messages.length === 1 && !loading && (
          <div className="suggestions">
            {SUGGESTED.map(s => (
              <button key={s} className="suggestion-chip" onClick={() => send(s)}>{s}</button>
            ))}
          </div>
        )}

        {/* Input */}
        <form className="input-bar" onSubmit={e => { e.preventDefault(); send(); }}>
          <textarea
            ref={inputRef}
            className="chat-input"
            rows={1}
            placeholder="Ask anything about SECE..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
          />
          <button type="submit" className={`send-btn ${loading ? 'loading' : ''}`} disabled={loading || !input.trim()}>
            {loading
              ? <svg viewBox="0 0 24 24" className="spin-icon"><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" fill="none" strokeDasharray="30 60" /></svg>
              : <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
            }
          </button>
        </form>
      </div>
    </div>
  );
}
