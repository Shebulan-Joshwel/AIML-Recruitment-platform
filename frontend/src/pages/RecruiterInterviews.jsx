import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getRecruiterInterviews,
  getJobs,
  getJobApplications,
  createInterview,
  updateInterview,
  clearAuth,
  getStoredUser,
  askRecruiterRAG,
} from '../services/api';
import './RecruiterInterviews.css';

/** Render text and convert **bold** to actual <strong>. */
function renderWithBold(text) {
  if (!text || typeof text !== 'string') return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    const m = p.match(/^\*\*(.+)\*\*$/);
    return m ? <strong key={i}>{m[1]}</strong> : p;
  });
}

/** Parse RAG interview-prep answer into Strengths and Gaps with question + reason. */
function parseInterviewPrepAnswer(answer) {
  const normalized = (answer || '').trim();
  const gapsMarker = '\nGAPS\n';
  const gi = normalized.toUpperCase().indexOf(gapsMarker.toUpperCase());
  const strengthsRaw = gi >= 0 ? normalized.slice(0, gi) : normalized;
  const gapsRaw = gi >= 0 ? normalized.slice(gi + gapsMarker.length) : '';

  function extractPairs(block) {
    const pairs = [];
    const lines = block.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const qMatch = lines[i].match(/^\s*Question:\s*(.+)$/i);
      if (qMatch) {
        const question = qMatch[1].trim().replace(/\*\*/g, '');
        let reason = '';
        if (i + 1 < lines.length) {
          const wMatch = lines[i + 1].match(/^\s*Why we ask:\s*(.+)$/i);
          if (wMatch) {
            reason = wMatch[1].trim().replace(/\*\*/g, '');
            i += 1;
          }
        }
        if (question) pairs.push({ question, reason });
      }
    }
    return pairs;
  }

  return {
    strengths: extractPairs(strengthsRaw),
    gaps: extractPairs(gapsRaw),
    raw: normalized,
  };
}

