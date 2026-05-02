import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { careerAdminLogin, storeAuth } from '../services/api';
import './CareerAdminLogin.css';

export default function CareerAdminLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter your username and password.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const data = await careerAdminLogin(username.trim(), password);
      storeAuth({ access: data.access, refresh: data.refresh, user: data.user });
      navigate('/candidate/career', { replace: true });
    } catch (e) {
      setError(e.message || 'Login failed. Check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ca-page">
      <div className="ca-card">
        <h2 className="ca-title">Career Support Hub</h2>
        <p className="ca-subtitle">Specialist sign-in</p>

        {error && <p className="ca-error">{error}</p>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="ca-field">
            <label className="ca-label" htmlFor="ca-username">Username</label>
            <input
              id="ca-username"
              className="ca-input"
              type="text"
              placeholder="Enter your username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="ca-field">
            <label className="ca-label" htmlFor="ca-password">Password</label>
            <div className="ca-input-wrap">
              <input
                id="ca-password"
                className="ca-input"
                type={showPass ? 'text' : 'password'}
                placeholder="Enter your password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="ca-toggle-pass"
                onClick={() => setShowPass((v) => !v)}
                tabIndex={-1}
                aria-label={showPass ? 'Hide password' : 'Show password'}
              >
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button className="ca-submit" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="ca-footer">
          Not a specialist?{' '}
          <a href="/" className="ca-footer-link">Go to main login</a>
        </p>
      </div>
    </div>
  );
}
