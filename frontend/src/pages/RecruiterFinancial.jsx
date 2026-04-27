import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  clearAuth,
  getStoredUser,
  getPlans,
  getMySubscription,
  startSubscription,
  updateSubscription,
  cancelSubscription,
} from '../services/api';
import './RecruiterInterviews.css';

export default function RecruiterFinancial() {
  const navigate = useNavigate();
  const user = getStoredUser();
  const [plans, setPlans] = useState([]);
  const [sub, setSub] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activatingCode, setActivatingCode] = useState('');
  const [checkoutPlan, setCheckoutPlan] = useState(null);
  const [checkout, setCheckout] = useState({
    cardholder_name: '',
    card_number: '',
    exp_month: '',
    exp_year: '',
    cvc: '',
  });
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [p, me] = await Promise.all([getPlans(), getMySubscription()]);
        setPlans(p);
        setSub(me.subscription || null);
        setPayments(me.payments || []);
      } catch (e) {
        setError(e.message || 'Failed to load billing data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!premiumModalOpen) return;
    function onKey(e) {
      if (e.key === 'Escape') setPremiumModalOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [premiumModalOpen]);

  function handleLogout() {
    clearAuth();
    navigate('/');
  }

  async function handleActivate(planCode) {
    if (!checkout.cardholder_name || !checkout.card_number || !checkout.exp_month || !checkout.exp_year || !checkout.cvc) {
      setError('Please fill in all payment details.');
      return;
    }
    try {
      setError('');
      setActivatingCode(planCode);
      const data = await startSubscription(planCode, checkout);
      setSub(data.subscription);
      setPayments((prev) => [data.payment, ...prev]);
      setCheckoutPlan(null);
      setCheckout({
        cardholder_name: '',
        card_number: '',
        exp_month: '',
        exp_year: '',
        cvc: '',
      });
      setPremiumModalOpen(true);
    } catch (e) {
      setError(e.message || 'Failed to activate plan');
    } finally {
      setActivatingCode('');
    }
  }

  async function handleUpdatePlan(planCode) {
    if (!window.confirm('Are you sure you want to change your plan?')) return;
    try {
      setError('');
      setActivatingCode(planCode);
      const data = await updateSubscription(planCode);
      setSub(data.subscription);
      setPayments((prev) => [data.payment, ...prev]);
      alert('Plan updated successfully.');
    } catch (e) {
      setError(e.message || 'Failed to update plan');
    } finally {
      setActivatingCode('');
    }
  }

  async function handleCancelPlan() {
    if (!window.confirm('Are you sure you want to cancel your active plan?')) return;
    try {
      setError('');
      await cancelSubscription();
      setSub(null);
      alert('Plan canceled successfully.');
    } catch (e) {
      setError(e.message || 'Failed to cancel plan');
    }
  }

  return (
    <div className="layout">
      <header className="topbar">
        <div className="topbar-left">
          <span className="brand">AIML Recruitment Platform</span>
          <span className="role-pill role-pill-recruiter">Recruiter</span>
        </div>
        <nav className="topbar-nav">
          <button onClick={() => navigate('/recruiter')}>Dashboard</button>
          <button onClick={() => navigate('/recruiter/interviews')}>Interviews</button>
          <button className="active">Plans &amp; billing</button>
        </nav>
        <div className="topbar-right">
          <span className="user-name">{user?.name}</span>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <main className="ri-main">
        <section className="ri-card">
          <h2>Your current plan</h2>
          {error && <p className="ri-error">{error}</p>}
          {loading ? (
            <p>Loading…</p>
          ) : !sub ? (
            <p className="muted">You do not have an active subscription yet.</p>
          ) : (
            <>
              <div className="current-plan">
                <div>
                  <p className="current-plan-label">Active plan</p>
                  <h3>{sub.plan.name}</h3>
                  <p className="muted">{sub.plan.description}</p>
                </div>
                <div className="current-plan-meta">
                  <div>
                    <span className="small-label">Price</span>
                    <span>
                      {sub.plan.price_monthly} {sub.plan.currency} / month
                    </span>
                  </div>
                  <div>
                    <span className="small-label">Renews</span>
                    <span>{new Date(sub.current_period_end).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div className="current-plan-actions">
                <button type="button" className="btn-danger" onClick={handleCancelPlan}>Cancel Subscription</button>
              </div>
            </>
          )}
        </section>
        <section className="ri-card">
          <h2>Invoices &amp; payments</h2>
          {payments.length === 0 ? (
            <p className="muted">No payments recorded yet.</p>
          ) : (
            <div className="ri-table-wrapper">
              <table className="ri-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Provider</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td>{new Date(p.created_at).toLocaleString()}</td>
                      <td>
                        {p.amount} {p.currency}
                      </td>
                      <td>{p.status}</td>
                      <td>{p.provider}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="ri-card">
          <h2>Choose a plan</h2>
          {loading ? (
            <p>Loading…</p>
          ) : (
            <div className="plan-grid">
              {plans.map((plan) => (
                <article key={plan.id} className="plan-card">
                  <h3>{plan.name}</h3>
                  <p className="plan-price">
                    {plan.price_monthly} {plan.currency}
                    <span>/month</span>
                  </p>
                  <p className="muted">{plan.description}</p>
                  <ul className="plan-features">
                    <li>{plan.job_post_limit} active job posts</li>
                    {plan.ai_ranking_enabled && <li>AI ranking for candidates</li>}
                    {plan.interviews_enabled && <li>Interview scheduling tools</li>}
                    {plan.career_hub_enabled && <li>Access to candidate career hub</li>}
                  </ul>
                  {sub?.plan?.code === plan.code ? (
                    <button type="button" disabled>Current Plan</button>
                  ) : sub ? (
                    <button
                      type="button"
                      disabled={activatingCode === plan.code}
                      onClick={() => handleUpdatePlan(plan.code)}
                    >
                      {activatingCode === plan.code ? 'Updating...' : 'Change to this plan'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={activatingCode === plan.code}
                      onClick={() => setCheckoutPlan(plan)}
                    >
                      Select plan
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        {checkoutPlan && (
          <section className="ri-card checkout-card">
            <h2>Complete payment – {checkoutPlan.name}</h2>
            <p className="muted">
              Enter test card details (e.g. any 16‑digit number starting with 4 or 5). This is a
              mock checkout – no real payment is taken.
            </p>
            <form
              className="ri-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleActivate(checkoutPlan.code);
              }}
            >
              <label>
                Name on card
                <input
                  type="text"
                  value={checkout.cardholder_name}
                  onChange={(e) =>
                    setCheckout((c) => ({ ...c, cardholder_name: e.target.value }))
                  }
                  placeholder="Jane Recruiter"
                />
              </label>
              <label>
                Card number
                <input
                  type="text"
                  value={checkout.card_number}
                  onChange={(e) =>
                    setCheckout((c) => ({ ...c, card_number: e.target.value }))
                  }
                  placeholder="4242 4242 4242 4242"
                />
              </label>
              <div className="ri-row">
                <label>
                  Expiry month
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={checkout.exp_month}
                    onChange={(e) =>
                      setCheckout((c) => ({ ...c, exp_month: e.target.value }))
                    }
                    placeholder="MM"
                  />
                </label>
                <label>
                  Expiry year
                  <input
                    type="number"
                    min="2025"
                    value={checkout.exp_year}
                    onChange={(e) =>
                      setCheckout((c) => ({ ...c, exp_year: e.target.value }))
                    }
                    placeholder="YYYY"
                  />
                </label>
                <label>
                  CVC
                  <input
                    type="password"
                    maxLength={4}
                    value={checkout.cvc}
                    onChange={(e) => setCheckout((c) => ({ ...c, cvc: e.target.value }))}
                    placeholder="123"
                  />
                </label>
              </div>
              <div className="checkout-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setCheckoutPlan(null)}
                >
                  Cancel
                </button>
                <button type="submit" disabled={activatingCode === checkoutPlan.code}>
                  {activatingCode === checkoutPlan.code ? 'Processing…' : 'Pay & activate'}
                </button>
              </div>
            </form>
          </section>
        )}
      </main>

      {premiumModalOpen && (
        <div
          className="premium-modal-backdrop"
          role="presentation"
          onClick={() => setPremiumModalOpen(false)}
        >
          <div
            className="premium-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="premium-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="premium-modal-icon" aria-hidden>
              ✓
            </div>
            <h2 id="premium-modal-title">You are a premium user</h2>
            <p className="premium-modal-text">
              Your payment was successful. You now have access to all features included in your plan.
            </p>
            <button
              type="button"
              className="premium-modal-ok"
              onClick={() => setPremiumModalOpen(false)}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

