import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStoredUser, clearAuth, getJobs, createJob, updateJob, deleteJob, getMySubscription } from '../services/api'
import NotificationDropdown from '../components/NotificationDropdown'
import './Dashboard.css'
import './RecruiterDashboard.css'

export default function RecruiterDashboard() {
  const navigate = useNavigate()
  const user = getStoredUser()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: '',
    description: '',
    requirements: '',
    core_skills: '',
    min_experience_years: '',
    required_education: '',
    application_deadline: '',
  })
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    requirements: '',
    core_skills: '',
    min_experience_years: '',
    required_education: '',
    application_deadline: '',
  })
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false)

  useEffect(() => {
    let cancelled = false
    getJobs()
      .then((data) => { if (!cancelled) setJobs(data); })
      .catch(() => { if (!cancelled) setJobs([]); })
      .finally(() => { if (!cancelled) setLoading(false); })
    getMySubscription()
      .then((data) => {
        const sub = data.subscription
        if (!cancelled) {
          setHasActiveSubscription(!!sub && sub.status === 'ACTIVE')
        }
      })
      .catch(() => {
        if (!cancelled) setHasActiveSubscription(false)
      })
    return () => { cancelled = true }
  }, [])

  function handleLogout() {
    clearAuth()
    navigate('/', { replace: true })
  }

  async function handleCreate(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const created = await createJob(form)
      setJobs((prev) => [created, ...prev])
      setForm({
        title: '',
        description: '',
        requirements: '',
        core_skills: '',
        min_experience_years: '',
        required_education: '',
        application_deadline: '',
      })
    } catch (err) {
      setError(err.message || 'Failed to create job')
    } finally {
      setSaving(false)
    }
  }

  function startEdit(job) {
    setEditingId(job.id)
    setEditForm({
      title: job.title,
      description: job.description,
      requirements: job.requirements || '',
      core_skills: job.core_skills || '',
      min_experience_years: job.min_experience_years != null ? String(job.min_experience_years) : '',
      required_education: job.required_education || '',
      application_deadline: job.application_deadline || '',
    })
  }

  async function handleUpdate(e) {
    e.preventDefault()
    if (!editingId) return
    setError('')
    setSaving(true)
    try {
      const updated = await updateJob(editingId, editForm)
      setJobs((prev) => prev.map((j) => (j.id === editingId ? updated : j)))
      setEditingId(null)
    } catch (err) {
      setError(err.message || 'Failed to update job')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(job) {
    setSaving(true)
    setError('')
    try {
      const updated = await updateJob(job.id, { is_active: !job.is_active })
      setJobs((prev) => prev.map((j) => (j.id === job.id ? updated : j)))
    } catch (err) {
      setError(err.message || 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(job) {
    if (!window.confirm(`Delete "${job.title}"?`)) return
    setSaving(true)
    setError('')
    try {
      await deleteJob(job.id)
      setJobs((prev) => prev.filter((j) => j.id !== job.id))
    } catch (err) {
      setError(err.message || 'Failed to delete')
    } finally {
      setSaving(false)
    }
  }

  function handleRank(job) {
    if (!hasActiveSubscription) {
      navigate('/recruiter/financial')
      return
    }
    navigate(`/recruiter/jobs/${job.id}/ranking`)
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <h1>Recruiter Dashboard</h1>
          <span className="role-badge role-recruiter">Recruiter</span>
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
            onClick={() => navigate('/recruiter/interviews')}
          >
            Interviews
          </button>
          <button
            type="button"
            className="nav-link"
            onClick={() => navigate('/recruiter/financial')}
          >
            Plans &amp; billing
          </button>
        </nav>
        <div className="user-row">
          <NotificationDropdown />
          <span className="user-info">{user?.name || user?.email}</span>
          <button type="button" className="btn-logout" onClick={handleLogout}>Logout</button>
        </div>
      </header>
      <main className="dashboard-main">
        <section className="job-section job-form-card">
          <h2>Post a job</h2>
          <p className="section-hint">Add title, description and requirements. Text is used for candidate matching.</p>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Senior Software Engineer"
                required
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Full job description..."
                rows={4}
                required
              />
            </div>
            <div className="form-group">
              <label>Requirements (optional)</label>
              <textarea
                value={form.requirements}
                onChange={(e) => setForm((f) => ({ ...f, requirements: e.target.value }))}
                placeholder="Key requirements, one per line or paragraph"
                rows={3}
              />
            </div>
            <div className="form-group">
              <label>Core skills for AI match (comma or line separated)</label>
              <textarea
                value={form.core_skills}
                onChange={(e) => setForm((f) => ({ ...f, core_skills: e.target.value }))}
                placeholder="e.g. Python, SQL, Docker, Kubernetes"
                rows={2}
              />
            </div>
            <div className="form-group">
              <label>Minimum experience (years, optional)</label>
              <input
                type="number"
                min="0"
                max="40"
                value={form.min_experience_years}
                onChange={(e) => setForm((f) => ({ ...f, min_experience_years: e.target.value }))}
                placeholder="e.g. 2"
              />
            </div>
            <div className="form-group">
              <label>Required education (optional)</label>
              <input
                type="text"
                value={form.required_education}
                onChange={(e) => setForm((f) => ({ ...f, required_education: e.target.value }))}
                placeholder="e.g. BTech CSE or MSc Data Science"
              />
            </div>
            <div className="form-group">
              <label>Application deadline (optional)</label>
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={form.application_deadline}
                onChange={(e) => setForm((f) => ({ ...f, application_deadline: e.target.value }))}
              />
            </div>
            {error && <p className="form-error">{error}</p>}
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Create job'}
            </button>
          </form>
        </section>

        <section className="job-section job-list-section">
          <h2 className="section-title">My jobs</h2>
          {loading ? (
            <div className="empty-state"><p>Loading…</p></div>
          ) : jobs.length === 0 ? (
            <div className="empty-state">
              <p>No jobs yet.</p>
              <p className="empty-hint">Create your first job above.</p>
            </div>
          ) : (
            <div className="job-grid">
              {jobs.map((job) => (
                <article key={job.id} className="job-card">
                  {editingId === job.id ? (
                    <form onSubmit={handleUpdate} className="job-edit-form">
                      <input
                        type="text"
                        value={editForm.title}
                        onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                        placeholder="Title"
                        required
                      />
                      <textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                        placeholder="Description"
                        rows={3}
                        required
                      />
                      <textarea
                        value={editForm.requirements}
                        onChange={(e) => setEditForm((f) => ({ ...f, requirements: e.target.value }))}
                        placeholder="Requirements"
                        rows={2}
                      />
                      <textarea
                        value={editForm.core_skills}
                        onChange={(e) => setEditForm((f) => ({ ...f, core_skills: e.target.value }))}
                        placeholder="Core skills for AI match (comma or line separated)"
                        rows={2}
                      />
                      <input
                        type="number"
                        min="0"
                        max="40"
                        value={editForm.min_experience_years}
                        onChange={(e) => setEditForm((f) => ({ ...f, min_experience_years: e.target.value }))}
                        placeholder="Minimum experience (years)"
                      />
                      <input
                        type="text"
                        value={editForm.required_education}
                        onChange={(e) => setEditForm((f) => ({ ...f, required_education: e.target.value }))}
                        placeholder="Required education"
                      />
                      <input
                        type="date"
                        min={new Date().toISOString().split('T')[0]}
                        value={editForm.application_deadline || ''}
                        onChange={(e) => setEditForm((f) => ({ ...f, application_deadline: e.target.value }))}
                      />
                      <div className="edit-actions">
                        <button type="submit" className="btn-save" disabled={saving}>Save</button>
                        <button type="button" className="btn-cancel" onClick={() => setEditingId(null)}>Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="job-card-header">
                        <h3>{job.title}</h3>
                        <span className={`status-pill ${job.is_active ? 'active' : 'inactive'}`}>
                          {job.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="job-description-preview">
                        {job.description?.slice(0, 120)}
                        {job.description?.length > 120 ? '…' : ''}
                      </p>
                      <p className="job-meta">
                        Updated {job.updated_at?.slice(0, 10)}
                        {job.application_deadline && ` · Apply by ${job.application_deadline}`}
                      </p>
                      <div className="job-actions">
                        <button type="button" className="btn-toggle" onClick={() => handleToggleActive(job)} disabled={saving}>
                          {job.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button type="button" className="btn-edit" onClick={() => startEdit(job)}>Edit</button>
                        <button type="button" className="btn-delete" onClick={() => handleDelete(job)} disabled={saving}>Delete</button>
                      </div>
                      <div className="ranking-actions">
                        <button
                          type="button"
                          className="btn-rank"
                          onClick={() => handleRank(job)}
                        >
                          {hasActiveSubscription ? 'View AI-ranked candidates' : 'Unlock AI ranking'}
                        </button>
                      </div>
                    </>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
