import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function AdminAuth() {
  const [username, setUsername] = useState('Ganeshprabu');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      
      if (res.ok) {
        if (data.role !== 'admin') {
          setError('Access denied: Admin role required');
          return;
        }
        localStorage.setItem('token', data.token);
        localStorage.setItem('role', data.role);
        navigate('/admin/dashboard');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Network error');
    }
  };

  return (
    <div style={styles.container}>
      <div className="glass-panel" style={styles.authCard}>
        <h2 style={styles.title}>Admin Portal</h2>
        <p style={styles.subtitle}>Dynamic Universal RAG System</p>
        
        {error && <div style={styles.error}>{error}</div>}
        
        <form onSubmit={handleLogin} style={styles.form}>
          <input 
            type="text" 
            placeholder="Username" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            style={styles.input} 
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            style={styles.input} 
          />
          <button type="submit" style={styles.button}>Authenticate</button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-primary)',
  },
  authCard: {
    padding: '40px',
    width: '100%',
    maxWidth: '400px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    textAlign: 'center'
  },
  title: { fontSize: '24px', fontWeight: 'bold' },
  subtitle: { color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' },
  error: { color: '#ef4444', fontSize: '14px', padding: '10px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  input: {
    padding: '14px',
    borderRadius: '10px',
    border: '1px solid var(--border-glass)',
    background: 'rgba(0,0,0,0.2)',
    color: 'white',
    outline: 'none'
  },
  button: {
    padding: '14px',
    borderRadius: '10px',
    border: 'none',
    background: 'var(--accent-gradient)',
    color: 'white',
    fontWeight: 'bold',
    cursor: 'pointer'
  }
};

export default AdminAuth;
