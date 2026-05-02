// Resume visibility controls and expand panel added
// Analytics tab: monthly views bar chart and status breakdown
// Per-resume performance table added to analytics tab
// Certificates tab with credential cards and verification status
// Final styling pass and responsive fixes

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStoredUser, clearAuth, getResumes, createResume, getActiveJobs, applyToJob, getMyJobApplications, getMyInterviews, getMyJobMatch } from '../services/api'
import './Dashboard.css'
import './CandidateDashboard.css'

export default function CandidateDashboard() {
  const navigate = useNavigate()
  const user = getStoredUser()
  const [resumes, setResumes] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [title, setTitle] = useState('My Resume')
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const [jobs, setJobs] = useState([])
  const [jobsLoading, setJobsLoading] = useState(true)
  const [jobsMessage, setJobsMessage] = useState('')
  const [appliedJobIds, setAppliedJobIds] = useState([])
  const [applyingJobId, setApplyingJobId] = useState(null)
  const [interviewCount, setInterviewCount] = useState(0)
  const [nextInterview, setNextInterview] = useState(null)
  const [matchByJobId, setMatchByJobId] = useState({})
  const [matchLoadingJobId, setMatchLoadingJobId] = useState(null)

  useEffect(() => {
    let cancelled = false
    getResumes()
      .then((data) => { if (!cancelled) setResumes(data); })
      .catch(() => { if (!cancelled) setResumes([]); })
      .finally(() => { if (!cancelled) setLoading(false); })
    Promise.all([getActiveJobs(), getMyJobApplications(), getMyInterviews()])
      .then(([jobsData, appsData, interviews]) => {
        if (cancelled) return
        setJobs(jobsData)
        if (appsData?.job_ids) setAppliedJobIds(appsData.job_ids)
        if (Array.isArray(interviews)) {
          const upcoming = interviews
            .filter(
              (iv) => new Date(iv.scheduled_start) > new Date() && iv.status === 'SCHEDULED'
            )
            .sort((a, b) => new Date(a.scheduled_start) - new Date(b.scheduled_start))
          setInterviewCount(upcoming.length)
          setNextInterview(upcoming[0] || null)
        }
      })
      .catch(() => {
        if (cancelled) return
        setJobs([])
      })
      .finally(() => { if (!cancelled) setJobsLoading(false); })
    return () => { cancelled = true }
  }, [])

  function handleLogout() {
    clearAuth()
    navigate('/', { replace: true })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('title', title)
      if (file) formData.append('file', file)
      const created = await createResume(formData)
      setResumes((prev) => [created, ...prev])
      setTitle('My Resume')
      setFile(null)
    } catch (err) {
      setError(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function handleApply(jobId) {
    // Require at least one resume before applying
    if (!resumes || resumes.length === 0) {
      setJobsMessage('Please upload a resume first, then apply.')
      return
    }
    setJobsMessage('')
    setApplyingJobId(jobId)
    try {
      await applyToJob(jobId)
      setAppliedJobIds((prev) => (prev.includes(jobId) ? prev : [...prev, jobId]))
      setJobsMessage('Application sent using your latest resume.')
    } catch (err) {
      setJobsMessage(err.message || 'Failed to apply')
    }
    setApplyingJobId(null)
  }

  async function handleViewMatch(jobId) {
    if (!resumes || resumes.length === 0) {
      setJobsMessage('Please upload a resume first, then view AI match.')
      return
    }
    setJobsMessage('')
    setMatchLoadingJobId(jobId)
    try {
      const data = await getMyJobMatch(jobId)
      setMatchByJobId((prev) => ({ ...prev, [jobId]: data }))
    } catch (err) {
      setJobsMessage(err.message || 'Failed to load match analytics')
    } finally {
      setMatchLoadingJobId(null)
    }
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <h1>Candidate Dashboard</h1>
          <span className="role-badge role-candidate">Candidate</span>
        </div>
        <nav className="dashboard-nav">
          <button
            type="button"
            className="nav-link nav-link-active"
          >
            Overview
          </button>
          <button
            type="button"
            className="nav-link"
            onClick={() => navigate('/candidate/resumes')}
          >
            Resumes
          </button>
          <button
            type="button"
            className="nav-link"
            onClick={() => navigate('/candidate/interviews')}
          >
            Interviews
            {interviewCount > 0 && (
              <span className="nav-badge">{interviewCount}</span>
            )}
          </button>
          <button
            type="button"
            className="nav-link"
            onClick={() => navigate('/candidate/career')}
          >
            Career hub
          </button>
        </nav>
        <div className="user-row">
          <span className="user-info">{user?.name || user?.email}</span>
          <button type="button" className="btn-logout" onClick={handleLogout}>Logout</button>
        </div>
      </header>
      <main className="dashboard-main">
        {nextInterview && (
          <section className="notification-banner" onClick={() => navigate('/candidate/interviews')}>
            <div className="notification-icon" aria-hidden="true">🔔</div>
            <div className="notification-body">
              <p className="notification-title">You have an upcoming interview</p>
              <p className="notification-text">
                {nextInterview.job?.title || 'Interview'} ·{' '}
                {new Date(nextInterview.scheduled_start).toLocaleString()}
              </p>
              <button
                type="button"
                className="notification-cta"
                onClick={(e) => {
                  e.stopPropagation()
                  navigate('/candidate/interviews')
                }}
              >
                View details
              </button>
            </div>
          </section>
        )}
        <section className="resume-section job-list-section">
          <h2 className="section-title">Open jobs</h2>
          <p className="upload-hint">
            We’ll use your latest resume ({resumes[0]?.title || 'latest uploaded resume'}) when you apply.
          </p>
          {jobsLoading ? (
            <div className="empty-state"><p>Loading jobs…</p></div>
          ) : jobs.length === 0 ? (
            <div className="empty-state">
              <p>No active jobs right now.</p>
              <p className="empty-hint">Check back later.</p>
            </div>
          ) : (
            <div className="resume-grid">
              {jobs.map((job) => {
                const applied = appliedJobIds.includes(job.id)
                const reqLines = (job.requirements || '').split('\n').map((s) => s.trim()).filter(Boolean)
                const topReqs = reqLines.slice(0, 3)
                const match = matchByJobId[job.id]
                return (
                  <article key={job.id} className="resume-card">
                    <div className="resume-card-header">
                      <h3>{job.title}</h3>
                    </div>
                    <p className="resume-meta">
                      Updated {job.updated_at?.slice(0, 10)}
                      {job.application_deadline && ` · Apply by ${job.application_deadline}`}
                    </p>
                    {topReqs.length > 0 && (
                      <div className="job-req-block">
                        <p className="job-req-heading">Key requirements:</p>
                        <ul className="job-req-list">
                          {topReqs.map((line, idx) => (
                            <li key={idx}>{line}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <p className="job-snippet">
                      {job.description}
                    </p>
                    {match && (
                      <div className="match-panel">
                        <div className="match-header">
                          <span className="match-overall-label">AI match</span>
                          <span className="match-overall-value">
                            {match.overall_match_pct != null ? `${match.overall_match_pct}%` : '–'}
                          </span>
                        </div>
                        <div className="match-bars">
                          <div className="match-row">
                            <span>Skills</span>
                            <div className="match-bar-outer">
                              <div
                                className="match-bar-inner skills"
                                style={{ width: `${match.skills_match_pct || 0}%` }}
                              />
                            </div>
                            <span className="match-bar-value">
                              {match.skills_match_pct != null ? `${match.skills_match_pct}%` : '–'}
                            </span>
                          </div>
                          <div className="match-row">
                            <span>Experience</span>
                            <div className="match-bar-outer">
                              <div
                                className="match-bar-inner"
                                style={{ width: `${match.experience_match_pct || 0}%` }}
                              />
                            </div>
                            <span className="match-bar-value">
                              {match.experience_match_pct != null ? `${match.experience_match_pct}%` : '–'}
                            </span>
                          </div>
                          <div className="match-row">
                            <span>Education</span>
                            <div className="match-bar-outer">
                              <div
                                className="match-bar-inner education"
                                style={{ width: `${match.education_match_pct || 0}%` }}
                              />
                            </div>
                            <span className="match-bar-value">
                              {match.education_match_pct != null ? `${match.education_match_pct}%` : '–'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="job-card-actions">
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => handleViewMatch(job.id)}
                        disabled={matchLoadingJobId === job.id}
                      >
                        {matchLoadingJobId === job.id ? 'Computing match…' : 'View AI match'}
                      </button>
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => handleApply(job.id)}
                        disabled={applied || applyingJobId === job.id}
                      >
                        {applied ? 'Applied' : applyingJobId === job.id ? 'Applying…' : 'Apply with latest resume'}
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
          {jobsMessage && <p className="jobs-message">{jobsMessage}</p>}
        </section>
        <section className="resume-section resume-upload-card">
          <div className="upload-card-inner">
            <div className="upload-icon" aria-hidden>📄</div>
            <h2>Add a resume</h2>
            <p className="upload-hint">PDF or Word. We'll extract text for matching.</p>
            <form onSubmit={handleSubmit} className="upload-form">
              <div className="form-row">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Resume title (e.g. Software Engineer 2025)"
                  className="input-title"
                />
              </div>
              <div className="form-row file-row">
                <label className="file-label">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="file-input"
                  />
                  <span className="file-button">{file ? file.name : 'Choose file'}</span>
                </label>
              </div>
              {error && <p className="form-error">{error}</p>}
              <button type="submit" className="btn-primary" disabled={uploading}>
                {uploading ? 'Uploading…' : 'Upload resume'}
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  )
}
