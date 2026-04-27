import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getStoredUser,
  clearAuth,
  getMySubscription,
  rankCandidates,
  getJobs,
  askRecruiterRAG,
} from '../services/api';
import './Dashboard.css';
import './RecruiterDashboard.css';
import './RecruiterRanking.css';

export default function RecruiterRanking() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const user = getStoredUser();
  const [job, setJob] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasSub, setHasSub] = useState(false);
  const [ragSummary, setRagSummary] = useState({ appId: null, answer: '', loading: false });
  const backendOrigin = import.meta.env?.VITE_BACKEND_ORIGIN || 'http://localhost:8000';

  async function handleAISummary(app) {
    setRagSummary({ appId: app.id, answer: '', loading: true });
    try {
      const data = await askRecruiterRAG('candidate_summary', jobId, app.id);
      setRagSummary((s) => ({ ...s, answer: data.answer || '', loading: false }));
    } catch (e) {
      setRagSummary((s) => ({ ...s, answer: e.message || 'Failed to load summary', loading: false }));
    }
  }

  function closeRagModal() {
    setRagSummary({ appId: null, answer: '', loading: false });
  }

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError('');
        const [me, jobs] = await Promise.all([
          getMySubscription(),
          getJobs(false),
        ]);
        const subscription = me.subscription;
        const active = !!subscription && subscription.status === 'ACTIVE';
        setHasSub(active);
        const found = (jobs || []).find((j) => String(j.id) === String(jobId));
        setJob(found || null);

        if (!active) {
          setError('AI ranking is available only with an active RESU-MATCH plan.');
          return;
        }

        const ranked = await rankCandidates(jobId);
        setCandidates(ranked || []);
      } catch (e) {
        setError(e.message || 'Failed to load AI ranking');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [jobId]);

  function handleLogout() {
    clearAuth();
    navigate('/', { replace: true });
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <h1>AI-ranked candidates</h1>
          <span className="role-badge role-recruiter">Recruiter</span>
        </div>
        <nav className="dashboard-nav">
          <button
            type="button"
            className="nav-link"
            onClick={() => navigate('/recruiter')}
          >
            Jobs
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
          <span className="user-info">{user?.name || user?.email}</span>
          <button type="button" className="btn-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>
      <main className="dashboard-main">
        <section className="ranking-layout">
          <div className="ranking-header">
            <div>
              <p className="ranking-pill">RESU-MATCH AIML core</p>
              <h2>{job ? job.title : 'Selected job'}</h2>
              {job && (
                <p className="ranking-subtitle">
                  {job.description?.slice(0, 180)}
                  {job.description?.length > 180 ? '…' : ''}
                </p>
              )}
            </div>
            <div className="ranking-meta">
              <div>
                <span className="label">Job ID</span>
                <span>#{jobId}</span>
              </div>
              {job?.application_deadline && (
                <div>
                  <span className="label">Apply by</span>
                  <span>{job.application_deadline}</span>
                </div>
              )}
              <div>
                <span className="label">Plan status</span>
                <span className={hasSub ? 'badge badge-ok' : 'badge badge-lock'}>
                  {hasSub ? 'AI ranking unlocked' : 'Requires active plan'}
                </span>
              </div>
            </div>
          </div>

          {!hasSub && (
            <div className="ranking-locked">
              <h3>Unlock AI-ranked shortlists</h3>
              <p>
                To view ranked candidates for this role, activate any RESU-MATCH recruiter plan.
                AI ranking combines semantic text matching with skill coverage to surface your
                strongest applicants first.
              </p>
              <button
                type="button"
                onClick={() => navigate('/recruiter/financial')}
              >
                View plans &amp; activate
              </button>
            </div>
          )}

          {error && hasSub && <p className="ranking-error">{error}</p>}

          {hasSub && (
            <div className="ranking-table-card">
              <div className="ranking-table-header">
                <h3>Ranked candidates</h3>
                <p className="small">
                  Scores are based on resume–JD similarity and how well required skills are covered.
                </p>
              </div>
              {loading ? (
                <p className="muted">Running AI ranking…</p>
              ) : candidates.length === 0 ? (
                <p className="muted">No applications yet for this role.</p>
              ) : (
                <div className="ranking-table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>AI score</th>
                        <th>Prediction</th>
                        <th>CV</th>
                        <th>Status</th>
                        <th>RAG</th>
                      </tr>
                    </thead>
                    <tbody>
                      {candidates.map((app, index) => (
                        <tr key={app.id}>
                          <td>{app.ai_rank ?? index + 1}</td>
                          <td>{app.candidate?.name || '-'}</td>
                          <td>{app.candidate?.email || '-'}</td>
                          <td>{app.ai_score?.toFixed(3) ?? '-'}</td>
                          <td>
                            {app.predicted_label ? (
                              <span
                                className={`prediction-badge ${
                                  app.predicted_label === 'RECOMMENDED'
                                    ? 'prediction-recommended'
                                    : app.predicted_label === 'NOT_RECOMMENDED'
                                    ? 'prediction-not-recommended'
                                    : ''
                                }`}
                              >
                                {app.predicted_label}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td>
                            {app.resume_file_url ? (
                              <a
                                href={app.resume_file_url.startsWith('http')
                                  ? app.resume_file_url
                                  : `${backendOrigin}${app.resume_file_url}`}
                                target="_blank"
                                rel="noreferrer"
                                className="cv-chip"
                              >
                                <span className="cv-dot" aria-hidden="true" /> View CV
                              </a>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td>{app.status}</td>
                          <td>
                            <button
                              type="button"
                              className="btn-rag-summary"
                              onClick={() => handleAISummary(app)}
                              disabled={ragSummary.loading}
                              title="Get AI summary of candidate fit"
                            >
                              {ragSummary.loading && ragSummary.appId === app.id
                                ? '…'
                                : 'AI Summary'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {ragSummary.appId != null && (
                    <div className="rag-modal-overlay" onClick={closeRagModal} role="presentation">
                      <div className="rag-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="rag-modal-header">
                          <h4>AI candidate summary</h4>
                          <button type="button" className="rag-modal-close" onClick={closeRagModal} aria-label="Close">×</button>
                        </div>
                        <div className="rag-modal-body">
                          {ragSummary.loading ? (
                            <p className="muted">Generating summary…</p>
                          ) : (
                            <p className="rag-answer">{ragSummary.answer}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

