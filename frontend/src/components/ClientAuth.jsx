import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

function ClientAuth() {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      
      if (res.ok) {
        if (isRegister) {
          setIsRegister(false);
          setError('');
          alert('Registration successful. Please login.');
        } else {
          localStorage.setItem('token', data.token);
          localStorage.setItem('role', data.role);
          navigate('/');
        }
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch (err) {
      setError('Network error');
    }
  };

  return (
    <div style={styles.container}>
      <div className="glass-panel" style={styles.authCard}>
        <h2 style={styles.title}>Client Access</h2>
        <p style={styles.subtitle}>Log in to chat with the Sandboxed RAG Bot</p>
        
        {error && <div style={styles.error}>{error}</div>}
        
        <form onSubmit={handleSubmit} style={styles.form}>
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
          <button type="submit" style={styles.button}>
            {isRegister ? 'Register' : 'Login'}
          </button>
        </form>

        <p style={styles.toggle} onClick={() => setIsRegister(!isRegister)}>
          {isRegister ? 'Already have an account? Login' : 'Need an account? Register'}
        </p>
        
        <Link to="/admin/login" style={styles.adminLink}>Go to Admin Portal</Link>
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
  subtitle: { color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '10px' },
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
  },
  toggle: {
    color: 'var(--accent-primary)',
    fontSize: '13px',
    cursor: 'pointer',
    marginTop: '10px'
  },
  adminLink: {
    color: 'var(--text-muted)',
    fontSize: '12px',
    textDecoration: 'none',
    marginTop: '20px',
    display: 'inline-block'
  }
};

export default ClientAuth;
