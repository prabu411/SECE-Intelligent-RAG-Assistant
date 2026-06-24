import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function AdminDashboard() {
  // Config
  const [currentUrl, setCurrentUrl] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [password, setPassword] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  
  // Requests Queue
  const [requests, setRequests] = useState([]);

  // HTML Viewer
  const [viewHtmlSite, setViewHtmlSite] = useState('');
  const [htmlChunks, setHtmlChunks] = useState([]);
  const [showHtml, setShowHtml] = useState(false);

  // Chat
  const [chatInput, setChatInput] = useState('');
  const [chatLog, setChatLog] = useState([
    { role: 'bot', text: 'Admin LLM Module initialized. Ready for meta-queries.' }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchConfig();
    fetchRequests();
  }, []);

  const fetchConfig = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/admin/config/url', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setCurrentUrl(data.url);
    }
  };

  const fetchRequests = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/requests/admin', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      setRequests(await res.json());
    }
  };

  const handleUpdateUrl = async (e) => {
    e.preventDefault();
    setStatusMsg('Updating...');
    const token = localStorage.getItem('token');
    
    const res = await fetch('/api/admin/config/url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ newUrl, password })
    });
    const data = await res.json();
    
    if (res.ok) {
      setStatusMsg(`Success! Scraper started for ${data.url}`);
      setCurrentUrl(data.url);
      setNewUrl('');
      setPassword('');
    } else {
      setStatusMsg(`Error: ${data.error}`);
    }
  };

  const handleApprove = async (id) => {
    const token = localStorage.getItem('token');
    await fetch(`/api/requests/admin/${id}/approve`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    fetchRequests();
    alert('Approved! Background scraping started for that domain.');
  };

  const handleFetchHtml = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/requests/admin/html-viewer?website=${encodeURIComponent(viewHtmlSite)}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setHtmlChunks(data);
      setShowHtml(true);
    }
  };

  const handleChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    setChatLog(prev => [...prev, { role: 'admin', text: chatInput }]);
    setChatInput('');
    setIsTyping(true);

    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/chat/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ query: chatInput })
      });
      const data = await res.json();
      setChatLog(prev => [...prev, { role: 'bot', text: data.response || data.error }]);
    } catch (err) {
      setChatLog(prev => [...prev, { role: 'bot', text: 'Network error connecting to LLM.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/admin/login');
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h2>Admin Control Center</h2>
        <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
      </header>

      <div style={styles.grid}>
        
        {/* Left Column: Config & Requests */}
        <div style={{display:'flex', flexDirection:'column', gap:'20px'}}>
          <div className="glass-panel" style={styles.panel}>
            <h3>Global Scraper Configuration</h3>
            <p style={styles.subtitle}>Current Active Default: <strong>{currentUrl || 'Loading...'}</strong></p>
            <form onSubmit={handleUpdateUrl} style={styles.form}>
              <input type="url" required value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://new-site.com" style={styles.input}/>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Verify Password" style={styles.input}/>
              <button type="submit" style={styles.actionBtn}>Save & Trigger Scraper</button>
              {statusMsg && <div style={styles.statusMsg}>{statusMsg}</div>}
            </form>
          </div>

          <div className="glass-panel" style={{...styles.panel, flex:1, overflowY:'auto'}}>
            <h3>Client Request Queue</h3>
            {requests.length === 0 ? <p style={styles.subtitle}>No requests pending.</p> : (
              <div style={{display:'flex', flexDirection:'column', gap:'10px', marginTop:'10px'}}>
                {requests.map(req => (
                  <div key={req._id} style={styles.requestCard}>
                    <div>
                      <strong>{req.url}</strong>
                      <div style={{fontSize:'12px', color:'var(--text-muted)'}}>By: {req.clientUsername} | Status: <span style={{color: req.status === 'approved' ? '#10b981' : '#f59e0b'}}>{req.status}</span></div>
                    </div>
                    {req.status === 'pending' && (
                      <button onClick={() => handleApprove(req._id)} style={styles.smallBtn}>Approve</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Middle Column: HTML Viewer */}
        <div className="glass-panel" style={styles.panel}>
          <h3>Raw Scraped HTML Viewer</h3>
          <p style={styles.subtitle}>Inspect the exact HTML content stored in MongoDB for a given website.</p>
          <form onSubmit={handleFetchHtml} style={{display:'flex', gap:'10px', marginBottom:'20px'}}>
            <input type="url" required value={viewHtmlSite} onChange={e => setViewHtmlSite(e.target.value)} placeholder="https://www.sece.ac.in" style={{...styles.input, flex:1}}/>
            <button type="submit" style={styles.actionBtn}>Fetch HTML</button>
          </form>

          {showHtml && (
            <div style={styles.htmlViewer}>
              {htmlChunks.length === 0 ? <p>No data found for this domain.</p> : htmlChunks.map((chunk, i) => (
                <div key={i} style={{marginBottom:'20px', borderBottom:'1px solid var(--border-glass)', paddingBottom:'20px'}}>
                  <div style={{fontSize:'12px', color:'var(--accent-primary)', marginBottom:'10px'}}>Source URL: {chunk.url}</div>
                  {/* Renders the raw HTML directly so admin can see how it looks natively */}
                  <div style={{background:'#fff', color:'#000', padding:'10px', borderRadius:'4px', maxHeight:'300px', overflowY:'auto'}} dangerouslySetInnerHTML={{__html: chunk.rawHtml || '<i>No raw HTML stored for this legacy chunk.</i>'}} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Admin Chat */}
        <div className="glass-panel" style={styles.panel}>
          <h3>Admin xAI Module</h3>
          <div style={styles.chatBox}>
            {chatLog.map((msg, idx) => (
              <div key={idx} style={{...styles.chatBubble, alignSelf: msg.role === 'admin' ? 'flex-end' : 'flex-start', background: msg.role === 'admin' ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.05)'}}>
                {msg.text}
              </div>
            ))}
            {isTyping && <div style={{...styles.chatBubble, alignSelf: 'flex-start'}}>Typing...</div>}
          </div>
          <form onSubmit={handleChat} style={{display: 'flex', gap: '10px', marginTop: '15px'}}>
            <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Ask the xAI module..." style={{...styles.input, flex: 1}}/>
            <button type="submit" style={styles.actionBtn}>Ask</button>
          </form>
        </div>

      </div>
    </div>
  );
}

const styles = {
  container: { padding: '30px', minHeight: '100vh', display: 'flex', flexDirection: 'column' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
  logoutBtn: { padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-glass)', color: 'white', borderRadius: '8px', cursor: 'pointer' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', flex: 1, overflow:'hidden' },
  panel: { padding: '24px', display: 'flex', flexDirection: 'column' },
  subtitle: { color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  input: { padding: '10px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'rgba(0,0,0,0.3)', color: 'white', outline: 'none' },
  actionBtn: { padding: '10px', background: 'var(--accent-gradient)', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold', cursor: 'pointer' },
  statusMsg: { marginTop: '10px', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', fontSize: '14px' },
  requestCard: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px', border:'1px solid var(--border-glass)', borderRadius:'8px', background:'rgba(255,255,255,0.02)'},
  smallBtn: { padding:'6px 12px', background:'#10b981', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontSize:'12px' },
  htmlViewer: { flex:1, overflowY:'auto', padding:'10px', background:'rgba(0,0,0,0.4)', borderRadius:'8px', border:'1px solid var(--border-glass)' },
  chatBox: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', padding: '10px', border: '1px solid var(--border-glass)', borderRadius: '8px', background: 'rgba(0,0,0,0.2)' },
  chatBubble: { padding: '10px 15px', borderRadius: '12px', maxWidth: '80%', fontSize: '14px', lineHeight: '1.4' }
};

export default AdminDashboard;
