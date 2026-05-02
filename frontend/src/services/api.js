/**
 * API base URL and auth helpers.
 * Step 1: Auth – login, register, me.
 */

const API_BASE = '/api';

export function getStoredToken() {
  return localStorage.getItem('access_token');
}

export function getRefreshToken() {
  return localStorage.getItem('refresh_token');
}

let refreshInFlight = null;

async function refreshAccessToken() {
  const refresh = getRefreshToken();
  if (!refresh) return false;
  const res = await fetch(`${API_BASE}/auth/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    clearAuth();
    return false;
  }
  if (data.access) localStorage.setItem('access_token', data.access);
  if (data.refresh) localStorage.setItem('refresh_token', data.refresh);
  return true;
}

function refreshAccessTokenLocked() {
  if (!refreshInFlight) {
    refreshInFlight = refreshAccessToken().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

/**
 * Authenticated fetch: attaches Bearer access token; on 401 refreshes once and retries.
 */
async function authFetch(input, init = {}) {
  const next = { ...init };
  const headers = new Headers(init.headers ?? undefined);
  const token = getStoredToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  next.headers = headers;

  let res = await fetch(input, next);
  if (res.status === 401 && getRefreshToken()) {
    const ok = await refreshAccessTokenLocked();
    if (ok) {
      const headers2 = new Headers(init.headers ?? undefined);
      const t2 = getStoredToken();
      if (t2) headers2.set('Authorization', `Bearer ${t2}`);
      res = await fetch(input, { ...init, headers: headers2 });
    }
  }
  return res;
}

/** First human-readable error from DRF JSON (field errors or detail). */
function firstAuthError(data) {
  if (!data || typeof data !== 'object') return '';
  if (typeof data.detail === 'string') return data.detail;
  if (Array.isArray(data.detail) && data.detail.length) return String(data.detail[0]);
  const keys = ['non_field_errors', 'email', 'password', 'name', 'role'];
  for (const k of keys) {
    const v = data[k];
    if (Array.isArray(v) && v.length) return String(v[0]);
    if (typeof v === 'string') return v;
  }
  for (const k of Object.keys(data)) {
    const v = data[k];
    if (Array.isArray(v) && v.length) return String(v[0]);
  }
  return '';
}

function apiErrorMessage(data, fallback) {
  const raw = data?.detail;
  const msg =
    typeof raw === 'string'
      ? raw
      : Array.isArray(raw) && raw.length
        ? String(raw[0])
        : fallback;
  if (
    typeof msg === 'string' &&
    /token/i.test(msg) &&
    /valid/i.test(msg)
  ) {
    return 'Your session has expired. Please log in again.';
  }
  return msg || fallback;
}

export async function login(email, password) {
  const res = await fetch(`${API_BASE}/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(firstAuthError(data) || 'Login failed');
  return data;
}

export async function register({ name, email, password, role = 'CANDIDATE' }) {
  const res = await fetch(`${API_BASE}/auth/register/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password, role }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = firstAuthError(data);
    if (res.status >= 500) {
      throw new Error(
        msg ||
        'Server error — is the backend running? Check the terminal. If the email is already registered, use another email or sign in.',
      );
    }
    throw new Error(msg || 'Registration failed');
  }
  return data;
}

export async function me() {
  if (!getStoredToken()) return null;
  const res = await authFetch(`${API_BASE}/auth/me/`, {});
  if (!res.ok) return null;
  return res.json();
}

export function storeAuth({ access, refresh, user }) {
  if (access) localStorage.setItem('access_token', access);
  if (refresh) localStorage.setItem('refresh_token', refresh);
  if (user) localStorage.setItem('user', JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
}

// Admin: User Management
export async function adminListUsers(role = null) {
  const url = role ? `${API_BASE}/auth/admin/users/?role=${role}` : `${API_BASE}/auth/admin/users/`;
  const res = await authFetch(url, {});
  if (!res.ok) throw new Error('Failed to load users');
  return res.json();
}

export async function adminUpdateUser(userId, data) {
  const res = await authFetch(`${API_BASE}/auth/admin/users/${userId}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(apiErrorMessage(out, 'Failed to update user'));
  return out;
}

export async function adminDeleteUser(userId) {
  const res = await authFetch(`${API_BASE}/auth/admin/users/${userId}/delete/`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete user');
}

export async function adminListJobs() {
  const res = await authFetch(`${API_BASE}/jobs/admin/all/`, {});
  if (!res.ok) throw new Error('Failed to load jobs');
  return res.json();
}

export async function adminUpdateJob(jobId, data) {
  const res = await authFetch(`${API_BASE}/jobs/admin/${jobId}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(apiErrorMessage(out, 'Failed to update job'));
  return out;
}

export async function adminDeleteJob(jobId) {
  const res = await authFetch(`${API_BASE}/jobs/admin/${jobId}/`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete job');
}

// Step 2: Resumes
export async function getResumes() {
  const res = await authFetch(`${API_BASE}/resumes/`, {});
  if (!res.ok) throw new Error('Failed to load resumes');
  return res.json();
}

export async function createResume(formData) {
  const res = await authFetch(`${API_BASE}/resumes/`, {
    method: 'POST',
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(apiErrorMessage(data, 'Failed to create resume'));
  return data;
}

export async function uploadResumeVersion(resumeId, file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await authFetch(`${API_BASE}/resumes/${resumeId}/versions/`, {
    method: 'POST',
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(apiErrorMessage(data, 'Failed to upload'));
  return data;
}

export async function updateResumeVisibility(resumeId, visibility) {
  const res = await authFetch(`${API_BASE}/resumes/${resumeId}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ visibility }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(apiErrorMessage(data, 'Failed to update visibility'));
  return data;
}

export async function getResumeAnalytics() {
  const res = await authFetch(`${API_BASE}/resumes/analytics/`, {});
  if (!res.ok) throw new Error('Failed to load analytics');
  return res.json();
}

export async function getCertificates() {
  const res = await authFetch(`${API_BASE}/resumes/certificates/`, {});
  if (!res.ok) throw new Error('Failed to load certificates');
  return res.json();
}

export async function addCertificate(formData) {
  const res = await authFetch(`${API_BASE}/resumes/certificates/`, {
    method: 'POST',
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(apiErrorMessage(data, 'Failed to add certificate'));
  return data;
}

export async function deleteCertificate(id) {
  const res = await authFetch(`${API_BASE}/resumes/certificates/${id}/`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete certificate');
}

// Step 3: Jobs (recruiter)
export async function getJobs(activeOnly = false) {
  const url = activeOnly ? `${API_BASE}/jobs/?active=true` : `${API_BASE}/jobs/`;
  const res = await authFetch(url, {});
  if (!res.ok) throw new Error('Failed to load jobs');
  return res.json();
}

export async function createJob(data) {
  const res = await authFetch(`${API_BASE}/jobs/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      apiErrorMessage(out, out.title?.[0] || 'Failed to create job'),
    );
  }
  return out;
}

export async function updateJob(id, data) {
  const res = await authFetch(`${API_BASE}/jobs/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(apiErrorMessage(out, 'Failed to update job'));
  return out;
}

export async function deleteJob(id) {
  const res = await authFetch(`${API_BASE}/jobs/${id}/`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete job');
}

// Candidate side: browse jobs and apply
export async function getActiveJobs() {
  const res = await authFetch(`${API_BASE}/jobs/active/list/`, {});
  if (!res.ok) throw new Error('Failed to load active jobs');
  return res.json();
}

export async function getMyJobMatch(jobId) {
  const res = await authFetch(`${API_BASE}/jobs/${jobId}/my-match/`, {});
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(apiErrorMessage(data, 'Failed to load match analytics'));
  return data;
}

export async function getMyJobApplications() {
  const res = await authFetch(`${API_BASE}/jobs/my/applications/`, {});
  if (!res.ok) throw new Error('Failed to load applications');
  return res.json();
}

export async function applyToJob(jobId) {
  const res = await authFetch(`${API_BASE}/jobs/${jobId}/apply/`, {
    method: 'POST',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(apiErrorMessage(data, 'Failed to apply'));
  return data;
}

// Recruiter: view applicants for a job
export async function getJobApplications(jobId) {
  const res = await authFetch(`${API_BASE}/jobs/${jobId}/applications/`, {});
  if (!res.ok) throw new Error('Failed to load applications');
  return res.json();
}

export async function getJobDetail(jobId) {
  const res = await authFetch(`${API_BASE}/jobs/${jobId}/`, {});
  if (!res.ok) throw new Error('Failed to load job');
  return res.json();
}

// Recruiter: run ranking and get scored candidates
export async function rankCandidates(jobId) {
  const res = await authFetch(`${API_BASE}/jobs/${jobId}/rank/`, {});
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(apiErrorMessage(data, 'Failed to rank candidates'));
  return data;
}

export async function recalculateRanking(jobId, weights) {
  const res = await authFetch(`${API_BASE}/ranking/recalculate/${jobId}/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(weights),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(apiErrorMessage(data, 'Failed to re-rank'));
  return data;
}

export async function clearRanking(jobId) {
  const res = await authFetch(`${API_BASE}/ranking/clear/${jobId}/`, {
    method: 'DELETE',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(apiErrorMessage(data, 'Failed to clear ranking'));
  return data;
}

// Recruiter: RAG (candidate summary / interview prep)
export async function askRecruiterRAG(useCase, jobId, applicationId) {
  const res = await authFetch(`${API_BASE}/rag/recruiter/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      use_case: useCase,
      job_id: jobId,
      application_id: applicationId,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(apiErrorMessage(data, 'RAG request failed'));
  return data;
}

// Step 5: Interview management
export async function getRecruiterInterviews(params = {}) {
  const sp = new URLSearchParams();
  if (params.year) sp.set('year', params.year);
  if (params.month) sp.set('month', params.month);
  if (params.status) sp.set('status', params.status);
  const qs = sp.toString();
  const url = qs ? `${API_BASE}/interviews/?${qs}` : `${API_BASE}/interviews/`;
  const res = await authFetch(url, {});
  if (!res.ok) throw new Error('Failed to load interviews');
  return res.json();
}

export async function createInterview(payload) {
  const res = await authFetch(`${API_BASE}/interviews/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(apiErrorMessage(data, 'Failed to create interview'));
  return data;
}

export async function updateInterview(id, payload) {
  const res = await authFetch(`${API_BASE}/interviews/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(apiErrorMessage(data, 'Failed to update interview'));
  return data;
}

export async function getMyInterviews() {
  const res = await authFetch(`${API_BASE}/interviews/my/`, {});
  if (!res.ok) throw new Error('Failed to load my interviews');
  return res.json();
}

export async function confirmInterview(id) {
  const res = await authFetch(`${API_BASE}/interviews/${id}/confirm/`, {
    method: 'PATCH',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(apiErrorMessage(data, 'Failed to confirm'));
  return data;
}

export async function requestReschedule(id) {
  const res = await authFetch(`${API_BASE}/interviews/${id}/reschedule/`, {
    method: 'PATCH',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(apiErrorMessage(data, 'Failed to request reschedule'));
  return data;
}

// Step 6: Plans & billing (recruiter)
export async function adminGetFinancialData() {
  const res = await authFetch(`${API_BASE}/billing/admin/data/`, {});
  if (!res.ok) throw new Error('Failed to load financial data');
  return res.json();
}

export async function adminGetPlans() {
  const res = await authFetch(`${API_BASE}/billing/admin/plans/`, {});
  if (!res.ok) throw new Error('Failed to load plans');
  return res.json();
}

export async function adminCreatePlan(data) {
  const res = await authFetch(`${API_BASE}/billing/admin/plans/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(apiErrorMessage(out, 'Failed to create plan'));
  return out;
}

export async function adminUpdatePlan(id, data) {
  const res = await authFetch(`${API_BASE}/billing/admin/plans/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(apiErrorMessage(out, 'Failed to update plan'));
  return out;
}

export async function adminDeletePlan(id) {
  const res = await authFetch(`${API_BASE}/billing/admin/plans/${id}/`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete plan');
}

export async function getPlans() {
  const res = await fetch(`${API_BASE}/billing/plans/`);
  if (!res.ok) throw new Error('Failed to load plans');
  return res.json();
}

export async function getMySubscription() {
  const res = await authFetch(`${API_BASE}/billing/me/`, {});
  if (!res.ok) throw new Error('Failed to load subscription');
  return res.json();
}

export async function updateSubscription(planCode) {
  const res = await authFetch(`${API_BASE}/billing/me/`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan_code: planCode }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(apiErrorMessage(data, 'Failed to update subscription'));
  return data;
}

export async function cancelSubscription() {
  const res = await authFetch(`${API_BASE}/billing/me/`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to cancel subscription');
}

export async function startSubscription(planCode, checkout) {
  const res = await authFetch(`${API_BASE}/billing/start/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      plan_code: planCode,
      cardholder_name: checkout.cardholder_name,
      card_number: checkout.card_number,
      exp_month: checkout.exp_month,
      exp_year: checkout.exp_year,
      cvc: checkout.cvc,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(apiErrorMessage(data, 'Failed to start subscription'));
  return data;
}

export async function renewSubscription() {
  const res = await authFetch(`${API_BASE}/billing/renew/`, {
    method: 'POST',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(apiErrorMessage(data, 'Failed to renew subscription'));
  return data;
}

// Step 7: Smart Career Support Hub (candidate)
export async function getCareerResources() {
  const res = await fetch(`${API_BASE}/career/resources/`);
  if (!res.ok) throw new Error('Failed to load resources');
  return res.json();
}

export async function getMyCareerSessions() {
  const res = await authFetch(`${API_BASE}/career/sessions/my/`, {});
  if (!res.ok) throw new Error('Failed to load sessions');
  return res.json();
}

export async function createCareerSession(payload) {
  const res = await authFetch(`${API_BASE}/career/sessions/my/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(apiErrorMessage(data, 'Failed to create session'));
  return data;
}

// Career Support Hub Specialist — dedicated login (username + password)
export async function careerAdminLogin(username, password) {
  const res = await fetch(`${API_BASE}/career/admin-login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || 'Login failed');
  return data;
}

// Career Support Hub Specialist (ADMIN) resource management
export async function adminCreateCareerResource(formData) {
  const res = await authFetch(`${API_BASE}/career/resources/`, {
    method: 'POST',
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(apiErrorMessage(data, 'Failed to create resource'));
  return data;
}

export async function adminUpdateCareerResource(id, formData) {
  const res = await authFetch(`${API_BASE}/career/resources/${id}/`, {
    method: 'PATCH',
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(apiErrorMessage(data, 'Failed to update resource'));
  return data;
}

export async function adminDeleteCareerResource(id) {
  const res = await authFetch(`${API_BASE}/career/resources/${id}/`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete resource');
}

// Session slots — candidate booking flow
export async function getAvailableSessions() {
  const res = await authFetch(`${API_BASE}/career/available-sessions/`, {});
  if (!res.ok) throw new Error('Failed to load available sessions');
  return res.json();
}

export async function bookAvailableSession(sessionId, notes) {
  const res = await authFetch(`${API_BASE}/career/available-sessions/${sessionId}/book/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(apiErrorMessage(data, 'Failed to book session'));
  return data;
}

export async function getMyBookings() {
  const res = await authFetch(`${API_BASE}/career/my-bookings/`, {});
  if (!res.ok) throw new Error('Failed to load bookings');
  return res.json();
}

// Session slots — admin management
export async function adminGetAdminSessions() {
  const res = await authFetch(`${API_BASE}/career/admin/sessions/`, {});
  if (!res.ok) throw new Error('Failed to load sessions');
  return res.json();
}

export async function adminCreateAdminSession(data) {
  const res = await authFetch(`${API_BASE}/career/admin/sessions/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(apiErrorMessage(out, 'Failed to create session'));
  return out;
}

export async function adminDeleteAdminSession(id) {
  const res = await authFetch(`${API_BASE}/career/admin/sessions/${id}/`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete session');
}

export async function adminGetAllBookings() {
  const res = await authFetch(`${API_BASE}/career/admin/bookings/`, {});
  if (!res.ok) throw new Error('Failed to load bookings');
  return res.json();
}

export async function adminDeleteBooking(id) {
  const res = await authFetch(`${API_BASE}/career/admin/bookings/${id}/`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to remove booking');
}

export async function adminUpdateAdminSession(id, data) {
  const res = await authFetch(`${API_BASE}/career/admin/sessions/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(apiErrorMessage(out, 'Failed to update session'));
  return out;
}

export async function cancelMyBooking(id) {
  const res = await authFetch(`${API_BASE}/career/my-bookings/${id}/`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to cancel booking');
}

export async function adminUpdateBookingStatus(id, bookingStatus) {
  const res = await authFetch(`${API_BASE}/career/admin/bookings/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: bookingStatus }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(apiErrorMessage(data, 'Failed to update booking'));
  return data;
}

// Step 8: Notifications
export async function getNotifications() {
  const res = await authFetch(`${API_BASE}/notifications/`, {});
  if (!res.ok) throw new Error('Failed to load notifications');
  return res.json();
}

export async function markNotificationRead(id) {
  const res = await authFetch(`${API_BASE}/notifications/${id}/read/`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to mark notification as read');
}

export async function markAllNotificationsRead() {
  const res = await authFetch(`${API_BASE}/notifications/mark-all-read/`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to mark all notifications as read');
}
