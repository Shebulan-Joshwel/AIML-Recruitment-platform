import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  adminCreateAdminSession,
  adminDeleteAdminSession,
  adminDeleteBooking,
  adminDeleteCareerResource,
  adminGetAdminSessions,
  adminGetAllBookings,
  adminUpdateAdminSession,
  adminUpdateBookingStatus,
  adminCreateCareerResource,
  adminUpdateCareerResource,
  clearAuth,
  getCareerResources,
  getStoredUser,
  adminGetFinancialData,
} from '../services/api';
import {
  adminGetPlans,
  adminCreatePlan,
  adminUpdatePlan,
  adminDeletePlan,
} from '../services/api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

import { ResourceDetailModal } from './CareerResources';
import './CandidateInterviews.css';
import './CareerHub.css';

const SPECIALTY   = 'Career Support Hub Specialist';
const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'];
const DURATIONS    = [30, 45, 60, 90, 120];
const EMPTY_FORM   = { title: '', description: '', url: '', difficulty: '', tags: '', image: null };
const EMPTY_SESSION_FORM = { title: '', description: '', date: '', time: '', duration_minutes: 60 };

const BOOKING_STYLE = {
  PENDING:   { bg: '#fef9c3', color: '#854d0e', border: '#facc15' },
  CONFIRMED: { bg: '#dcfce7', color: '#166534', border: '#22c55e' },
  REJECTED:  { bg: '#fee2e2', color: '#991b1b', border: '#f87171' },
};

function fmtDt(iso) {
  return new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}


