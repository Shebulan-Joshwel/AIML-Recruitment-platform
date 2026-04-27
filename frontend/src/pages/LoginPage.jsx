import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, register, storeAuth } from '../services/api'
import './LoginPage.css'

export default function LoginPage() {
  const navigate = useNavigate()
  const [isLogin, setIsLogin] = useState(true)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('CANDIDATE')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      let data
      if (isLogin) {
        data = await login(email, password)
      } else {
        data = await register({ name, email, password, role })
      }
      storeAuth({
        access: data.access,
        refresh: data.refresh,
        user: data.user,
      })
      const dash = data.user?.role === 'RECRUITER' ? '/recruiter' : '/candidate'
      navigate(dash, { replace: true })
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>AIML Recruitment Platform</h1>
        <p className="subtitle">
          {isLogin
            ? "Sign in — you'll be taken to your Candidate or Recruiter dashboard"
            : "Create an account and choose your role"}
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
                  <span className="role-desc">Apply to jobs, manage resumes</span>
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
                  <span className="role-desc">Post jobs, review candidates</span>
                </label>
              </div>
            </div>
          )}
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? 'Please wait…' : isLogin ? 'Sign in' : 'Register'}
          </button>
        </form>

        <p className="toggle">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button type="button" className="link" onClick={() => { setIsLogin(!isLogin); setError(''); }}>
            {isLogin ? 'Register' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}
