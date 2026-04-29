// pages/LoginPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    console.log('Attempting login with:', username);
    
    try {
      const result = await login(username, password);
      console.log('Login result:', result);
      
      if (result.success) {
        navigate('/');
      } else {
        setError(result.error || 'Login failed. Please try again.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Network error. Please check if backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#ece9d8',
      fontFamily: 'Tahoma, sans-serif',
    }}>
      <div style={{
        width: 380,
        background: '#f0ede4',
        border: '1px solid #aca899',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        borderRadius: 4,
      }}>
        <div style={{
          background: 'linear-gradient(180deg, #0a246a 0%, #1e3a8a 100%)',
          padding: '8px 12px',
          color: '#fff',
          fontSize: 13,
          fontWeight: 500,
          borderBottom: '1px solid #0f2b6d',
        }}>
          ERP System Login
        </div>
        
        <div style={{ padding: '24px 20px 20px' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{
                display: 'block',
                fontSize: 12,
                marginBottom: 4,
                color: '#333',
              }}>
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  border: '1px solid #aca899',
                  background: '#fff',
                  fontSize: 13,
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
                autoFocus
                required
              />
            </div>
            
            <div style={{ marginBottom: 20 }}>
              <label style={{
                display: 'block',
                fontSize: 12,
                marginBottom: 4,
                color: '#333',
              }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  border: '1px solid #aca899',
                  background: '#fff',
                  fontSize: 13,
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
                required
              />
            </div>
            
            {error && (
              <div style={{
                background: '#f8d7da',
                color: '#721c24',
                padding: '6px 10px',
                fontSize: 12,
                marginBottom: 16,
                border: '1px solid #f5c6cb',
                borderRadius: 2,
              }}>
                {error}
              </div>
            )}
            
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '8px',
                background: isLoading ? '#ccc' : 'linear-gradient(180deg,#c5d9f1 0%,#ddeeff 100%)',
                border: '1px solid #7aabda',
                fontSize: 12,
                fontWeight: 500,
                cursor: isLoading ? 'default' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}