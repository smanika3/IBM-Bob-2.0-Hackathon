import React from 'react';
import type { AnalysisRun } from '../types.js';

interface HeaderProps {
  run: AnalysisRun | null;
  isApiOnline: boolean;
  isAnalyzing: boolean;
  selectedBundle: string;
  onSelectBundle: (bundleId: string) => void;
  onRunSample: (bundleId?: string) => void;
  onOpenExport: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  run,
  isApiOnline,
  isAnalyzing,
  selectedBundle,
  onSelectBundle,
  onRunSample,
  onOpenExport,
}) => {
  const [copied, setCopied] = React.useState(false);

  const copyFingerprint = () => {
    if (!run?.contentFingerprint) return;
    void navigator.clipboard.writeText(run.contentFingerprint);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="app-header" id="app-header">
      <div className="header-inner">
        <div className="brand-section">
          <div className="brand-logo">
            <div className="brand-icon">CP</div>
            <div>
              <h1 className="brand-title">ChangeProof</h1>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '2px' }}
              >
                <span className="brand-tag">Workbench</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>v0.1.0</span>
              </div>
            </div>
          </div>

          <div className="connection-pill" id="connection-status">
            <span className={`status-dot ${isApiOnline ? 'online' : 'offline'}`} />
            <span>{isApiOnline ? 'API Connected (Fastify)' : 'Demo Mode (Offline Fixture)'}</span>
          </div>
        </div>

        {run && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '0.35rem 0.75rem',
            }}
          >
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Active Run:</span>
            <span style={{ fontWeight: 600, fontSize: '0.8rem' }}>{run.name}</span>
            <span
              className="mono"
              style={{ fontSize: '0.72rem', cursor: 'pointer' }}
              title="Click to copy SHA-256 fingerprint"
              onClick={copyFingerprint}
            >
              {run.contentFingerprint.slice(0, 10)}...{copied ? ' (copied!)' : ''}
            </span>
          </div>
        )}

        <div
          className="header-actions"
          style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}
        >
          <select
            id="select-scenario"
            className="filter-select"
            value={selectedBundle}
            onChange={(e) => onSelectBundle(e.target.value)}
            disabled={isAnalyzing}
            style={{
              padding: '0.45rem 0.75rem',
              fontSize: '0.8rem',
              fontWeight: 500,
              background: 'var(--bg-subtle)',
              borderColor: 'var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
            }}
          >
            <option value="sample">Checkout & Orders</option>
            <option value="auth">Auth & Session Service</option>
            <option value="payments">Payment Gateway & Webhooks</option>
          </select>

          <button
            id="btn-run-sample"
            className="btn btn-primary"
            onClick={() => onRunSample(selectedBundle)}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <>
                <span
                  style={{
                    display: 'inline-block',
                    width: 12,
                    height: 12,
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }}
                />
                Analyzing...
              </>
            ) : (
              <>▶ Run Analysis</>
            )}
          </button>

          <button
            id="btn-export-menu"
            className="btn btn-secondary"
            onClick={onOpenExport}
            disabled={!run}
          >
            ⬇ Export Evidence
          </button>
        </div>
      </div>
    </header>
  );
};
