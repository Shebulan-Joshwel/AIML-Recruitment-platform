import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearAuth, getStoredUser } from '../services/api';
import CareerResources from './CareerResources';
import CareerSessions from './CareerSessions';
import AdminDashboard from './AdminDashboard';
import './CandidateInterviews.css';
import './CareerHub.css';

export default function CandidateCareerHub() {
  const navigate = useNavigate();
  const user = getStoredUser();
  const [activeTab, setActiveTab] = useState(
    () => localStorage.getItem('ch_career_tab') || 'resources'
  );

  function switchTab(t) {
    setActiveTab(t);
    localStorage.setItem('ch_career_tab', t);
  }

  if (user?.role === 'ADMIN') {
    return <AdminDashboard />;
  }

  function handleLogout() {
    clearAuth();
    navigate('/');
  }

  return (
    <div className="ci-layout">
      <header className="topbar">
        <div className="topbar-left">
          <span className="brand">AIML Recruitment Platform</span>
          <span className="role-pill role-pill-candidate">Candidate</span>
        </div>
        <nav className="topbar-nav">
          <button onClick={() => navigate('/candidate')}>Dashboard</button>
          <button onClick={() => navigate('/candidate/interviews')}>Interviews</button>
          <button className="active">Career hub</button>
        </nav>
        <div className="topbar-right">
          <span className="user-name">{user?.name}</span>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <div className="ch-tab-bar">
        <button
          className={`ch-tab${activeTab === 'resources' ? ' ch-tab-active' : ''}`}
          onClick={() => switchTab('resources')}
        >
          Resources
        </button>
        <button
          className={`ch-tab${activeTab === 'sessions' ? ' ch-tab-active' : ''}`}
          onClick={() => switchTab('sessions')}
        >
          Sessions
        </button>
      </div>

      {activeTab === 'resources' ? <CareerResources /> : <CareerSessions />}
    </div>
  );
}
