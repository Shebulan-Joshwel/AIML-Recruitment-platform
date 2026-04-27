import { useEffect, useState, useMemo } from 'react';
import { getCareerResources } from '../services/api';
import './CandidateInterviews.css';
import './CareerHub.css';

const DIFFICULTY_STYLE = {
  beginner:     { bg: '#dcfce7', color: '#166534', border: '#22c55e' },
  intermediate: { bg: '#fef9c3', color: '#854d0e', border: '#facc15' },
  advanced:     { bg: '#fee2e2', color: '#991b1b', border: '#f87171' },
};

const DIFFICULTIES = ['All', 'Beginner', 'Intermediate', 'Advanced'];

function diffStyle(difficulty) {
  return DIFFICULTY_STYLE[(difficulty || '').toLowerCase()] ?? {
    bg: '#f1f5f9', color: '#475569', border: '#94a3b8',
  };
}

export default function CareerResources() {
  const [resources, setResources]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [search, setSearch]         = useState('');
  const [diffFilter, setDiffFilter] = useState('All');
  const [selected, setSelected]     = useState(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setResources(await getCareerResources());
      } catch (e) {
        setError(e.message || 'Failed to load resources');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return resources.filter((r) => {
      const matchSearch =
        !q ||
        r.title.toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q) ||
        (r.tags || '').toLowerCase().includes(q);
      const matchDiff =
        diffFilter === 'All' ||
        (r.difficulty || '').toLowerCase() === diffFilter.toLowerCase();
      return matchSearch && matchDiff;
    });
  }, [resources, search, diffFilter]);

  return (
    <main className="ci-main ch-resources-main">
      {error && <div className="ci-error">{error}</div>}

      {/* ── Hero / search ──────────────────────── */}
      <div className="ch-resources-hero">
        <h1 className="ch-resources-title">Resources &amp; Recommendations</h1>
        <p className="ch-resources-subtitle">
          Curated learning materials to accelerate your career growth
        </p>

        <input
          className="ch-search-input"
          type="search"
          placeholder="Search by title, topic, or tag…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="ch-diff-filters">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              className={`ch-diff-btn${diffFilter === d ? ' ch-diff-btn-active' : ''}`}
              onClick={() => setDiffFilter(d)}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* ── Count line ─────────────────────────── */}
      {!loading && resources.length > 0 && (
        <p className="ch-resources-count">
          Showing {filtered.length} of {resources.length} resource
          {resources.length !== 1 ? 's' : ''}
          {diffFilter !== 'All' ? ` · ${diffFilter}` : ''}
          {search ? ` · "${search}"` : ''}
        </p>
      )}

      {/* ── Grid ───────────────────────────────── */}
      {loading ? (
        <p style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem 0' }}>
          Loading resources…
        </p>
      ) : filtered.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem 0' }}>
          {resources.length === 0
            ? 'No curated resources yet. Check back soon.'
            : 'No resources match your search.'}
        </p>
      ) : (
        <div className="ch-resource-grid">
          {filtered.map((r) => (
            <ResourceCard key={r.id} resource={r} onClick={() => setSelected(r)} />
          ))}
        </div>
      )}

      {/* ── Detail popup ───────────────────────── */}
      {selected && (
        <ResourceDetailModal resource={selected} onClose={() => setSelected(null)} />
      )}
    </main>
  );
}

/* ── Resource card ───────────────────────────────────────── */
function ResourceCard({ resource: r, onClick }) {
  const style = diffStyle(r.difficulty);
  const tags  = r.tags
    ? r.tags.split(',').map((t) => t.trim()).filter(Boolean)
    : [];

  return (
    <article className="ch-resource-card" onClick={onClick}>
      {/* Cover image */}
      {r.image_url ? (
        <div className="ch-resource-cover">
          <img src={r.image_url} alt={r.title} className="ch-resource-cover-img" />
          {r.difficulty && (
            <span
              className="ch-resource-cover-diff"
              style={{ background: style.bg, color: style.color, borderColor: style.border }}
            >
              {r.difficulty}
            </span>
          )}
        </div>
      ) : r.difficulty ? (
        <div className="ch-resource-card-header">
          <span
            className="ch-resource-diff"
            style={{ background: style.bg, color: style.color, borderColor: style.border }}
          >
            {r.difficulty}
          </span>
        </div>
      ) : null}

      <h3 className="ch-resource-card-title">{r.title}</h3>

      {r.description && (
        <p className="ch-resource-desc">{r.description}</p>
      )}

      {tags.length > 0 && (
        <div className="ch-resource-tags">
          {tags.map((t) => <span key={t} className="ch-resource-tag">{t}</span>)}
        </div>
      )}

      <span className="ch-resource-read-more">Click to read more →</span>
    </article>
  );
}

/* ── Resource detail modal ───────────────────────────────── */
export function ResourceDetailModal({ resource: r, onClose, adminActions }) {
  const style = diffStyle(r.difficulty);
  const tags  = r.tags
    ? r.tags.split(',').map((t) => t.trim()).filter(Boolean)
    : [];

  return (
    <div className="ch-modal-overlay" onClick={onClose}>
      <div className="ch-resource-detail-modal" onClick={(e) => e.stopPropagation()}>
        {r.image_url && (
          <div className="ch-detail-img-wrap">
            <img src={r.image_url} alt={r.title} className="ch-detail-img" />
          </div>
        )}

        <div className="ch-detail-body">
          <div className="ch-detail-header">
            <h2 className="ch-detail-title">{r.title}</h2>
            {r.difficulty && (
              <span
                className="ch-detail-diff"
                style={{ background: style.bg, color: style.color, borderColor: style.border }}
              >
                {r.difficulty}
              </span>
            )}
          </div>

          {r.description && (
            <p className="ch-detail-desc">{r.description}</p>
          )}

          {tags.length > 0 && (
            <div className="ch-resource-tags">
              {tags.map((t) => <span key={t} className="ch-resource-tag">{t}</span>)}
            </div>
          )}

          {adminActions ? (
            <div className="ch-detail-admin-actions">
              <button className="ch-btn-cancel" onClick={onClose}>Close</button>
              <button className="ch-admin-edit-btn ch-detail-action-btn" onClick={adminActions.onEdit}>
                Edit
              </button>
              <button className="ch-admin-delete-btn ch-detail-action-btn" onClick={adminActions.onDelete}>
                Delete
              </button>
            </div>
          ) : (
            <button className="ch-detail-close-btn" onClick={onClose}>Close</button>
          )}
        </div>
      </div>
    </div>
  );
}
