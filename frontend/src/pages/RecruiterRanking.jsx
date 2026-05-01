import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getStoredUser,
  clearAuth,
  getMySubscription,
  rankCandidates,
  getJobs,
  recalculateRanking,
  clearRanking,
} from '../services/api';
import NotificationDropdown from '../components/NotificationDropdown';
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
  const [similarityWeight, setSimilarityWeight] = useState(100);
  const [coverageWeight, setCoverageWeight] = useState(15);
  const [actionLoading, setActionLoading] = useState(false);

  async function handleReRank() {
    try {
      setActionLoading(true);
      setError('');
      const ranked = await recalculateRanking(jobId, {
        similarity_weight: similarityWeight,
        coverage_weight: coverageWeight,
      });
      setCandidates(ranked || []);
    } catch (e) {
      setError(e.message || 'Failed to re-rank candidates');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleClearRanking() {
    if (!window.confirm('Are you sure you want to clear all ranking data for this job? This cannot be undone.')) {
      return;
    }
    try {
      setActionLoading(true);
      setError('');
      await clearRanking(jobId);
      // Refresh local state
      setCandidates((prev) =>
        prev.map((c) => ({
          ...c,
          ai_score: null,
          ai_rank: null,
          predicted_label: '',
        }))
      );
      alert('Ranking data cleared.');
    } catch (e) {
      setError(e.message || 'Failed to clear ranking');
    } finally {
      setActionLoading(false);
    }
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

  const handleViewCV = (url) => {
    if (!url) return;
    window.open(url, '_blank');
  };

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
          <NotificationDropdown />
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
            <>
              <div className="ranking-controls-card">
                <h3>Adjust ranking weights</h3>
                <div className="weight-sliders">
                  <div className="slider-group">
                    <label>Similarity weight: {similarityWeight}%</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={similarityWeight}
                      onChange={(e) => setSimilarityWeight(parseInt(e.target.value))}
                    />
                    <p className="small">Weight given to overall JD–Resume text similarity.</p>
                  </div>
                  <div className="slider-group">
                    <label>Coverage weight: {coverageWeight}%</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={coverageWeight}
                      onChange={(e) => setCoverageWeight(parseInt(e.target.value))}
                    />
                    <p className="small">Weight given to matching specific required skills.</p>
                  </div>
                </div>
                <div className="action-buttons">
                  <button
                    type="button"
                    className="btn-rerank"
                    onClick={handleReRank}
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Ranking…' : 'Re-rank'}
                  </button>
                  <button
                    type="button"
                    className="btn-clear"
                    onClick={handleClearRanking}
                    disabled={actionLoading}
                  >
                    Clear Ranking
                  </button>
                </div>
              </div>

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
                        </tr>
                      </thead>
                      <tbody>
                        {candidates.map((app, index) => (
                          <tr key={app.id}>
                            <td>{app.ai_rank ?? index + 1}</td>
                            <td>{app.candidate?.name || '-'}</td>
                            <td>{app.candidate?.email || '-'}</td>
                            <td>{app.ai_score != null ? app.ai_score.toFixed(3) : '-'}</td>
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
                                <button
                                  type="button"
                                  className="cv-chip-btn"
                                  onClick={() => handleViewCV(app.resume_file_url)}
                                >
                                  <span className="cv-dot" aria-hidden="true" /> View CV
                                </button>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td>{app.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

