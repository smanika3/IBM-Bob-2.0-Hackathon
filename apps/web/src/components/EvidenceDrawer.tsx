import React from 'react';
import type {
  Finding,
  ReviewDecision,
  DecisionPayload,
  ChangedArtifact,
  TestArtifact,
} from '../types.js';

interface EvidenceDrawerProps {
  finding: Finding | null;
  existingDecision?: ReviewDecision | undefined;
  changedArtifacts: ChangedArtifact[];
  testArtifacts: TestArtifact[];
  onClose: () => void;
  onRecordDecision: (findingId: string, payload: DecisionPayload) => Promise<void>;
}

export const EvidenceDrawer: React.FC<EvidenceDrawerProps> = ({
  finding,
  existingDecision,
  changedArtifacts,
  testArtifacts,
  onClose,
  onRecordDecision,
}) => {
  const [selectedDecision, setSelectedDecision] = React.useState<DecisionPayload['decision']>(
    existingDecision?.decision ?? 'accepted',
  );
  const [rationale, setRationale] = React.useState(existingDecision?.rationale ?? '');
  const [decidedBy, setDecidedBy] = React.useState(
    existingDecision?.decidedBy ?? 'reviewer@changeproof.local',
  );
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitSuccess, setSubmitSuccess] = React.useState(false);

  React.useEffect(() => {
    if (existingDecision) {
      setSelectedDecision(existingDecision.decision);
      setRationale(existingDecision.rationale ?? '');
      setDecidedBy(existingDecision.decidedBy ?? 'reviewer@changeproof.local');
    } else {
      setSelectedDecision('accepted');
      setRationale('');
      setDecidedBy('reviewer@changeproof.local');
    }
    setSubmitSuccess(false);
  }, [finding?.id]);

  if (!finding) return null;

  const linkedArtifacts = changedArtifacts.filter((a) => finding.changedArtifactIds.includes(a.id));
  const linkedTests = testArtifacts.filter((t) => finding.testArtifactIds.includes(t.id));

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const payload: DecisionPayload = {
        decision: selectedDecision,
      };
      const trimmedRationale = rationale.trim();
      if (trimmedRationale) payload.rationale = trimmedRationale;
      const trimmedDecidedBy = decidedBy.trim();
      if (trimmedDecidedBy) payload.decidedBy = trimmedDecidedBy;

      await onRecordDecision(finding.id, payload);
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to save decision. Check API status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="drawer-backdrop" onClick={onClose} id="evidence-drawer-backdrop">
      <div className="drawer" onClick={(e) => e.stopPropagation()} id="evidence-drawer">
        {/* Header */}
        <div className="drawer-header">
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.35rem',
              }}
            >
              <span className={`badge badge-${finding.severity}`}>{finding.severity}</span>
              <span className={`badge badge-${finding.status}`}>
                {finding.status.replace(/_/g, ' ')}
              </span>
              <span className="mono" style={{ fontSize: '0.75rem', color: '#a5b4fc' }}>
                {finding.ruleId}
              </span>
            </div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>{finding.title}</h2>
          </div>
          <button className="close-btn" onClick={onClose} id="btn-close-drawer">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="drawer-body">
          {/* Explanation */}
          <div className="drawer-section">
            <div className="drawer-section-title">Evidence & Risk Explanation</div>
            <div
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem',
                fontSize: '0.85rem',
                lineHeight: 1.5,
              }}
            >
              {finding.explanation}
            </div>
          </div>

          {/* Linked Requirements */}
          <div className="drawer-section">
            <div className="drawer-section-title">Linked Requirements</div>
            {finding.requirementIds.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {finding.requirementIds.map((reqId) => (
                  <span
                    key={reqId}
                    className="mono"
                    style={{ color: '#818cf8', fontWeight: 600, fontSize: '0.85rem' }}
                  >
                    {reqId}
                  </span>
                ))}
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                No explicit requirement linked to this change.
              </div>
            )}
          </div>

          {/* Changed Code Locations */}
          <div className="drawer-section">
            <div className="drawer-section-title">
              Changed Code Artifacts ({linkedArtifacts.length})
            </div>
            {linkedArtifacts.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {linkedArtifacts.map((art) => (
                  <div
                    key={art.id}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.75rem',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '0.35rem',
                      }}
                    >
                      <span className="file-link">{art.filePath}</span>
                      <span className="badge badge-informational" style={{ fontSize: '0.65rem' }}>
                        +{art.addedLines} / -{art.deletedLines} lines
                      </span>
                    </div>
                    {art.symbols.length > 0 && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Symbols changed:{' '}
                        <span className="mono" style={{ color: '#c7d2fe' }}>
                          {art.symbols.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                No direct file artifacts associated.
              </div>
            )}
          </div>

          {/* Test Evidence / Test Gap */}
          <div className="drawer-section">
            <div className="drawer-section-title">Test Coverage & Evidence</div>
            {linkedTests.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {linkedTests.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.75rem',
                    }}
                  >
                    <div className="file-link" style={{ marginBottom: '0.2rem' }}>
                      {t.filePath}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      Test: {t.testName}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  background: 'var(--status-missing-bg)',
                  border: '1px solid var(--status-missing-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.85rem',
                  color: '#fb7185',
                  fontSize: '0.825rem',
                }}
              >
                ⚠️ <strong>Missing Test Evidence:</strong> No automated test suite exercises the
                changed symbols or behavior for this finding.
              </div>
            )}
          </div>

          {/* Recommended Action */}
          <div className="drawer-section">
            <div className="drawer-section-title">Recommended Action</div>
            <div
              style={{
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid var(--border-accent)',
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem',
                fontSize: '0.85rem',
                color: '#c7d2fe',
                lineHeight: 1.45,
              }}
            >
              💡 {finding.recommendedAction}
            </div>
          </div>

          {/* Human Review Decision Form */}
          <div className="drawer-section">
            <div className="drawer-section-title">Human Review Decision</div>
            <div className="decision-box">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSubmit();
                }}
                id="form-record-decision"
              >
                <div
                  style={{
                    fontSize: '0.78rem',
                    color: 'var(--text-muted)',
                    marginBottom: '0.5rem',
                  }}
                >
                  Select outcome for this finding:
                </div>

                <div className="radio-group">
                  <label
                    className={`radio-label ${selectedDecision === 'accepted' ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="decision"
                      value="accepted"
                      checked={selectedDecision === 'accepted'}
                      onChange={() => setSelectedDecision('accepted')}
                      style={{ accentColor: '#6366f1' }}
                    />
                    Accept Change
                  </label>

                  <label
                    className={`radio-label ${selectedDecision === 'deferred' ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="decision"
                      value="deferred"
                      checked={selectedDecision === 'deferred'}
                      onChange={() => setSelectedDecision('deferred')}
                      style={{ accentColor: '#6366f1' }}
                    />
                    Defer Decision
                  </label>

                  <label
                    className={`radio-label ${selectedDecision === 'rejected' ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="decision"
                      value="rejected"
                      checked={selectedDecision === 'rejected'}
                      onChange={() => setSelectedDecision('rejected')}
                      style={{ accentColor: '#6366f1' }}
                    />
                    Reject Change
                  </label>
                </div>

                <div style={{ marginBottom: '0.75rem' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      marginBottom: '0.35rem',
                    }}
                  >
                    Reviewer Identity / Email:
                  </label>
                  <input
                    type="text"
                    id="input-decided-by"
                    className="search-input"
                    style={{ width: '100%' }}
                    value={decidedBy}
                    onChange={(e) => setDecidedBy(e.target.value)}
                    required
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      marginBottom: '0.35rem',
                    }}
                  >
                    Audit Rationale / Explanation:
                  </label>
                  <textarea
                    id="input-decision-rationale"
                    className="textarea"
                    placeholder="Document your verification rationale for compliance and audit trail..."
                    value={rationale}
                    onChange={(e) => setRationale(e.target.value)}
                    rows={3}
                  />
                </div>

                <div
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <button
                    type="submit"
                    id="btn-submit-decision"
                    className="btn btn-primary"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Recording...' : '💾 Save Review Decision'}
                  </button>

                  {submitSuccess && (
                    <span
                      style={{
                        color: 'var(--status-verified)',
                        fontSize: '0.8rem',
                        fontWeight: 500,
                      }}
                    >
                      ✓ Decision saved successfully!
                    </span>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
