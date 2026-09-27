import React from 'react';
import type { TraceabilityRequirement } from '../types.js';

interface TraceabilityTabProps {
  requirements: TraceabilityRequirement[];
}

export const TraceabilityTab: React.FC<TraceabilityTabProps> = ({ requirements }) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  const filtered = (requirements ?? []).filter((r) => {
    const q = searchTerm.toLowerCase();
    const tags = r.tags ?? [];
    return (
      (r.id ?? '').toLowerCase().includes(q) ||
      (r.title ?? '').toLowerCase().includes(q) ||
      tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div id="traceability-tab-view">
      <div
        className="panel-header"
        style={{ marginBottom: '1rem', borderBottom: 'none', padding: 0 }}
      >
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600, margin: 0 }}>Traceability Matrix</h2>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
            Deterministic mappings linking requirements, code changes, and test suites.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Showing {filtered.length} of {(requirements ?? []).length} requirements
          </span>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="filter-bar">
        <input
          id="search-traceability"
          type="text"
          className="search-input"
          placeholder="Filter requirements by ID, title, or tag..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button className="btn btn-secondary btn-sm" onClick={() => setSearchTerm('')}>
            Clear
          </button>
        )}
      </div>

      {/* Traceability Table */}
      <div className="table-wrapper">
        <table className="table" id="traceability-table">
          <thead>
            <tr>
              <th style={{ width: '22%' }}>Requirement</th>
              <th style={{ width: '28%' }}>Implementation Evidence</th>
              <th style={{ width: '28%' }}>Test Evidence</th>
              <th style={{ width: '11%' }}>Match Strength</th>
              <th style={{ width: '11%' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((req) => {
              const isExpanded = expandedId === req.id;
              const linkedCode = req.linkedCodeArtifacts ?? [];
              const linkedTests = req.linkedTestArtifacts ?? [];
              const hasCode = linkedCode.length > 0;
              const hasTests = linkedTests.length > 0;
              const primaryStrength = hasCode ? (linkedCode[0]?.strength ?? 'none') : 'none';
              const status =
                req.status ?? (hasCode && hasTests ? 'verified' : 'needs_human_review');
              const acceptanceCriteria = req.acceptanceCriteria ?? [];
              const tags = req.tags ?? [];

              return (
                <React.Fragment key={req.id}>
                  <tr
                    style={{
                      cursor: 'pointer',
                      background: isExpanded ? 'var(--bg-card-hover)' : undefined,
                    }}
                    onClick={() => toggleExpand(req.id)}
                    id={`row-${req.id}`}
                  >
                    <td>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          marginBottom: '0.2rem',
                        }}
                      >
                        <span className="mono" style={{ color: '#818cf8', fontWeight: 600 }}>
                          {req.id}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {isExpanded ? '▲' : '▼'}
                        </span>
                      </div>
                      <div style={{ fontWeight: 500, fontSize: '0.8rem', lineHeight: 1.3 }}>
                        {req.title}
                      </div>
                    </td>

                    <td>
                      {hasCode ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                          {linkedCode.map((code) => (
                            <div
                              key={code.id}
                              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                            >
                              <span className="file-link">{code.filePath}</span>
                              <span
                                className="badge badge-strength-strong"
                                style={{ fontSize: '0.65rem' }}
                              >
                                {code.method}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span
                          style={{
                            color: 'var(--status-missing)',
                            fontStyle: 'italic',
                            fontSize: '0.78rem',
                          }}
                        >
                          — No code evidence found —
                        </span>
                      )}
                    </td>

                    <td>
                      {hasTests ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                          {linkedTests.map((test) => (
                            <div
                              key={test.id}
                              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                            >
                              <span className="file-link">{test.filePath}</span>
                              <span
                                className="badge badge-strength-strong"
                                style={{ fontSize: '0.65rem' }}
                              >
                                {test.method}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span
                          style={{
                            color: 'var(--status-missing)',
                            fontStyle: 'italic',
                            fontSize: '0.78rem',
                          }}
                        >
                          — Missing test evidence —
                        </span>
                      )}
                    </td>

                    <td>
                      <span className={`badge badge-strength-${primaryStrength}`}>
                        {primaryStrength}
                      </span>
                    </td>

                    <td>
                      <span className={`badge badge-${status}`}>{status.replace(/_/g, ' ')}</span>
                    </td>
                  </tr>

                  {/* Expanded Detail Row */}
                  {isExpanded && (
                    <tr style={{ background: 'var(--bg-subtle)' }}>
                      <td colSpan={5} style={{ padding: '1.25rem 1.5rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          <div>
                            <div
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                color: 'var(--text-muted)',
                                marginBottom: '0.35rem',
                              }}
                            >
                              Requirement Description
                            </div>
                            <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                              {req.body}
                            </div>
                          </div>

                          <div>
                            <div
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                color: 'var(--text-muted)',
                                marginBottom: '0.35rem',
                              }}
                            >
                              Acceptance Criteria ({acceptanceCriteria.length})
                            </div>
                            <ul
                              style={{
                                margin: 0,
                                paddingLeft: '1.2rem',
                                fontSize: '0.8rem',
                                color: 'var(--text-primary)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.25rem',
                              }}
                            >
                              {acceptanceCriteria.map((ac) => (
                                <li key={ac.id}>
                                  <span
                                    className="mono"
                                    style={{ color: '#a5b4fc', marginRight: '0.4rem' }}
                                  >
                                    {ac.id}:
                                  </span>
                                  {ac.text}
                                </li>
                              ))}
                            </ul>
                          </div>

                          {tags.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                Tags:
                              </span>
                              {tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="badge badge-informational"
                                  style={{ fontSize: '0.65rem' }}
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