export default function RecruiterInterviews() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [interviews, setInterviews] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [applications, setApplications] = useState([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    application_id: '',
    stage: 'SCREENING',
    scheduled_start: '',
    scheduled_end: '',
    mode: 'Online',
    location_or_link: '',
  });
  const [interviewPrep, setInterviewPrep] = useState({ answer: '', loading: false });
  const [filterYear, setFilterYear] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [completingId, setCompletingId] = useState(null);
  const [archivingId, setArchivingId] = useState(null);
  const todayIso = new Date().toISOString().slice(0, 16);

  const loadInterviews = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterYear) params.year = filterYear;
      if (filterMonth) params.month = filterMonth;
      if (filterStatus) params.status = filterStatus;
      const slots = await getRecruiterInterviews(params);
      setInterviews(slots);
    } catch (e) {
      setError(e.message || 'Failed to load interviews');
    } finally {
      setLoading(false);
    }
  }, [filterYear, filterMonth, filterStatus]);

  useEffect(() => {
    loadInterviews();
  }, [loadInterviews]);

  useEffect(() => {
    async function loadJobs() {
      try {
        const jobList = await getJobs(false);
        setJobs(jobList);
      } catch (e) {
        setError(e.message || 'Failed to load jobs');
      }
    }
    loadJobs();
  }, []);

  async function handleMarkCompleted(iv) {
    try {
      setCompletingId(iv.id);
      setError('');
      await updateInterview(iv.id, { status: 'COMPLETED' });
      setInterviews((prev) =>
        prev.map((s) => (s.id === iv.id ? { ...s, status: 'COMPLETED' } : s)),
      );
    } catch (e) {
      setError(e.message || 'Failed to mark completed');
    } finally {
      setCompletingId(null);
    }
  }

  function handleArchive(iv) {
    const ok = window.confirm('Hide this completed interview from the list?');
    if (!ok) return;
    setArchivingId(iv.id);
    setInterviews((prev) => prev.filter((s) => s.id !== iv.id));
    setTimeout(() => setArchivingId(null), 250);
  }

  async function handleSuggestFocus() {
    if (!selectedJobId || !form.application_id) {
      setError('Select a job and a candidate first');
      return;
    }
    setInterviewPrep({ answer: '', loading: true });
    setError('');
    try {
      const data = await askRecruiterRAG('interview_prep', selectedJobId, form.application_id);
      setInterviewPrep({ answer: data.answer || '', loading: false });
    } catch (e) {
      setInterviewPrep({ answer: e.message || 'Failed to load suggestions', loading: false });
    }
  }


  function applicantLabel(app) {
    const c = app.candidate;
    const name =
      (c && c.name && String(c.name).trim()) ||
      (c && c.email) ||
      (c && c.user_id ? `Candidate (${String(c.user_id).slice(0, 8)}…)` : null) ||
      `Application #${app.id}`;
    const email = c && c.email && c.name ? ` · ${c.email}` : '';
    const rank = app.ai_rank != null ? ` · Rank #${app.ai_rank}` : '';
    const score =
      app.ai_score != null && app.ai_score !== ''
        ? ` · Score ${Number(app.ai_score).toFixed(2)}`
        : '';
    const label = app.predicted_label || '—';
    return `${name}${email}${rank}${score} · ${label}`;
  }

  async function loadApplications(jobId) {
    try {
      setSelectedJobId(jobId);
      setForm((f) => ({ ...f, application_id: '' }));
      if (!jobId) {
        setApplications([]);
        return;
      }
      const apps = await getJobApplications(jobId);
      const list = [...(apps || [])].sort((a, b) => {
        const ra = a.ai_rank ?? 9999;
        const rb = b.ai_rank ?? 9999;
        if (ra !== rb) return ra - rb;
        const na = (applicantLabel(a) || '').toLowerCase();
        const nb = (applicantLabel(b) || '').toLowerCase();
        return na.localeCompare(nb);
      });
      setApplications(list);
    } catch (e) {
      setError(e.message || 'Failed to load applications');
    }
  }

  function handleLogout() {
    clearAuth();
    navigate('/');
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.application_id || !form.scheduled_start || !form.scheduled_end) {
      setError('Pick an application and time window');
      return;
    }
    try {
      setError('');
      setCreating(true);
      const payload = { ...form };
      const created = await createInterview(payload);
      setInterviews((prev) => [created, ...prev]);
      setForm({
        application_id: '',
        stage: 'SCREENING',
        scheduled_start: '',
        scheduled_end: '',
        mode: 'Online',
        location_or_link: '',
      });
    } catch (e) {
      setError(e.message || 'Failed to create interview');
    } finally {
      setCreating(false);
    }
  }

  const user = getStoredUser();

  return (
    <div className="layout">
      <header className="topbar">
        <div className="topbar-left">
          <span className="brand">AIML Recruitment Platform</span>
          <span className="role-pill role-pill-recruiter">Recruiter</span>
        </div>
        <nav className="topbar-nav">
          <button onClick={() => navigate('/recruiter')}>Dashboard</button>
          <button className="active">Interviews</button>
          <button onClick={() => navigate('/recruiter/financial')}>Plans &amp; billing</button>
        </nav>
        <div className="topbar-right">
          <span className="user-name">{user?.name}</span>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <main className="ri-main">
        <section className="ri-card">
          <h2>Schedule new interview</h2>
          {error && <div className="ri-error">{error}</div>}
          <form className="ri-form" onSubmit={handleCreate}>
            <div className="ri-row">
              <label>
                Job
                <select
                  value={selectedJobId}
                  onChange={(e) => loadApplications(e.target.value)}
                >
                  <option value="">Select job</option>
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Candidate application
                <select
                  value={form.application_id}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, application_id: e.target.value }))
                  }
                >
                  <option value="">Select candidate</option>
                  {applications.map((app) => (
                    <option key={app.id} value={app.id}>
                      {applicantLabel(app)}
                    </option>
                  ))}
                </select>
                <span className="ri-field-hint">
                  All applicants for this job are listed (rank, score, and AI label are shown for
                  reference). You can schedule any of them.
                </span>
              </label>
            </div>
            <div className="ri-row">
              <label>
                Stage
                <select
                  value={form.stage}
                  onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value }))}
                >
                  <option value="SCREENING">Screening</option>
                  <option value="TECHNICAL">Technical</option>
                  <option value="HR">HR</option>
                  <option value="FINAL">Final</option>
                </select>
              </label>
              <label>
                Mode
                <select
                  value={form.mode}
                  onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value }))}
                >
                  <option value="Online">Online</option>
                  <option value="Onsite">Onsite</option>
                </select>
              </label>
            </div>
            <div className="ri-row">
              <label>
                Start
                <input
                  type="datetime-local"
                  value={form.scheduled_start}
                  min={todayIso}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, scheduled_start: e.target.value }))
                  }
                />
              </label>
              <label>
                End
                <input
                  type="datetime-local"
                  value={form.scheduled_end}
                  min={form.scheduled_start || todayIso}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, scheduled_end: e.target.value }))
                  }
                />
              </label>
            </div>
            <label>
              Location / link
              <input
                type="text"
                placeholder="Meeting room or video link"
                value={form.location_or_link}
                onChange={(e) =>
                  setForm((f) => ({ ...f, location_or_link: e.target.value }))
                }
              />
            </label>
            <div className="ri-row ri-rag-row">
              <button
                type="button"
                className="btn-suggest-focus"
                onClick={handleSuggestFocus}
                disabled={!selectedJobId || !form.application_id || interviewPrep.loading}
              >
                {interviewPrep.loading ? 'Generating…' : 'Suggest interview focus (RAG)'}
              </button>
            </div>
            {interviewPrep.answer && (() => {
              const parsed = parseInterviewPrepAnswer(interviewPrep.answer);
              const hasStructured = parsed.strengths.length > 0 || parsed.gaps.length > 0;
              return (
                <div className="rag-prep-wrapper">
                  <h3 className="rag-prep-title">AI-suggested interview focus</h3>
                  <p className="rag-prep-intro">Use these questions to explore the candidate&apos;s strengths and gaps for this role.</p>
                  {hasStructured ? (
                    <div className="rag-prep-grid">
                      <div className="rag-prep-card rag-prep-strengths">
                        <h4 className="rag-prep-card-title">
                          <span className="rag-prep-icon" aria-hidden>✓</span>
                          Strengths
                        </h4>
                        <p className="rag-prep-card-desc">Verify matched skills and experience</p>
                        <ul className="rag-prep-list">
                          {parsed.strengths.map((item, i) => (
                            <li key={i} className="rag-prep-item">
                              <div className="rag-prep-q">{item.question}</div>
                              {item.reason && (
                                <div className="rag-prep-why">
                                  <span className="rag-prep-why-label">Why we ask:</span> {item.reason}
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="rag-prep-card rag-prep-gaps">
                        <h4 className="rag-prep-card-title">
                          <span className="rag-prep-icon rag-prep-icon-gap" aria-hidden>◇</span>
                          Gaps
                        </h4>
                        <p className="rag-prep-card-desc">Probe missing skills or experience</p>
                        <ul className="rag-prep-list">
                          {parsed.gaps.map((item, i) => (
                            <li key={i} className="rag-prep-item">
                              <div className="rag-prep-q">{item.question}</div>
                              {item.reason && (
                                <div className="rag-prep-why">
                                  <span className="rag-prep-why-label">Why we ask:</span> {item.reason}
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="rag-prep-fallback">
                      <div className="rag-prep-answer">
                        {(function () {
                          const content = renderWithBold(parsed.raw);
                          return content != null ? content : parsed.raw;
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
            <button type="submit" disabled={creating}>
              {creating ? 'Scheduling…' : 'Schedule interview'}
            </button>
          </form>
        </section>

        <section className="ri-card">
          <h2>All interviews</h2>
          <div className="ri-filters">
            <div className="ri-filters-top">
              <div>
                <p className="ri-filters-title">Filter timeline</p>
                <p className="ri-filters-subtitle">Quickly slice interviews by year, month and status.</p>
              </div>
              <button
                type="button"
                className="ri-filters-reset"
                onClick={() => {
                  setFilterYear('');
                  setFilterMonth('');
                  setFilterStatus('');
                }}
              >
                Reset
              </button>
            </div>
            <div className="ri-filters-grid">
              <label className="ri-filter-label">
                Year
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="ri-filter-select"
                >
                  <option value="">All</option>
                  {[2026, 2025, 2024].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </label>
              <label className="ri-filter-label">
                Month
                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="ri-filter-select"
                >
                  <option value="">All</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                    <option key={m} value={m}>
                      {new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </label>
              <label className="ri-filter-label">
                Status
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="ri-filter-select"
                >
                  <option value="">All</option>
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </label>
            </div>
          </div>
          {loading ? (
            <p>Loading…</p>
          ) : interviews.length === 0 ? (
            <p>No interviews match the filters.</p>
          ) : (
            <div className="ri-table-wrapper">
              <table className="ri-table">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Role</th>
                    <th>Stage</th>
                    <th>Time</th>
                    <th>Mode</th>
                    <th>Status</th>
                    <th>Response</th>
                    <th>Decision</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {interviews.map((iv) => (
                    <tr key={iv.id} className={iv.status === 'COMPLETED' ? 'ri-row-completed' : ''}>
                      <td>
                        {iv.application?.candidate?.name ||
                          iv.application?.candidate?.email ||
                          '—'}
                      </td>
                      <td>{iv.job?.title}</td>
                      <td>{iv.stage}</td>
                      <td>
                        {new Date(iv.scheduled_start).toLocaleString()} –{' '}
                        {new Date(iv.scheduled_end).toLocaleTimeString()}
                      </td>
                      <td>{iv.mode}</td>
                      <td>
                        <span className={`ri-status-badge ri-status-${iv.status?.toLowerCase()}`}>
                          {iv.status}
                        </span>
                      </td>
                      <td>{iv.candidate_status}</td>
                      <td>{iv.final_decision}</td>
                      <td>
                        {iv.status === 'SCHEDULED' && (
                          <button
                            type="button"
                            className="ri-btn-completed"
                            onClick={() => handleMarkCompleted(iv)}
                            disabled={completingId === iv.id}
                          >
                            {completingId === iv.id ? '…' : 'Mark completed'}
                          </button>
                        )}
                        {iv.status === 'COMPLETED' && (
                          <div className="ri-completed-actions">
                            <span className="ri-completed-label">Done</span>
                            <button
                              type="button"
                              className="ri-btn-archive"
                              onClick={() => handleArchive(iv)}
                              disabled={archivingId === iv.id}
                            >
                              {archivingId === iv.id ? 'Removing…' : 'Archive'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

