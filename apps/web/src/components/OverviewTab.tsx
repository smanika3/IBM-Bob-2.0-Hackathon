import React from 'react';
import type { AnalysisRun, Finding, ReviewDecision } from '../types.js';

interface OverviewTabProps {
  run: AnalysisRun;
  findings: Finding[];
  decisions: ReviewDecision[];
  onGoToFindings: () => void;
  onGoToTraceability: () => void;
  onOpenFindingDrawer: (finding: Finding) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  run,
  findings,
  decisions,
  onGoToFindings,
  onGoToTraceability,
  onOpenFindingDrawer,
}) => {
  const summary = run.summary ?? {
    totalRequirements: 0,
    totalChangedArtifacts: 0,
    totalTestArtifacts: 0,
    totalEvidenceLinks: 0,
    totalFindings: findings.length,
    findingsBySeverity: { critical: 0, high: 0, medium: 0, low: 0, informational: 0 },
    findingsByStatus: {
      verified: 0,
      partial: 0,
      missing_evidence: 0,
      needs_human_review: 0,
      informational: 0,
    },
    needsHumanReviewCount: 0,
  };

  const highAndCritFindings = findings.filter(
    (f) => f.severity === 'critical' || f.severity === 'high',
  );

  return (
    <div id="overview-tab-view">
      {/* High-level Metric Stat Grid */}
      <div className="stat-grid">
        <div className="stat-card" id="stat-card-requirements">
          <div className="stat-label">Requirements Analyzed</div>
          <div className="stat-value">{summary.totalRequirements}</div>
          <div className="stat-sub">Parsed acceptance criteria & tags</div>
        </div>

        <div className="stat-card" id="stat-card-artifacts">
          <div className="stat-label">Indexed Code Artifacts</div>
          <div className="stat-value">{summary.totalChangedArtifacts}</div>
          <div className="stat-sub">Changed files & symbol hunks</div>
        </div>

        <div className="stat-card" id="stat-card-tests">
          <div className="stat-label">Test Artifacts</div>
          <div className="stat-value">{summary.totalTestArtifacts}</div>
          <div className="stat-sub">Extracted test cases & suites</div>
        </div>

        <div className="stat-card" id="stat-card-links">
          <div className="stat-label">Evidence Links</div>
          <div className="stat-value">{summary.totalEvidenceLinks}</div>
          <div className="stat-sub">Deterministic traceable edges</div>
        </div>

        <div
          className={`stat-card ${summary.needsHumanReviewCount > 0 ? 'alert' : ''}`}
          id="stat-card-review"
        >
          <div className="stat-label">Needs Human Review</div>
          <div className="stat-value" style={{ color: '#fbbf24' }}>
            {summary.needsHumanReviewCount}
          </div>
          <div className="stat-sub">{decisions.length} decisions recorded</div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '1.5rem',
          marginBottom: '1.5rem',
        }}
      >
        {/* Run Metadata Card */}
        <div className="panel" id="panel-run-metadata">
          <div className="panel-header">
            <h3 className="panel-title">Analysis Run Details</h3>
            <span className="badge badge-verified">Status: {run.status}</span>
          </div>

          <table style={{ width: '100%', fontSize: '0.825rem', borderSpacing: '0 0.5rem' }}>
            <tbody>
              <tr>
                <td style={{ color: 'var(--text-muted)', width: '130px' }}>Run Name:</td>
                <td style={{ fontWeight: 600 }}>{run.name}</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--text-muted)' }}>Run ID:</td>
                <td>
                  <code className="mono">{run.id}</code>
                </td>
              </tr>
              <tr>
                <td style={{ color: 'var(--text-muted)' }}>Fingerprint:</td>
                <td>
                  <code className="mono" style={{ fontSize: '0.72rem', wordBreak: 'break-all' }}>
                    {run.contentFingerprint}
                  </code>
                </td>
              </tr>
              <tr>
                <td style={{ color: 'var(--text-muted)' }}>Created At:</td>
                <td style={{ color: 'var(--text-secondary)' }}>
                  {new Date(run.createdAt).toLocaleString()}
                </td>
              </tr>
              {run.completedAt && (
                <tr>
                  <td style={{ color: 'var(--text-muted)' }}>Completed At:</td>
                  <td style={{ color: 'var(--text-secondary)' }}>
                    {new Date(run.completedAt).toLocaleString()}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Severity & Status Breakdown */}
        <div className="panel" id="panel-breakdown">
          <div className="panel-header">
            <h3 className="panel-title">Findings Distribution</h3>
            <button className="btn btn-secondary btn-sm" onClick={onGoToFindings}>
              View All Findings →
            </button>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                marginBottom: '0.5rem',
              }}
            >
              By Severity
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span className="badge badge-critical">
                Critical: {summary.findingsBySeverity['critical'] ?? 0}
              </span>
              <span className="badge badge-high">
                High: {summary.findingsBySeverity['high'] ?? 0}
              </span>
              <span className="badge badge-medium">
                Medium: {summary.findingsBySeverity['medium'] ?? 0}
              </span>
              <span className="badge badge-low">Low: {summary.findingsBySeverity['low'] ?? 0}</span>
              <span className="badge badge-informational">
                Info: {summary.findingsBySeverity['informational'] ?? 0}
              </span>
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                marginBottom: '0.5rem',
              }}
            >
              By Status
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span className="badge badge-verified">
                Verified: {summary.findingsByStatus['verified'] ?? 0}
              </span>
              <span className="badge badge-partial">
                Partial: {summary.findingsByStatus['partial'] ?? 0}
              </span>
              <span className="badge badge-missing_evidence">
                Missing Evidence: {summary.findingsByStatus['missing_evidence'] ?? 0}
              </span>
              <span className="badge badge-needs_human_review">
                Needs Human Review: {summary.findingsByStatus['needs_human_review'] ?? 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Key Findings Requiring Immediate Attention */}
      <div className="panel" id="panel-priority-findings">
        <div className="panel-header">
          <h3 className="panel-title">
            <span>Critical & High Findings ({highAndCritFindings.length})</span>
          </h3>
          <button className="btn btn-secondary btn-sm" onClick={onGoToTraceability}>
            Open Traceability Matrix →
          </button>
        </div>

        {highAndCritFindings.length === 0 ? (
          <div style={{ padding: '1rem', color: 'var(--status-verified)', fontSize: '0.85rem' }}>
            ✓ No critical or high severity risks identified in this change bundle.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {highAndCritFindings.map((finding) => (
              <div
                key={finding.id}
                style={{
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '0.25rem',
                    }}
                  >
                    <span className={`badge badge-${finding.severity}`}>{finding.severity}</span>
                    <span className="mono" style={{ fontSize: '0.75rem', color: '#a5b4fc' }}>
                      {finding.ruleId}
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                    {finding.title}
                  </div>
                  <div
                    style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.4 }}
                  >
                    {finding.explanation}
                  </div>
                </div>

                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => onOpenFindingDrawer(finding)}
                  id={`btn-review-${finding.id}`}
                >
                  Review Finding →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
