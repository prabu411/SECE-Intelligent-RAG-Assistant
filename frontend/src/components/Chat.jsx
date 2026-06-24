import React, { useState, useRef, useEffect } from 'react';

const SUGGESTIONS = [
  'What courses does SECE offer?',
  'Tell me about the CSE department',
  'What are the admission requirements?',
  'Who is the principal of SECE?',
  'What are SECE placement statistics?',
  'Tell me about SECE campus facilities',
  'What is the fee structure?',
  'Tell me about SECE research & labs',
];

const WELCOME = "👋 Hi! I'm the **SECE AI Assistant** — trained exclusively on the official Sri Eshwar College of Engineering website.\n\nAsk me anything about courses, admissions, departments, faculty, placements, events, and more!";

function Avatar() {
  return (
    <div className="avatar">
      <svg viewBox="0 0 38 38" fill="none">
        <defs>
          <linearGradient id="ag" x1="0" y1="0" x2="38" y2="38" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6366f1"/><stop offset="1" stopColor="#8b5cf6"/>
          </linearGradient>
        </defs>
        <circle cx="19" cy="19" r="19" fill="url(#ag)"/>
        <text x="19" y="25" textAnchor="middle" fontSize="13" fontWeight="700" fill="white" fontFamily="sans-serif">SE</text>
      </svg>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="msg-row bot">
      <Avatar />
      <div className="bubble bot typing">
        <span className="dot"/><span className="dot"/><span className="dot"/>
      </div>
    </div>
  );
}

function Bubble({ msg }) {
  const isBot = msg.role === 'bot';
  const html = msg.text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br/>');
  return (
    <div className={`msg-row ${isBot ? 'bot' : 'user'}`}>
      {isBot && <Avatar />}
      <div className={`bubble ${isBot ? 'bot' : 'user'}`}>
        <div className="msg-body" dangerouslySetInnerHTML={{ __html: html }}/>
        <div className="msg-time">{msg.time}</div>
      </div>
    </div>
  );
}

function ts() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function Chat() {
  const [msgs, setMsgs] = useState([{ id: 0, role: 'bot', text: WELCOME, time: ts() }]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, busy]);

  async function send(text) {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    setInput('');
    setMsgs(p => [...p, { id: Date.now(), role: 'user', text: q, time: ts() }]);
    setBusy(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      setMsgs(p => [...p, { id: Date.now()+1, role: 'bot', text: data.response || data.error, time: ts() }]);
    } catch {
      setMsgs(p => [...p, { id: Date.now()+1, role: 'bot', text: '⚠️ Network error. Is the backend running?', time: ts() }]);
    } finally {
      setBusy(false);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }

  return (
    <div className="app">
      <div className="orb o1"/><div className="orb o2"/><div className="orb o3"/>

      <div className="shell">

        {/* ── Header ── */}
        <header className="hdr">
          <div className="hdr-left">
            <svg viewBox="0 0 44 44" width="44" height="44" fill="none">
              <defs>
                <linearGradient id="lg" x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#6366f1"/><stop offset="1" stopColor="#8b5cf6"/>
                </linearGradient>
              </defs>
              <rect width="44" height="44" rx="12" fill="url(#lg)"/>
              <text x="22" y="29" textAnchor="middle" fontSize="16" fontWeight="800" fill="white" fontFamily="sans-serif">SE</text>
            </svg>
            <div>
              <div className="hdr-title">SECE AI Assistant</div>
              <div className="hdr-sub">Sri Eshwar College of Engineering · sece.ac.in</div>
            </div>
          </div>
          <div className="pill">
            <span className="pdot"/>
            <span>Online</span>
          </div>
        </header>

        {/* ── Messages ── */}
        <div className="msgs">
          {msgs.map(m => <Bubble key={m.id} msg={m}/>)}
          {busy && <TypingDots/>}
          <div ref={bottomRef}/>
        </div>

        {/* ── Suggestion chips ── */}
        {msgs.length === 1 && !busy && (
          <div className="chips">
            {SUGGESTIONS.map(s => (
              <button key={s} className="chip" onClick={() => send(s)}>{s}</button>
            ))}
          </div>
        )}

        {/* ── Input bar ── */}
        <form className="bar" onSubmit={e => { e.preventDefault(); send(); }}>
          <textarea
            ref={inputRef}
            className="inp"
            rows={1}
            placeholder="Ask anything about SECE..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          />
          <button type="submit" className="sbtn" disabled={busy || !input.trim()}>
            {busy
              ? <svg viewBox="0 0 24 24" className="spin"><circle cx="12" cy="12" r="9" stroke="white" strokeWidth="2.5" fill="none" strokeDasharray="28 57"/></svg>
              : <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            }
          </button>
        </form>

      </div>
    </div>
  );
}
