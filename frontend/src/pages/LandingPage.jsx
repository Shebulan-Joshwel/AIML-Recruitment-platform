import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { getStoredToken, getStoredUser, login, register, storeAuth } from '../services/api';
import './LandingPage.css';

export default function LandingPage() {
  const token = getStoredToken();
  const user = getStoredUser();
  const navigate = useNavigate();

  if (token && user) {
    const dash = user.role === 'RECRUITER' ? '/recruiter' : '/candidate';
    return <Navigate to={dash} replace />;
  }

  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('CANDIDATE');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let data;
      if (isLogin) {
        data = await login(email, password);
      } else {
        data = await register({ name, email, password, role });
      }
      storeAuth({
        access: data.access,
        refresh: data.refresh,
        user: data.user,
      });
      const dash = data.user?.role === 'RECRUITER' ? '/recruiter' : '/candidate';
      navigate(dash, { replace: true });
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  function openAuth(mode) {
    setIsLogin(mode === 'login');
    setError('');
  }

  return (
    <div className="landing">
      <header className="landing-header">
        <nav className="landing-nav">
          <button
            type="button"
            className="landing-nav-btn"
            onClick={() => openAuth('login')}
          >
            Sign in
          </button>
          <button
            type="button"
            className="landing-nav-btn primary"
            onClick={() => openAuth('register')}
          >
            Get started
          </button>
        </nav>
      </header>

      <main className="landing-main">
        <div className="landing-left">
          <section className="landing-logo-wrap">
            <div className="landing-logo-mark" />
            <div className="landing-logo-text">RESUMACH</div>
          </section>
          <section className="landing-hero">
            <h1>
              AI-first recruitment,
              <span> built around your resumes.</span>
            </h1>
            <p className="landing-tagline">
              RESU-MATCH reads every CV, understands every job description, and ranks candidates
              with a transparent AIML core – so recruiters interview only the best matches.
            </p>
            <div className="landing-highlights">
              <div className="landing-highlight">
                <span className="dot dot-green" />
                <div>
                  <h3>Smart ranking engine</h3>
                  <p>TF‑IDF + skills coverage gives explainable scores for every applicant.</p>
                </div>
              </div>
              <div className="landing-highlight">
                <span className="dot dot-yellow" />
                <div>
                  <h3>Interview feedback loop</h3>
                  <p>Compare human decisions vs AI predictions to keep improving hiring quality.</p>
                </div>
              </div>
              <div className="landing-highlight">
                <span className="dot dot-blue" />
                <div>
                  <h3>Ready for real teams</h3>
                  <p>Role-based dashboards, billing, and a career hub for serious candidates.</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className="landing-auth">
          <div className="auth-card">
            <h2>{isLogin ? 'Welcome back' : 'Create your RESU-MATCH account'}</h2>
            <p className="auth-subtitle">
              {isLogin
                ? 'Sign in to continue to your dashboard.'
                : 'Choose whether you are a candidate or a recruiter.'}
            </p>

            <form onSubmit={handleSubmit}>
              {!isLogin && (
                <div className="field">
                  <label>Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoComplete="name"
                  />
                </div>
              )}
              <div className="field">
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="field">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                />
              </div>
              {!isLogin && (
                <div className="field role-field">
                  <label>I am signing up as</label>
                  <div className="role-options">
                    <label className={`role-option ${role === 'CANDIDATE' ? 'active' : ''}`}>
                      <input
                        type="radio"
                        name="role"
                        value="CANDIDATE"
                        checked={role === 'CANDIDATE'}
                        onChange={(e) => setRole(e.target.value)}
                      />
                      <span className="role-label">Candidate</span>
                      <span className="role-desc">Upload CVs, apply, track interviews.</span>
                    </label>
                    <label className={`role-option ${role === 'RECRUITER' ? 'active' : ''}`}>
                      <input
                        type="radio"
                        name="role"
                        value="RECRUITER"
                        checked={role === 'RECRUITER'}
                        onChange={(e) => setRole(e.target.value)}
                      />
                      <span className="role-label">Recruiter</span>
                      <span className="role-desc">Post roles, see AI-ranked shortlists.</span>
                    </label>
                  </div>
                </div>
              )}
              {error && <p className="error">{error}</p>}
              <button type="submit" disabled={loading} className="auth-submit">
                {loading ? 'Please wait…' : isLogin ? 'Sign in' : 'Register'}
              </button>
            </form>

            <p className="auth-toggle">
              {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
              <button
                type="button"
                className="link"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                }}
              >
                {isLogin ? 'Register' : 'Sign in'}
              </button>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