export default function AdminDashboard() {
  const navigate = useNavigate();
  const user = getStoredUser();

  // tab — persisted across refreshes
  const [tab, setTab] = useState(
    () => localStorage.getItem('ch_admin_tab') || 'resources'
  );

  function switchTab(t) {
    setTab(t);
    localStorage.setItem('ch_admin_tab', t);
  }

  // Resources state
  const [resources, setResources]         = useState([]);
  const [resLoading, setResLoading]       = useState(true);
  const [pageError, setPageError]         = useState('');
  const [showModal, setShowModal]         = useState(false);
  const [editing, setEditing]             = useState(null);
  const [form, setForm]                   = useState(EMPTY_FORM);
  const [imagePreview, setImagePreview]   = useState(null);
  const [isNewImage, setIsNewImage]       = useState(false);
  const [formError, setFormError]         = useState('');
  const [saving, setSaving]               = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [cropSrc, setCropSrc]             = useState(null);
  const [showCropper, setShowCropper]     = useState(false);
  const [viewingResource, setViewingResource] = useState(null);

  // Sessions state
  const [sessions, setSessions]             = useState([]);
  const [sessLoading, setSessLoading]       = useState(false);
  const [bookings, setBookings]             = useState([]);
  const [showSessModal, setShowSessModal]   = useState(false);
  const [sessForm, setSessForm]             = useState(EMPTY_SESSION_FORM);
  const [sessFormError, setSessFormError]   = useState('');
  const [sessSaving, setSessSaving]         = useState(false);
  const [deleteSessConfirm, setDeleteSessConfirm] = useState(null);
  const [expandedSession, setExpandedSession]     = useState(null);
  const [editingSession, setEditingSession]       = useState(null);


  // Plans state
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [planForm, setPlanForm] = useState({ name: '', code: '', description: '', price_monthly: 0, job_post_limit: 3, is_active: true });

  // Financials state
  const [finData, setFinData] = useState({ subscriptions: [], payments: [] });
  const [finLoading, setFinLoading] = useState(false);

  useEffect(() => {
    loadResources();
    // If the persisted tab is sessions, load sessions immediately on mount
    if (localStorage.getItem('ch_admin_tab') === 'sessions') loadSessions();
    if (localStorage.getItem('ch_admin_tab') === 'financials') loadFinancials();
  }, []);


  async function loadPlans() {
    try {
      setPlansLoading(true);
      setPlans(await adminGetPlans());
    } catch (e) {
      setPageError(e.message || 'Failed to load plans');
    } finally {
      setPlansLoading(false);
    }
  }

  async function loadFinancials() {
    try {
      setFinLoading(true);
      setFinData(await adminGetFinancialData());
    } catch (e) {
      setPageError(e.message || 'Failed to load financial data');
    } finally {
      setFinLoading(false);
    }
  }

  async function loadResources() {
    try {
      setResLoading(true);
      setResources(await getCareerResources());
    } catch (e) {
      setPageError(e.message || 'Failed to load resources');
    } finally {
      setResLoading(false);
    }
  }

  async function loadSessions() {
    try {
      setSessLoading(true);
      const [sess, bkgs] = await Promise.all([adminGetAdminSessions(), adminGetAllBookings()]);
      setSessions(sess);
      setBookings(bkgs);
    } catch (e) {
      setPageError(e.message || 'Failed to load sessions');
    } finally {
      setSessLoading(false);
    }
  }

  function changeTab(t) {
    switchTab(t);
    if (t === 'sessions' && sessions.length === 0) loadSessions();
    if (t === 'financials' && finData.payments.length === 0) loadFinancials();
    if (t === 'plans' && plans.length === 0) loadPlans();
  }

  // ── Resource actions ─────────────────────────────────────

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setImagePreview(null);
    setIsNewImage(false);
    setFormError('');
    setShowModal(true);
  }

  function openEdit(resource) {
    setViewingResource(null);
    setEditing(resource);
    setForm({
      title:       resource.title       || '',
      description: resource.description || '',
      url:         resource.url         || '',
      difficulty:  resource.difficulty  || '',
      tags:        resource.tags        || '',
      image:       null,
    });
    setImagePreview(resource.image_url || null);
    setIsNewImage(false);
    setFormError('');
    setShowModal(true);
  }

  function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCropSrc(ev.target.result);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
  }

  function handleCropDone(file, dataURL) {
    setForm((f) => ({ ...f, image: file }));
    setImagePreview(dataURL);
    setIsNewImage(true);
    setShowCropper(false);
    setCropSrc(null);
  }

  function cancelNewImage() {
    setForm((f) => ({ ...f, image: null }));
    setIsNewImage(false);
    setImagePreview(editing?.image_url || null);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.title.trim()) {
      setFormError('Title is required.');
      return;
    }
    try {
      setSaving(true);
      setFormError('');
      const fd = new FormData();
      fd.append('title',       form.title.trim());
      fd.append('description', form.description);
      fd.append('url',         form.url);
      fd.append('difficulty',  form.difficulty);
      fd.append('tags',        form.tags);
      if (form.image) fd.append('image', form.image);

      if (editing) {
        const updated = await adminUpdateCareerResource(editing.id, fd);
        setResources((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      } else {
        const created = await adminCreateCareerResource(fd);
        setResources((prev) => [created, ...prev]);
      }
      setShowModal(false);
    } catch (e) {
      setFormError(e.message || 'Failed to save resource');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    try {
      await adminDeleteCareerResource(id);
      setResources((prev) => prev.filter((r) => r.id !== id));
      setDeleteConfirm(null);
    } catch (e) {
      setPageError(e.message || 'Failed to delete resource');
    }
  }

  // ── Session actions ──────────────────────────────────────

  function openCreateSession() {
    setEditingSession(null);
    setSessForm(EMPTY_SESSION_FORM);
    setSessFormError('');
    setShowSessModal(true);
  }

  function openEditSession(s) {
    setEditingSession(s);
    // Extract UTC date/time from stored ISO string for pre-filling the inputs
    const iso = s.scheduled_start; // e.g. "2026-05-01T10:00:00Z"
    setSessForm({
      title:            s.title,
      description:      s.description || '',
      date:             iso.slice(0, 10),
      time:             iso.slice(11, 16),
      duration_minutes: s.duration_minutes,
    });
    setSessFormError('');
    setShowSessModal(true);
  }

  async function handleSaveSession(e) {
    e.preventDefault();
    if (!sessForm.title.trim()) {
      setSessFormError('Title is required.');
      return;
    }
    if (!sessForm.date || !sessForm.time) {
      setSessFormError('Please select a date and time.');
      return;
    }
    const iso = `${sessForm.date}T${sessForm.time}:00`;
    if (new Date(iso) <= new Date()) {
      setSessFormError('Scheduled time must be in the future.');
      return;
    }
    const payload = {
      title:            sessForm.title.trim(),
      description:      sessForm.description,
      scheduled_start:  iso,
      duration_minutes: Number(sessForm.duration_minutes),
    };
    try {
      setSessSaving(true);
      setSessFormError('');
      if (editingSession) {
        const updated = await adminUpdateAdminSession(editingSession.id, payload);
        setSessions((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)));
      } else {
        const created = await adminCreateAdminSession(payload);
        setSessions((prev) => [created, ...prev]);
      }
      setShowSessModal(false);
      setEditingSession(null);
    } catch (e) {
      setSessFormError(e.message || 'Failed to save session');
    } finally {
      setSessSaving(false);
    }
  }

  async function handleDeleteSession(id) {
    try {
      await adminDeleteAdminSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      setDeleteSessConfirm(null);
    } catch (e) {
      setPageError(e.message || 'Failed to delete session');
    }
  }

  async function handleBookingAction(bookingId, newStatus) {
    try {
      if (newStatus === 'DELETE') {
        await adminDeleteBooking(bookingId);
        const removed = bookings.find((b) => b.id === bookingId);
        setBookings((prev) => prev.filter((b) => b.id !== bookingId));
        if (removed) {
          setSessions((prev) => prev.map((s) =>
            s.id === removed.session
              ? { ...s, bookings_count: Math.max(0, s.bookings_count - 1) }
              : s
          ));
        }
      } else {
        const updated = await adminUpdateBookingStatus(bookingId, newStatus);
        setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      }
    } catch (e) {
      setPageError(e.message || 'Failed to update booking');
    }
  }

  function handleLogout() {
    clearAuth();
    navigate('/career-admin/login');
  }

  const sessionBookings = (sessionId) => bookings.filter((b) => b.session === sessionId);
  const monthlyData = {};
  finData.payments.filter(p => p.status === 'PAID').forEach(p => {
    const month = new Date(p.created_at).toLocaleString('default', { month: 'short', year: 'numeric' });
    monthlyData[month] = (monthlyData[month] || 0) + parseFloat(p.amount);
  });
  const chartData = {
    labels: Object.keys(monthlyData),
    datasets: [{
      label: 'Monthly Revenue (LKR)',
      data: Object.values(monthlyData),
      backgroundColor: 'rgba(59, 130, 246, 0.5)',
      borderColor: 'rgb(59, 130, 246)',
      borderWidth: 1
    }]
  };

  function downloadPDF() {
    const doc = new jsPDF();
    doc.text("Financial Report", 14, 15);
    const tableData = finData.payments.map(p => [
      new Date(p.created_at).toLocaleDateString(),
      p.user_email || 'N/A',
      `${p.amount} ${p.currency}`,
      p.status
    ]);
    doc.autoTable({
      head: [['Date', 'User Email', 'Amount', 'Status']],
      body: tableData,
      startY: 20,
    });
    doc.save("finance-report.pdf");
  }


  // ── Today's min datetime string (for date input min) ─────
  const todayDate = new Date().toISOString().slice(0, 10);

  return (
    <div className="ci-layout">

      {/* ── Topbar ─────────────────────────────── */}
      <header className="topbar">
        <div className="topbar-left">
          <span className="brand">AIML Recruitment Platform</span>
          <span className="role-pill ch-admin-specialty-pill">{SPECIALTY}</span>
        </div>
        <div className="topbar-right">
          <span className="user-name">{user?.name}</span>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </header>

      {/* ── Page header ────────────────────────── */}
      <div className="ch-admin-page-header">
        <div>
          <h1 className="ch-admin-page-title">Admin Dashboard</h1>
          <p className="ch-admin-page-subtitle">
            Manage resources, session slots, and view platform financials
          </p>
        </div>
        {tab === 'resources' && (
          <button className="ch-admin-new-btn" onClick={openCreate}>+ New Resource</button>
        )}
        {tab === 'sessions' && (
          <button className="ch-admin-new-btn" onClick={openCreateSession}>+ New Session</button>
        )}
      </div>

      {/* ── Tabs ───────────────────────────────── */}
      <div className="ch-admin-tabs">
        <button
          className={`ch-admin-tab${tab === 'resources' ? ' ch-admin-tab-active' : ''}`}
          onClick={() => changeTab('resources')}
        >
          Resources
        </button>
        <button
          className={`ch-admin-tab${tab === 'sessions' ? ' ch-admin-tab-active' : ''}`}
          onClick={() => changeTab('sessions')}
        >
          Sessions
        </button>
        <button
          className={`ch-admin-tab${tab === 'financials' ? ' ch-admin-tab-active' : ''}`}
          onClick={() => changeTab('financials')}
        >
          Financials
        </button>
        <button
          className={`ch-admin-tab${tab === 'plans' ? ' ch-admin-tab-active' : ''}`}
          onClick={() => changeTab('plans')}
        >
          Plans
        </button>
      </div>

      {/* ── Main content ───────────────────────── */}
      <main className="ch-admin-main">
        {pageError && <div className="ci-error">{pageError}</div>}

        {/* ── Resources tab ─────────────────────── */}
        {tab === 'resources' && (
          resLoading ? (
            <p className="ch-admin-empty-hint">Loading resources…</p>
          ) : resources.length === 0 ? (
            <div className="ch-admin-empty-state">
              <span className="ch-admin-empty-icon">📂</span>
              <p>No resources yet.</p>
              <p className="ch-admin-empty-hint">
                Click <strong>+ New Resource</strong> to create the first one.
              </p>
            </div>
          ) : (
            <div className="ch-admin-grid">
              {resources.map((r) => (
                <AdminCard
                  key={r.id}
                  resource={r}
                  onView={() => setViewingResource(r)}
                  onEdit={() => openEdit(r)}
                  onDelete={() => setDeleteConfirm(r.id)}
                />
              ))}
            </div>
          )
        )}

        {/* ── Sessions tab ──────────────────────── */}
        {tab === 'sessions' && (
          sessLoading ? (
            <p className="ch-admin-empty-hint">Loading sessions…</p>
          ) : sessions.length === 0 ? (
            <div className="ch-admin-empty-state">
              <span className="ch-admin-empty-icon">📅</span>
              <p>No sessions yet.</p>
              <p className="ch-admin-empty-hint">
                Click <strong>+ New Session</strong> to open a slot for candidates.
              </p>
            </div>
          ) : (
            <div className="ch-admin-session-list">
              {sessions.map((s) => {
                const bkgs = sessionBookings(s.id);
                const isExpanded = expandedSession === s.id;
                return (
                  <div key={s.id} className="ch-admin-session-card">
                    <div className="ch-admin-session-header">
                      <div className="ch-admin-session-info">
                        <span className="ch-admin-session-title">{s.title}</span>
                        {s.description && (
                          <span className="ch-admin-session-desc">{s.description}</span>
                        )}
                        <span className="ch-admin-session-meta">
                          {fmtDt(s.scheduled_start)} · {s.duration_minutes} min
                          {' · '}
                          <span className="ch-admin-bookings-count">
                            {s.bookings_count} booking{s.bookings_count !== 1 ? 's' : ''}
                          </span>
                        </span>
                      </div>
                      <div className="ch-admin-session-actions">
                        {bkgs.length > 0 && (
                          <button
                            className="ch-admin-sess-toggle-btn"
                            onClick={() => setExpandedSession(isExpanded ? null : s.id)}
                          >
                            {isExpanded ? 'Hide requests' : `View requests (${bkgs.length})`}
                          </button>
                        )}
                        <button
                          className="ch-admin-edit-btn"
                          onClick={() => openEditSession(s)}
                        >
                          Edit
                        </button>
                        <button
                          className="ch-admin-delete-btn"
                          onClick={() => setDeleteSessConfirm(s.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {isExpanded && bkgs.length > 0 && (
                      <div className="ch-admin-bookings-list">
                        {bkgs.map((b) => {
                          const bStyle = BOOKING_STYLE[b.status] ?? BOOKING_STYLE.PENDING;
                          return (
                            <div key={b.id} className="ch-admin-booking-row">
                              <div className="ch-admin-booking-info">
                                <span className="ch-admin-booking-name">{b.candidate_name}</span>
                                <span className="ch-admin-booking-email">{b.candidate_email}</span>
                                {b.notes && (
                                  <span className="ch-admin-booking-notes">"{b.notes}"</span>
                                )}
                              </div>
                              <div className="ch-admin-booking-actions">
                                <span
                                  className="ch-status-badge"
                                  style={{ background: bStyle.bg, color: bStyle.color, borderColor: bStyle.border }}
                                >
                                  {b.status}
                                </span>
                                {b.status === 'PENDING' && (
                                  <>
                                    <button
                                      className="ch-booking-accept-btn"
                                      onClick={() => handleBookingAction(b.id, 'CONFIRMED')}
                                    >
                                      Accept
                                    </button>
                                    <button
                                      className="ch-booking-reject-btn"
                                      onClick={() => handleBookingAction(b.id, 'REJECTED')}
                                    >
                                      Reject
                                    </button>
                                  </>
                                )}
                              {b.status === 'CONFIRMED' && (
                                  <button
                                    className="ch-booking-reject-btn"
                                    onClick={() => handleBookingAction(b.id, 'DELETE')}
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* ── Financials tab ─────────────────────── */}
        {tab === 'financials' && (
          finLoading ? (
            <p className="ch-admin-empty-hint">Loading financial data…</p>
          ) : (
            <div className="ch-admin-financials">

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}>Monthly Revenue</h2>
                <button onClick={downloadPDF} style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', borderRadius: '0.5rem' }}>Download PDF Report</button>
              </div>
              <div style={{ background: '#fff', padding: '1rem', borderRadius: '0.75rem', marginBottom: '2rem', height: '300px' }}>
                <Bar data={chartData} options={{ maintainAspectRatio: false }} />
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginBottom: '1rem' }}>Recent Payments</h2>
              {finData.payments.length === 0 ? (
                <p className="muted">No payments recorded yet.</p>
              ) : (
                <div className="ri-table-wrapper" style={{ marginBottom: '2.5rem', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden' }}>
                  <table className="ri-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>User Email</th>
                        <th>Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {finData.payments.map((p) => (
                        <tr key={p.id}>
                          <td>{new Date(p.created_at).toLocaleString()}</td>
                          <td>{p.user_email || 'N/A'}</td>
                          <td>{p.amount} {p.currency}</td>
                          <td>
                            <span className="ch-status-badge" style={{ background: p.status === 'PAID' ? '#dcfce7' : '#fef9c3', color: p.status === 'PAID' ? '#166534' : '#854d0e', borderColor: p.status === 'PAID' ? '#22c55e' : '#facc15', padding: '0.2rem 0.5rem', borderRadius: '0.35rem', fontSize: '0.75rem', fontWeight: 600 }}>
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginBottom: '1rem' }}>Active Subscriptions</h2>
              {finData.subscriptions.filter(s => s.status === 'ACTIVE').length === 0 ? (
                <p className="muted">No active subscriptions.</p>
              ) : (
                <div className="ri-table-wrapper" style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden' }}>
                  <table className="ri-table">
                    <thead>
                      <tr>
                        <th>User Email</th>
                        <th>Plan</th>
                        <th>Start Date</th>
                        <th>Renews On</th>
                      </tr>
                    </thead>
                    <tbody>
                      {finData.subscriptions.filter(s => s.status === 'ACTIVE').map((s) => (
                        <tr key={s.id}>
                          <td>{s.user_email || 'N/A'}</td>
                          <td>{s.plan?.name}</td>
                          <td>{new Date(s.current_period_start).toLocaleDateString()}</td>
                          <td>{new Date(s.current_period_end).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        )}

        {tab === 'plans' && (
          plansLoading ? (
            <p className="ch-admin-empty-hint">Loading plans...</p>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}>Subscription Plans</h2>
                <button className="ch-admin-new-btn" onClick={() => { setEditingPlan(null); setPlanForm({ name: '', code: '', description: '', price_monthly: 0, job_post_limit: 3, is_active: true }); setShowPlanModal(true); }}>+ New Plan</button>
              </div>
              <div className="ri-table-wrapper" style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden' }}>
                <table className="ri-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Code</th>
                      <th>Price</th>
                      <th>Active</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plans.map((p) => (
                      <tr key={p.id}>
                        <td>{p.name}</td>
                        <td>{p.code}</td>
                        <td>{p.price_monthly} {p.currency}</td>
                        <td>{p.is_active ? 'Yes' : 'No'}</td>
                        <td>
                          <div className="ch-admin-card-actions" style={{ justifyContent: 'flex-start' }}>
                            <button className="ch-admin-edit-btn" onClick={() => { setEditingPlan(p); setPlanForm({ ...p }); setShowPlanModal(true); }}>Edit</button>
                            <button className="ch-admin-delete-btn" onClick={async () => {
                              if (confirm('Deactivate this plan?')) {
                                try {
                                  await adminDeletePlan(p.id);
                                  loadPlans();
                                } catch (e) { alert(e.message); }
                              }
                            }}>Deactivate</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}

      </main>


      {showPlanModal && (
        <div className="ch-modal-overlay" onClick={() => setShowPlanModal(false)}>
          <div className="ch-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ch-modal-header">
              <h2 className="ch-modal-title">{editingPlan ? 'Edit Plan' : 'New Plan'}</h2>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                if (editingPlan) {
                  await adminUpdatePlan(editingPlan.id, planForm);
                } else {
                  await adminCreatePlan(planForm);
                }
                setShowPlanModal(false);
                loadPlans();
              } catch (e) {
                alert(e.message);
              }
            }} className="ch-admin-form">
              <div className="ch-form-grid">
                <div className="ch-form-col-half">
                  <label className="ch-form-label">Name</label>
                  <input className="ch-form-input" required value={planForm.name} onChange={e => setPlanForm({...planForm, name: e.target.value})} />
                </div>
                <div className="ch-form-col-half">
                  <label className="ch-form-label">Code</label>
                  <input className="ch-form-input" required value={planForm.code} onChange={e => setPlanForm({...planForm, code: e.target.value})} />
                </div>
                <div className="ch-form-col-full">
                  <label className="ch-form-label">Description</label>
                  <textarea className="ch-form-textarea" value={planForm.description} onChange={e => setPlanForm({...planForm, description: e.target.value})} />
                </div>
                <div className="ch-form-col-half">
                  <label className="ch-form-label">Monthly Price</label>
                  <input className="ch-form-input" type="number" step="0.01" required value={planForm.price_monthly} onChange={e => setPlanForm({...planForm, price_monthly: parseFloat(e.target.value)})} />
                </div>
                <div className="ch-form-col-half">
                  <label className="ch-form-label">Job Post Limit</label>
                  <input className="ch-form-input" type="number" required value={planForm.job_post_limit} onChange={e => setPlanForm({...planForm, job_post_limit: parseInt(e.target.value)})} />
                </div>
                <div className="ch-form-col-half">
                  <label className="ch-form-label">
                    <input type="checkbox" checked={planForm.is_active} onChange={e => setPlanForm({...planForm, is_active: e.target.checked})} /> Active
                  </label>
                </div>
              </div>
              <div className="ch-modal-footer">
                <button type="button" className="ch-btn-cancel" onClick={() => setShowPlanModal(false)}>Cancel</button>
                <button type="submit" className="ch-btn-save">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Resource detail popup ──────────────── */}
      {viewingResource && (
        <ResourceDetailModal
          resource={viewingResource}
          onClose={() => setViewingResource(null)}
          adminActions={{
            onEdit:   () => openEdit(viewingResource),
            onDelete: () => { setDeleteConfirm(viewingResource.id); setViewingResource(null); },
          }}
        />
      )}

      {/* ── Create / Edit resource modal ───────── */}
      {showModal && (
        <div className="ch-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="ch-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ch-modal-header">
              <h2 className="ch-modal-title">
                {editing ? 'Edit Resource' : 'New Resource'}
              </h2>
              <p className="ch-modal-subtitle">
                {editing
                  ? 'Update this resource — changes are immediately visible to candidates'
                  : 'New resource — visible to all candidates once saved'}
              </p>
            </div>

            {formError && <div className="ci-error ch-modal-error">{formError}</div>}

            <form onSubmit={handleSave} className="ch-admin-form" encType="multipart/form-data">
              <div className="ch-image-zone">
                {imagePreview ? (
                  <div className="ch-image-preview-wrap">
                    <img src={imagePreview} alt="Cover preview" className="ch-image-preview" />
                    <div className="ch-image-preview-overlay">
                      <label htmlFor="ch-img-input" className="ch-image-replace-btn">
                        Replace image
                      </label>
                      {isNewImage && (
                        <button
                          type="button"
                          className="ch-image-cancel-btn"
                          onClick={cancelNewImage}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <label htmlFor="ch-img-input" className="ch-image-upload-label">
                    <span className="ch-image-upload-icon">🖼️</span>
                    <span className="ch-image-upload-text">Click to upload a cover image</span>
                    <span className="ch-image-upload-hint">PNG · JPG · WEBP — max 5 MB</span>
                  </label>
                )}
                <input
                  id="ch-img-input"
                  type="file"
                  accept="image/*"
                  className="ch-file-hidden"
                  onChange={handleImageChange}
                />
              </div>

              <div className="ch-form-grid">
                <div className="ch-form-col-full">
                  <label className="ch-form-label">
                    Title <span className="ch-required">*</span>
                  </label>
                  <input
                    className="ch-form-input"
                    type="text"
                    placeholder="e.g. Mastering System Design Interviews"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    required
                  />
                </div>

                <div className="ch-form-col-full">
                  <label className="ch-form-label">Description</label>
                  <textarea
                    className="ch-form-textarea"
                    placeholder="Brief overview of what candidates will learn from this resource…"
                    rows={4}
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>

                <div className="ch-form-col-half">
                  <label className="ch-form-label">Difficulty</label>
                  <select
                    className="ch-form-input"
                    value={form.difficulty}
                    onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))}
                  >
                    <option value="">— Select level —</option>
                    {DIFFICULTIES.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div className="ch-form-col-half">
                  <label className="ch-form-label">Tags</label>
                  <input
                    className="ch-form-input"
                    type="text"
                    placeholder="e.g. interview, python  (comma-separated)"
                    value={form.tags}
                    onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                  />
                </div>
              </div>

              <div className="ch-modal-footer">
                <button type="button" className="ch-btn-cancel" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="ch-btn-save" disabled={saving}>
                  {saving ? 'Saving…' : editing ? 'Save changes' : 'Publish resource'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Create session modal ───────────────── */}
      {showSessModal && (
        <div className="ch-modal-overlay" onClick={() => { setShowSessModal(false); setEditingSession(null); }}>
          <div className="ch-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ch-modal-header">
              <h2 className="ch-modal-title">
                {editingSession ? 'Edit Session' : 'New Session Slot'}
              </h2>
              <p className="ch-modal-subtitle">
                {editingSession
                  ? 'Update session details — changes are visible to candidates immediately'
                  : 'Open a session slot — candidates will see it and can request a booking'}
              </p>
            </div>

            {sessFormError && <div className="ci-error ch-modal-error">{sessFormError}</div>}

            <form onSubmit={handleSaveSession} className="ch-admin-form">
              <div className="ch-form-grid">
                <div className="ch-form-col-full">
                  <label className="ch-form-label">
                    Title <span className="ch-required">*</span>
                  </label>
                  <input
                    className="ch-form-input"
                    type="text"
                    placeholder="e.g. Resume Review &amp; Career Roadmap"
                    value={sessForm.title}
                    onChange={(e) => setSessForm((f) => ({ ...f, title: e.target.value }))}
                    required
                  />
                </div>

                <div className="ch-form-col-full">
                  <label className="ch-form-label">Description</label>
                  <textarea
                    className="ch-form-textarea"
                    placeholder="What will you cover in this session?"
                    rows={3}
                    value={sessForm.description}
                    onChange={(e) => setSessForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>

                {/* Date and time pickers side by side */}
                <div className="ch-form-col-half">
                  <label className="ch-form-label">
                    Date <span className="ch-required">*</span>
                  </label>
                  <input
                    className="ch-form-input"
                    type="date"
                    min={todayDate}
                    value={sessForm.date}
                    onChange={(e) => setSessForm((f) => ({ ...f, date: e.target.value }))}
                    required
                  />
                </div>

                <div className="ch-form-col-half">
                  <label className="ch-form-label">
                    Time <span className="ch-required">*</span>
                  </label>
                  <input
                    className="ch-form-input"
                    type="time"
                    step="900"
                    value={sessForm.time}
                    onChange={(e) => setSessForm((f) => ({ ...f, time: e.target.value }))}
                    required
                  />
                </div>

                <div className="ch-form-col-half">
                  <label className="ch-form-label">Duration</label>
                  <select
                    className="ch-form-input"
                    value={sessForm.duration_minutes}
                    onChange={(e) => setSessForm((f) => ({ ...f, duration_minutes: e.target.value }))}
                  >
                    {DURATIONS.map((d) => (
                      <option key={d} value={d}>{d} minutes</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="ch-modal-footer">
                <button type="button" className="ch-btn-cancel" onClick={() => { setShowSessModal(false); setEditingSession(null); }}>
                  Cancel
                </button>
                <button type="submit" className="ch-btn-save" disabled={sessSaving}>
                  {sessSaving
                    ? (editingSession ? 'Saving…' : 'Creating…')
                    : (editingSession ? 'Save changes' : 'Create session')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete resource confirmation ────────── */}
      {deleteConfirm !== null && (
        <div className="ch-modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="ch-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <span className="ch-confirm-icon">🗑️</span>
            <h3 className="ch-confirm-title">Delete this resource?</h3>
            <p className="ch-confirm-body">
              This will permanently remove the resource for all candidates and cannot be undone.
            </p>
            <div className="ch-modal-footer">
              <button className="ch-btn-cancel" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </button>
              <button className="ch-btn-delete" onClick={() => handleDelete(deleteConfirm)}>
                Yes, delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete session confirmation ─────────── */}
      {deleteSessConfirm !== null && (
        <div className="ch-modal-overlay" onClick={() => setDeleteSessConfirm(null)}>
          <div className="ch-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <span className="ch-confirm-icon">🗑️</span>
            <h3 className="ch-confirm-title">Delete this session?</h3>
            <p className="ch-confirm-body">
              All booking requests for this session will also be removed. This cannot be undone.
            </p>
            <div className="ch-modal-footer">
              <button className="ch-btn-cancel" onClick={() => setDeleteSessConfirm(null)}>
                Cancel
              </button>
              <button className="ch-btn-delete" onClick={() => handleDeleteSession(deleteSessConfirm)}>
                Yes, delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Image cropper ──────────────────────── */}
      {showCropper && cropSrc && (
        <CropModal
          src={cropSrc}
          onDone={handleCropDone}
          onCancel={() => { setShowCropper(false); setCropSrc(null); }}
        />
      )}
    </div>
  );
}

/* ── Admin resource card ─────────────────────────────────── */
function AdminCard({ resource: r, onView, onEdit, onDelete }) {
  const tags = r.tags
    ? r.tags.split(',').map((t) => t.trim()).filter(Boolean)
    : [];

  return (
    <div className="ch-admin-card" onClick={onView} style={{ cursor: 'pointer' }}>
      <div className="ch-admin-card-img-wrap">
        {r.image_url ? (
          <img src={r.image_url} alt={r.title} className="ch-admin-card-img" />
        ) : (
          <div className="ch-admin-card-img-placeholder">🖼️</div>
        )}
        {r.difficulty && (
          <span className={`ch-admin-diff-badge ch-diff-${(r.difficulty || '').toLowerCase()}`}>
            {r.difficulty}
          </span>
        )}
      </div>

      <div className="ch-admin-card-body">
        <h3 className="ch-admin-card-title">{r.title}</h3>
        {r.description && (
          <p className="ch-admin-card-desc">{r.description}</p>
        )}
        {tags.length > 0 && (
          <div className="ch-resource-tags">
            {tags.map((t) => (
              <span key={t} className="ch-resource-tag">{t}</span>
            ))}
          </div>
        )}
      </div>

      <div className="ch-admin-card-footer" onClick={(e) => e.stopPropagation()}>
        <div className="ch-admin-card-actions">
          <button className="ch-admin-edit-btn" onClick={onEdit}>Edit</button>
          <button className="ch-admin-delete-btn" onClick={onDelete}>Delete</button>
        </div>
      </div>
    </div>
  );
}

/* ── Image crop modal ────────────────────────────────────── */
function CropModal({ src, onDone, onCancel }) {
  const vpRef   = useRef(null);
  const imgRef  = useRef(null);
  const st      = useRef({ natW: 0, natH: 0, scale: 1, minScale: 1, ox: 0, oy: 0, dragging: false, dragX: 0, dragY: 0 });
  const [, tick] = useState(0);
  const rerender = () => tick((n) => n + 1);

  function vpSize() {
    const el = vpRef.current;
    if (!el) return { w: 480, h: 270 };
    const r = el.getBoundingClientRect();
    return { w: r.width || 480, h: r.height || 270 };
  }

  function clamp(ox, oy, s) {
    if (!st.current.natW) return { x: ox, y: oy };
    const { w, h } = vpSize();
    const rW = st.current.natW * s;
    const rH = st.current.natH * s;
    return {
      x: rW <= w ? (w - rW) / 2 : Math.min(0, Math.max(w - rW, ox)),
      y: rH <= h ? (h - rH) / 2 : Math.min(0, Math.max(h - rH, oy)),
    };
  }

  function onImgLoad() {
    const img = imgRef.current;
    requestAnimationFrame(() => {
      const { w, h } = vpSize();
      const nW = img.naturalWidth;
      const nH = img.naturalHeight;
      const s = Math.max(w / nW, h / nH);
      st.current.natW = nW;
      st.current.natH = nH;
      st.current.minScale = s;
      st.current.scale = s;
      const off = clamp((w - nW * s) / 2, (h - nH * s) / 2, s);
      st.current.ox = off.x;
      st.current.oy = off.y;
      rerender();
    });
  }

  function onMouseDown(e) {
    e.preventDefault();
    st.current.dragging = true;
    st.current.dragX = e.clientX - st.current.ox;
    st.current.dragY = e.clientY - st.current.oy;
  }

  function onMouseMove(e) {
    if (!st.current.dragging) return;
    const off = clamp(e.clientX - st.current.dragX, e.clientY - st.current.dragY, st.current.scale);
    st.current.ox = off.x;
    st.current.oy = off.y;
    rerender();
  }

  function onMouseUp() { st.current.dragging = false; }

  useEffect(() => {
    const el = vpRef.current;
    if (!el) return;
    function onWheel(e) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.08 : 0.08;
      const newS = Math.max(st.current.minScale, Math.min(st.current.minScale * 4, st.current.scale + delta * st.current.minScale));
      const { w, h } = vpSize();
      const cx = w / 2, cy = h / 2;
      const natCX = (cx - st.current.ox) / st.current.scale;
      const natCY = (cy - st.current.oy) / st.current.scale;
      const off = clamp(cx - natCX * newS, cy - natCY * newS, newS);
      st.current.scale = newS;
      st.current.ox = off.x;
      st.current.oy = off.y;
      rerender();
    }
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  function onSliderChange(e) {
    const newS = parseFloat(e.target.value);
    const { w, h } = vpSize();
    const cx = w / 2, cy = h / 2;
    const natCX = (cx - st.current.ox) / st.current.scale;
    const natCY = (cy - st.current.oy) / st.current.scale;
    const off = clamp(cx - natCX * newS, cy - natCY * newS, newS);
    st.current.scale = newS;
    st.current.ox = off.x;
    st.current.oy = off.y;
    rerender();
  }

  function applyCrop() {
    const img = imgRef.current;
    if (!img || !st.current.natW) return;
    const { w: vpW, h: vpH } = vpSize();
    const srcX = -st.current.ox / st.current.scale;
    const srcY = -st.current.oy / st.current.scale;
    const srcW = vpW / st.current.scale;
    const srcH = vpH / st.current.scale;
    const OUT_W = 1200;
    const OUT_H = Math.round(OUT_W * vpH / vpW);
    const canvas = document.createElement('canvas');
    canvas.width = OUT_W;
    canvas.height = OUT_H;
    canvas.getContext('2d').drawImage(img, srcX, srcY, srcW, srcH, 0, 0, OUT_W, OUT_H);
    const dataURL = canvas.toDataURL('image/jpeg', 0.9);
    canvas.toBlob((blob) => {
      const file = new File([blob], 'cropped.jpg', { type: 'image/jpeg' });
      onDone(file, dataURL);
    }, 'image/jpeg', 0.9);
  }

  const s = st.current;

  return (
    <div className="ch-modal-overlay" onClick={onCancel}>
      <div className="ch-crop-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ch-modal-header" style={{ padding: '1.25rem 1.5rem 0.75rem' }}>
          <h2 className="ch-modal-title">Crop Image</h2>
          <p className="ch-modal-subtitle">Drag to reposition · scroll or use the slider to zoom</p>
        </div>

        <div
          ref={vpRef}
          className="ch-crop-viewport"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          style={{ cursor: s.dragging ? 'grabbing' : 'grab' }}
        >
          <img
            ref={imgRef}
            src={src}
            alt=""
            onLoad={onImgLoad}
            style={{
              position: 'absolute',
              left: s.ox,
              top: s.oy,
              width: s.natW * s.scale,
              height: s.natH * s.scale,
              pointerEvents: 'none',
              userSelect: 'none',
            }}
            draggable={false}
          />
          <div className="ch-crop-frame" />
        </div>

        <div className="ch-crop-controls">
          <span className="ch-crop-zoom-label">Zoom</span>
          <input
            type="range"
            className="ch-crop-slider"
            min={s.minScale || 0.1}
            max={(s.minScale || 0.1) * 4}
            step={0.001}
            value={s.scale}
            onChange={onSliderChange}
          />
        </div>

        <div className="ch-modal-footer" style={{ padding: '0.25rem 1.5rem 1.25rem' }}>
          <button className="ch-btn-cancel" type="button" onClick={onCancel}>Cancel</button>
          <button className="ch-btn-save" type="button" onClick={applyCrop}>Apply Crop</button>
        </div>
      </div>
    </div>
  );
}
