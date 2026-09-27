import React from 'react';
import type { EvidenceLink } from '../types.js';

interface EvidenceTabProps {
  evidenceLinks: EvidenceLink[];
}

export const EvidenceTab: React.FC<EvidenceTabProps> = ({ evidenceLinks }) => {
  const [methodFilter, setMethodFilter] = React.useState('all');
  const [strengthFilter, setStrengthFilter] = React.useState('all');
  const [searchTerm, setSearchTerm] = React.useState('');

  const filtered = evidenceLinks.filter((link) => {
    if (methodFilter !== 'all' && link.method !== methodFilter) return false;
    if (strengthFilter !== 'all' && link.strength !== strengthFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchExpl = link.explanation.toLowerCase().includes(q);
      const matchFrom = link.fromId.toLowerCase().includes(q);
      const matchTo = link.toId.toLowerCase().includes(q);
      const matchLoc = link.sourceLocation?.filePath.toLowerCase().includes(q) ?? false;
      if (!matchExpl && !matchFrom && !matchTo && !matchLoc) return false;
    }
    return true;
  });

  return (
    <div id="evidence-tab-view">
      <div
        className="panel-header"
        style={{ marginBottom: '1rem', borderBottom: 'none', padding: 0 }}
      >
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600, margin: 0 }}>
            Deterministic Evidence Graph
          </h2>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
            Inspect every traceable relationship discovered between requirements, code hunks, and
            tests.
          </p>
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Showing {filtered.length} of {evidenceLinks.length} evidence links
        </span>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <input
          type="text"
          className="search-input"
          placeholder="Search evidence by entity, explanation, or path..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <select
          className="filter-select"
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
        >
          <option value="all">All Match Methods</option>
          <option value="explicit_req_id">Explicit REQ ID</option>
          <option value="symbol_overlap">Symbol Overlap</option>
          <option value="keyword_overlap">Keyword Overlap</option>
          <option value="path_convention">Path Convention</option>
        </select>

        <select
          className="filter-select"
          value={strengthFilter}
          onChange={(e) => setStrengthFilter(e.target.value)}
        >
          <option value="all">All Strengths</option>
          <option value="strong">Strong</option>
          <option value="moderate">Moderate</option>
          <option value="weak">Weak</option>
          <option value="none">None</option>
        </select>

        {(searchTerm || methodFilter !== 'all' || strengthFilter !== 'all') && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setSearchTerm('');
              setMethodFilter('all');
              setStrengthFilter('all');
            }}
          >
            Reset
          </button>
        )}
      </div>

      {/* Evidence Table */}
      <div className="table-wrapper">
        <table className="table" id="evidence-table">
          <thead>
            <tr>
              <th style={{ width: '18%' }}>From Entity</th>
              <th style={{ width: '18%' }}>To Entity</th>
              <th style={{ width: '14%' }}>Method</th>
              <th style={{ width: '10%' }}>Strength</th>
              <th style={{ width: '40%' }}>Explanation & Source</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((link) => (
              <tr key={link.id}>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span className="mono" style={{ color: '#818cf8', fontWeight: 600 }}>
                      {link.fromId}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {link.fromType}
                    </span>
                  </div>
                </td>

                <td>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span className="mono" style={{ color: '#a5b4fc', fontWeight: 600 }}>
                      {link.toId}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {link.toType}
                    </span>
                  </div>
                </td>

                <td>
                  <span className="badge badge-informational" style={{ fontSize: '0.68rem' }}>
                    {link.method}
                  </span>
                </td>

                <td>
                  <span
                    className={`badge badge-strength-${link.strength}`}
                    style={{ fontSize: '0.68rem' }}
                  >
                    {link.strength}
                  </span>
                </td>

                <td>
                  <div
                    style={{
                      fontSize: '0.8rem',
                      lineHeight: 1.4,
                      marginBottom: link.sourceLocation ? '0.25rem' : 0,
                    }}
                  >
                    {link.explanation}
                  </div>
                  {link.sourceLocation && (
                    <div style={{ fontSize: '0.75rem' }}>
                      <span className="file-link">{link.sourceLocation.filePath}</span>
                      {link.sourceLocation.startLine && (
                        <span style={{ color: 'var(--text-muted)', marginLeft: '0.4rem' }}>
                          L{link.sourceLocation.startLine}
                          {link.sourceLocation.endLine ? `-L${link.sourceLocation.endLine}` : ''}
                        </span>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
