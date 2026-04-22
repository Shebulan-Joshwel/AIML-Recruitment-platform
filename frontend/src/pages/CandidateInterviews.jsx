import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getMyInterviews,
  confirmInterview,
  requestReschedule,
  clearAuth,
  getStoredUser,
} from '../services/api';
import './CandidateInterviews.css';

export default function CandidateInterviews() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [interviews, setInterviews] = useState([]);
  const [workingId, setWorkingId] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await getMyInterviews();
        setInterviews(data);
      } catch (e) {
        setError(e.message || 'Failed to load interviews');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const upcoming = useMemo(
    () =>
      interviews
        .filter((iv) => new Date(iv.scheduled_start) > new Date())
        .sort((a, b) => new Date(a.scheduled_start) - new Date(b.scheduled_start)),
    [interviews],
  );
  const past = useMemo(
    () =>
      interviews
        .filter((iv) => new Date(iv.scheduled_start) <= new Date())
        .sort((a, b) => new Date(b.scheduled_start) - new Date(a.scheduled_start)),
    [interviews],
  );

  const nextInterview = upcoming[0] || null;

  function handleLogout() {
    clearAuth();
    navigate('/');
  }

  async function handleConfirm(id) {
    try {
      setWorkingId(id);
      await confirmInterview(id);
      setInterviews((ivs) =>
        ivs.map((iv) =>
          iv.id === id ? { ...iv, candidate_status: 'CONFIRMED' } : iv,
        ),
      );
    } catch (e) {
      setError(e.message || 'Failed to confirm');
    } finally {
      setWorkingId(null);
    }
  }

  async function handleReschedule(id) {
    try {
      setWorkingId(id);
      await requestReschedule(id);
      setInterviews((ivs) =>
        ivs.map((iv) =>
          iv.id === id ? { ...iv, candidate_status: 'RESCHEDULE_REQUESTED' } : iv,
        ),
      );
    } catch (e) {
      setError(e.message || 'Failed to request reschedule');
    } finally {
      setWorkingId(null);
    }
  }

  const user = getStoredUser();

  return (
    <div className="ci-layout">
      <header className="topbar">
        <div className="topbar-left">
          <span className="brand">AIML Recruitment Platform</span>
          <span className="role-pill role-pill-candidate">Candidate</span>
        </div>
        <nav className="topbar-nav">
          <button onClick={() => navigate('/candidate')}>Dashboard</button>
          <button className="active">Interviews</button>
          <button onClick={() => navigate('/candidate/career')}>Career hub</button>
        </nav>
        <div className="topbar-right">
          <span className="user-name">{user?.name}</span>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <main className="ci-main">
        {error && <div className="ci-error">{error}</div>}

        <section className="ci-card">
          <h2>Upcoming interview</h2>
          {loading ? (
            <p>Loading…</p>
          ) : !nextInterview ? (
            <p>No upcoming interviews yet.</p>
          ) : (
            <div className="ci-upcoming">
              <div className="ci-up-top">
                <div>
                  <div className="ci-pill">{nextInterview.stage}</div>
                  <h3>{nextInterview.job?.title}</h3>
                  <p className="ci-company">
                    {nextInterview.job?.recruiter_name || 'Recruiter'}
                  </p>
                </div>
                <div className="ci-time">
                  <span>
                    {new Date(nextInterview.scheduled_start).toLocaleString()}
                  </span>
                  <span>
                    – {new Date(nextInterview.scheduled_end).toLocaleTimeString()}
                  </span>
                </div>
              </div>
              <div className="ci-up-bottom">
                <div className="ci-meta">
                  <div>
                    <span className="ci-label">Mode</span>
                    <span>{nextInterview.mode}</span>
                  </div>
                  <div>
                    <span className="ci-label">Location / link</span>
                    <span>{nextInterview.location_or_link || 'TBA'}</span>
                  </div>
                  <div>
                    <span className="ci-label">Your status</span>
                    <span>{nextInterview.candidate_status}</span>
                  </div>
                </div>
                <div className="ci-actions">
                  <button
                    className="ci-btn-secondary"
                    disabled={workingId === nextInterview.id}
                    onClick={() => handleReschedule(nextInterview.id)}
                  >
                    Request reschedule
                  </button>
                  <button
                    className="ci-btn-primary"
                    disabled={workingId === nextInterview.id}
                    onClick={() => handleConfirm(nextInterview.id)}
                  >
                    {workingId === nextInterview.id ? 'Updating…' : 'Confirm'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="ci-card">
          <h2>Past interviews</h2>
          {loading ? (
            <p>Loading…</p>
          ) : past.length === 0 ? (
            <p>No past interviews yet.</p>
          ) : (
            <div className="ci-table-wrapper">
              <table className="ci-table">
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>Stage</th>
                    <th>Date</th>
                    <th>Mode</th>
                    <th>Your status</th>
                    <th>Final decision</th>
                  </tr>
                </thead>
                <tbody>
                  {past.map((iv) => (
                    <tr key={iv.id}>
                      <td>{iv.job?.title}</td>
                      <td>{iv.stage}</td>
                      <td>{new Date(iv.scheduled_start).toLocaleString()}</td>
                      <td>{iv.mode}</td>
                      <td>{iv.candidate_status}</td>
                      <td>{iv.final_decision}</td>
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

