import { useEffect, useMemo, useState } from 'react';
import { bookAvailableSession, cancelMyBooking, getAvailableSessions, getMyBookings } from '../services/api';
import './CandidateInterviews.css';
import './CareerHub.css';

const BOOKING_STYLE = {
  PENDING:   { bg: '#fef9c3', color: '#854d0e', border: '#facc15' },
  CONFIRMED: { bg: '#dcfce7', color: '#166534', border: '#22c55e' },
};

function fmtDt(iso) {
  return new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function CareerSessions() {
  const [sessions, setSessions]     = useState([]);
  const [bookings, setBookings]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [bookingFor, setBookingFor] = useState(null);
  const [notes, setNotes]           = useState('');
  const [saving, setSaving]         = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [avail, myBookings] = await Promise.all([
          getAvailableSessions(),
          getMyBookings(),
        ]);
        setSessions(avail);
        // Only keep PENDING and CONFIRMED — rejected/removed are simply hidden
        setBookings(myBookings.filter((b) => b.status === 'PENDING' || b.status === 'CONFIRMED'));
      } catch (e) {
        setError(e.message || 'Failed to load sessions');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleBook(e) {
    e.preventDefault();
    if (!bookingFor) return;
    try {
      setSaving(true);
      setError('');
      const booking = await bookAvailableSession(bookingFor.id, notes);
      setBookings((prev) => [booking, ...prev]);
      setSessions((prev) => prev.map((s) =>
        s.id === bookingFor.id
          ? { ...s, user_booking: { id: booking.id, status: 'PENDING' } }
          : s
      ));
      setBookingFor(null);
      setNotes('');
    } catch (e) {
      setError(e.message || 'Failed to book session');
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel(bookingId, sessionId) {
    try {
      await cancelMyBooking(bookingId);
      // Remove booking from list entirely
      setBookings((prev) => prev.filter((b) => b.id !== bookingId));
      // Restore "Request booking" button on the available session card
      setSessions((prev) => prev.map((s) =>
        s.id === sessionId ? { ...s, user_booking: null } : s
      ));
    } catch (e) {
      setError(e.message || 'Failed to cancel booking');
    }
  }

  const now = new Date();
  // Only PENDING/CONFIRMED shown; split by whether session is in future or past
  const upcoming = useMemo(() =>
    bookings.filter((b) => new Date(b.session_start) >= now),
    [bookings]
  );
  const past = useMemo(() =>
    bookings.filter((b) => new Date(b.session_start) < now),
    [bookings]
  );

  return (
    <main className="ci-main">
      {error && <div className="ci-error" onClick={() => setError('')}>{error}</div>}

      {/* ── Available sessions ─────────────────── */}
      <section className="ci-card">
        <h2>Available sessions</h2>
        <p className="muted" style={{ marginBottom: '1rem' }}>
          Sessions opened by the Career Support Specialist — click to request a booking.
        </p>

        {loading ? (
          <p className="muted">Loading…</p>
        ) : sessions.length === 0 ? (
          <p className="muted">No sessions available right now. Check back soon!</p>
        ) : (
          <div className="ch-avail-session-list">
            {sessions.map((s) => (
              <AvailableSessionCard
                key={s.id}
                session={s}
                onBook={() => { setBookingFor(s); setNotes(''); setError(''); }}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Upcoming bookings ──────────────────── */}
      <section className="ci-card">
        <h2>Upcoming bookings</h2>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : upcoming.length === 0 ? (
          <p className="muted">No upcoming bookings. Request one above!</p>
        ) : (
          <div className="ch-session-list">
            {upcoming.map((b) => (
              <BookingRow
                key={b.id}
                booking={b}
                canCancel
                onCancel={() => handleCancel(b.id, b.session)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Past bookings ──────────────────────── */}
      <section className="ci-card">
        <h2>Past bookings</h2>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : past.length === 0 ? (
          <p className="muted">No past bookings yet.</p>
        ) : (
          <div className="ch-session-list">
            {past.map((b) => (
              <BookingRow key={b.id} booking={b} />
            ))}
          </div>
        )}
      </section>

      {/* ── Booking request modal ──────────────── */}
      {bookingFor && (
        <div className="ch-modal-overlay" onClick={() => setBookingFor(null)}>
          <div className="ch-modal ch-booking-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ch-modal-header">
              <h2 className="ch-modal-title">Request booking</h2>
              <p className="ch-modal-subtitle">
                <strong>{bookingFor.title}</strong>
                {' · '}
                {fmtDt(bookingFor.scheduled_start)}
                {' · '}
                {bookingFor.duration_minutes} min
              </p>
            </div>

            {error && <div className="ci-error ch-modal-error">{error}</div>}

            <form onSubmit={handleBook} style={{ padding: '0 1.5rem' }}>
              <label className="ch-form-label" style={{ display: 'block', marginBottom: '0.4rem' }}>
                Notes for the specialist{' '}
                <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span>
              </label>
              <textarea
                className="ch-form-textarea"
                placeholder="What would you like to discuss? Any specific questions or goals?"
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <div className="ch-modal-footer" style={{ paddingLeft: 0, paddingRight: 0 }}>
                <button type="button" className="ch-btn-cancel" onClick={() => setBookingFor(null)}>
                  Cancel
                </button>
                <button type="submit" className="ch-btn-save" disabled={saving}>
                  {saving ? 'Sending…' : 'Send request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

/* ── Available session card ──────────────────────────────── */
function AvailableSessionCard({ session: s, onBook }) {
  const bStatus = s.user_booking?.status;
  // Only PENDING/CONFIRMED count as "booked" for display; REJECTED → show button again
  const bStyle = bStatus ? BOOKING_STYLE[bStatus] : null;
  const alreadyBooked = !!bStyle; // null when status unknown or REJECTED

  return (
    <div className="ch-avail-session-card">
      <div className="ch-avail-session-info">
        <span className="ch-avail-session-title">{s.title}</span>
        {s.description && (
          <span className="ch-avail-session-desc">{s.description}</span>
        )}
        <span className="ch-avail-session-meta">
          {fmtDt(s.scheduled_start)} · {s.duration_minutes} min
        </span>
      </div>
      <div className="ch-avail-session-action">
        {alreadyBooked ? (
          <span
            className="ch-status-badge"
            style={{ background: bStyle.bg, color: bStyle.color, borderColor: bStyle.border }}
          >
            {bStatus}
          </span>
        ) : (
          <button className="ch-btn-save ch-avail-book-btn" onClick={onBook}>
            Request booking
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Booking row ─────────────────────────────────────────── */
function BookingRow({ booking: b, canCancel, onCancel }) {
  const style = BOOKING_STYLE[b.status] ?? BOOKING_STYLE.PENDING;
  return (
    <div className="ch-session-row">
      <div className="ch-session-info">
        <span className="ch-session-topic">{b.session_title}</span>
        {b.notes && <span className="ch-session-notes">{b.notes}</span>}
      </div>
      <div className="ch-session-meta">
        <span className="ch-session-time">{fmtDt(b.session_start)}</span>
        <span
          className="ch-status-badge"
          style={{ background: style.bg, color: style.color, borderColor: style.border }}
        >
          {b.status}
        </span>
        {canCancel && (
          <button className="ch-booking-cancel-btn" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
