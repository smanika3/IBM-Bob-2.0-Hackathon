import React from 'react';
import type { Finding, ReviewDecision } from '../types.js';

interface FindingsTabProps {
  findings: Finding[];
  decisions: ReviewDecision[];
  onSelectFinding: (finding: Finding) => void;
}

export const FindingsTab: React.FC<FindingsTabProps> = ({
  findings,
  decisions,
  onSelectFinding,
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [severityFilter, setSeverityFilter] = React.useState('all');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [ruleFilter, setRuleFilter] = React.useState('all');

  // Build decision lookup
  const decisionByFindingId = React.useMemo(() => {
    const map = new Map<string, ReviewDecision>();
    for (const d of decisions) {
      map.set(d.findingId, d);
    }
    return map;
  }, [decisions]);

  // Extract unique rule IDs
  const uniqueRules = React.useMemo(() => {
    return Array.from(new Set(findings.map((f) => f.ruleId))).sort();
  }, [findings]);

  // Filter findings
  const filtered = findings.filter((f) => {
    if (severityFilter !== 'all' && f.severity !== severityFilter) return false;
    if (statusFilter !== 'all' && f.status !== statusFilter) return false;
    if (ruleFilter !== 'all' && f.ruleId !== ruleFilter) return false;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchTitle = f.title.toLowerCase().includes(q);
      const matchExpl = f.explanation.toLowerCase().includes(q);
      const matchRule = f.ruleId.toLowerCase().includes(q);
      const matchReq = f.requirementIds.some((r) => r.toLowerCase().includes(q));
      if (!matchTitle && !matchExpl && !matchRule && !matchReq) return false;
    }

    return true;
  });

  const resetFilters = () => {
    setSearchTerm('');
    setSeverityFilter('all');
    setStatusFilter('all');
    setRuleFilter('all');
  };

  return (
    <div id="findings-tab-view">
      <div
        className="panel-header"
        style={{ marginBottom: '1rem', borderBottom: 'none', padding: 0 }}
      >
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600, margin: 0 }}>
            Deterministic Findings
          </h2>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
            Evidence gaps, public API changes, and undocumented behaviors detected by deterministic
            rules.
          </p>
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Showing {filtered.length} of {findings.length} findings
        </span>
      </div>

      {/* Filter Controls */}
      <div className="filter-bar" id="findings-filter-bar">
        <input
          id="search-findings"
          type="text"
          className="search-input"
          placeholder="Search by title, explanation, rule, or requirement..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <select
          id="filter-severity"
          className="filter-select"
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
          <option value="informational">Informational</option>
        </select>

        <select
          id="filter-status"
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="needs_human_review">Needs Human Review</option>
          <option value="missing_evidence">Missing Evidence</option>
          <option value="partial">Partial</option>
          <option value="verified">Verified</option>
        </select>

        <select
          id="filter-rule"
          className="filter-select"
          value={ruleFilter}
          onChange={(e) => setRuleFilter(e.target.value)}
        >
          <option value="all">All Rules</option>
          {uniqueRules.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        {(searchTerm ||
          severityFilter !== 'all' ||
          statusFilter !== 'all' ||
          ruleFilter !== 'all') && (
          <button className="btn btn-secondary btn-sm" onClick={resetFilters}>
            Reset Filters
          </button>
        )}
      </div>

      {/* Findings List */}
      {filtered.length === 0 ? (
        <div className="panel" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <p style={{ color: 'var(--text-secondary)', margin: '0 0 1rem' }}>
            No findings match the selected filters.
          </p>
          <button className="btn btn-secondary btn-sm" onClick={resetFilters}>
            Clear Filters
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {filtered.map((finding) => {
            const decision = decisionByFindingId.get(finding.id);

            return (
              <div
                key={finding.id}
                className="panel"
                style={{
                  marginBottom: 0,
                  transition: 'all var(--transition-fast)',
                  cursor: 'pointer',
                  borderLeft: `4px solid var(--sev-${finding.severity})`,
                }}
                onClick={() => onSelectFinding(finding)}
                id={`finding-card-${finding.id}`}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '1rem',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '0.4rem',
                      }}
                    >
                      <span className={`badge badge-${finding.severity}`}>{finding.severity}</span>
                      <span className={`badge badge-${finding.status}`}>
                        {finding.status.replace(/_/g, ' ')}
                      </span>
                      <span className="mono" style={{ fontSize: '0.72rem', color: '#a5b4fc' }}>
                        {finding.ruleId}
                      </span>
                      {decision && (
                        <span className={`badge badge-decision-${decision.decision}`}>
                          Decision: {decision.decision.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>

                    <h3 style={{ fontSize: '0.95rem', fontWeight: 600, margin: '0 0 0.35rem' }}>
                      {finding.title}
                    </h3>

                    <p
                      style={{
                        fontSize: '0.825rem',
                        color: 'var(--text-secondary)',
                        margin: '0 0 0.5rem',
                        lineHeight: 1.45,
                      }}
                    >
                      {finding.explanation}
                    </p>

                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: '1rem',
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {finding.requirementIds.length > 0 && (
                        <div>
                          <span>Requirements: </span>
                          <span className="mono" style={{ color: '#818cf8' }}>
                            {finding.requirementIds.join(', ')}
                          </span>
                        </div>
                      )}

                      <div>
                        <span>Match strength: </span>
                        <span
                          className={`badge badge-strength-${finding.matchStrength}`}
                          style={{ fontSize: '0.65rem' }}
                        >
                          {finding.matchStrength}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ alignSelf: 'center' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectFinding(finding);
                    }}
                    id={`btn-open-drawer-${finding.id}`}
                  >
                    View Evidence & Decide →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
