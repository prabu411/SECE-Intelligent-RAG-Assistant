import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function ClientChat() {
  const [activeSite, setActiveSite] = useState('https://www.sece.ac.in');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // Custom Site Requests
  const [newRequestUrl, setNewRequestUrl] = useState('');
  const [myRequests, setMyRequests] = useState([]);
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchMyRequests();
    initChat(activeSite);
  }, []);

  const fetchMyRequests = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/requests/client', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setMyRequests(data);
    }
  };

  const handleRequestSite = async (e) => {
    e.preventDefault();
    if (!newRequestUrl) return;
    const token = localStorage.getItem('token');
    await fetch('/api/requests/client', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ url: newRequestUrl })
    });
    setNewRequestUrl('');
    fetchMyRequests();
    alert('Website request sent to Admin for approval.');
  };

  const initChat = (siteUrl) => {
    setActiveSite(siteUrl);
    setMessages([
      {
        id: Date.now(),
        sender: 'bot',
        text: `Connected to xAI Engine. I am strictly sandboxed to answer questions based ONLY on the content from ${siteUrl}.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: input,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/chat/client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ query: userMessage.text, targetUrl: activeSite })
      });
      const data = await res.json();
      
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'bot',
          text: data.response || data.error,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, sender: 'bot', text: 'Network error connecting to Gemini.', timestamp: '' }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <div style={styles.container}>
      <aside style={styles.sidebar}>
        <div style={styles.logoContainer}>
          <div style={styles.logoIcon}>GEM</div>
          <div>
            <h1 style={styles.title}>Client Portal</h1>
            <p style={styles.subtitle}>Powered by Google Gemini</p>
          </div>
        </div>

        <div style={styles.navSection}>
          <h3 style={styles.navHeader}>Available Bots</h3>
          <div 
            style={{...styles.botSelector, borderColor: activeSite === 'https://www.sece.ac.in' ? '#3b82f6' : 'var(--border-glass)'}}
            onClick={() => initChat('https://www.sece.ac.in')}
          >
            <strong>Default RAG</strong>
            <span style={{fontSize:'11px', color:'var(--text-muted)'}}>SECE Data Source</span>
          </div>

          {myRequests.filter(r => r.status === 'approved').map(req => (
            <div 
              key={req._id}
              style={{...styles.botSelector, borderColor: activeSite === req.url ? '#3b82f6' : 'var(--border-glass)'}}
              onClick={() => initChat(req.url)}
            >
              <strong>Custom RAG</strong>
              <span style={{fontSize:'11px', color:'var(--text-muted)'}}>{req.url}</span>
            </div>
          ))}
        </div>

        <div style={styles.navSection}>
          <h3 style={styles.navHeader}>Request Custom Website</h3>
          <form onSubmit={handleRequestSite} style={{display:'flex', flexDirection:'column', gap:'10px'}}>
            <input 
              type="url" 
              placeholder="https://example.com"
              value={newRequestUrl}
              onChange={e => setNewRequestUrl(e.target.value)}
              style={styles.smallInput}
            />
            <button type="submit" style={styles.smallBtn}>Submit Request</button>
          </form>
        </div>

        <div style={{flex: 1}}></div>
        <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
      </aside>

      <main style={styles.chatArea}>
        <header style={styles.chatHeader}>
          <h2>Live Assistant - {activeSite}</h2>
          <div style={styles.badge}>Gemini Sandboxed</div>
        </header>

        <div style={styles.messageList}>
          {messages.map((msg) => (
            <div key={msg.id} style={{ ...styles.messageWrapper, justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
              {msg.sender !== 'user' && <div style={styles.botAvatar}>🤖</div>}
              <div style={{
                  ...styles.messageBubble,
                  background: msg.sender === 'user' ? 'var(--accent-gradient)' : 'var(--bg-secondary)',
                  borderRadius: msg.sender === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px'
              }}>
                <div style={styles.messageText}>{msg.text}</div>
                <div style={styles.messageTime}>{msg.timestamp}</div>
              </div>
            </div>
          ))}
          {isTyping && <div style={styles.messageWrapper}><div style={styles.botAvatar}>🤖</div><div style={styles.messageBubble}>Typing...</div></div>}
        </div>

        <form onSubmit={handleSend} style={styles.inputArea}>
          <input type="text" placeholder="Ask a question strictly about the website..." value={input} onChange={(e) => setInput(e.target.value)} style={styles.input} />
          <button type="submit" style={styles.sendButton}>Send</button>
        </form>
      </main>
    </div>
  );
}

const styles = {
  container: { display: 'flex', flex: 1, height: '100vh', overflow: 'hidden' },
  sidebar: { width: '300px', backgroundColor: 'var(--bg-secondary)', borderRight: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', padding: '24px', overflowY: 'auto' },
  logoContainer: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '30px' },
  logoIcon: { width: '40px', height: '40px', borderRadius: '8px', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#fff' },
  title: { fontSize: '18px', fontWeight: 'bold' },
  subtitle: { fontSize: '12px', color: 'var(--text-secondary)' },
  navSection: { marginBottom: '30px' },
  navHeader: { fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px' },
  botSelector: { padding: '12px', border: '1px solid', borderRadius: '8px', background: 'var(--bg-primary)', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' },
  smallInput: { padding: '10px', borderRadius: '6px', border: '1px solid var(--border-glass)', background: 'var(--bg-primary)', color: 'white', outline: 'none', fontSize:'13px' },
  smallBtn: { padding: '10px', background: 'var(--accent-primary)', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontSize:'13px', fontWeight:'bold' },
  logoutBtn: { padding: '10px', background: 'transparent', border: '1px solid var(--border-glass)', color: 'white', borderRadius: '8px', cursor: 'pointer', width:'100%' },
  chatArea: { flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' },
  chatHeader: { height: '70px', borderBottom: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px' },
  badge: { background: 'rgba(0,0,0,0.5)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', padding: '6px 12px', borderRadius: '20px', fontSize: '12px' },
  messageList: { flex: 1, overflowY: 'auto', padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' },
  messageWrapper: { display: 'flex', gap: '12px', alignItems: 'flex-end', maxWidth: '80%' },
  botAvatar: { width: '36px', height: '36px', borderRadius: '50%', background: '#000', border: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' },
  messageBubble: { padding: '12px 18px', maxWidth: '100%', color: 'var(--text-primary)' },
  messageText: { fontSize: '15px', lineHeight: '1.5' },
  messageTime: { fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginTop: '6px', textAlign: 'right' },
  inputArea: { padding: '24px 32px', borderTop: '1px solid var(--border-glass)', display: 'flex', gap: '16px', backgroundColor: 'var(--bg-secondary)' },
  input: { flex: 1, background: 'var(--bg-primary)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '16px 20px', color: 'var(--text-primary)', outline: 'none' },
  sendButton: { background: '#000', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '0 28px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' },
};

export default ClientChat;
