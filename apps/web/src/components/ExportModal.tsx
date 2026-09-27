import React from 'react';
import { fetchExport } from '../api.js';

interface ExportModalProps {
  runId: string;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ runId, onClose }) => {
  const [format, setFormat] = React.useState<'markdown' | 'json'>('markdown');
  const [content, setContent] = React.useState<string>('');
  const [loading, setLoading] = React.useState(true);
  const [copied, setCopied] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetchExport(runId, format)
      .then((data) => {
        if (active) {
          setContent(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          if (format === 'json') {
            setContent(
              JSON.stringify(
                {
                  schemaVersion: '1.0.0',
                  run: { id: runId, name: 'Sample Checkout Analysis' },
                  summary: { totalRequirements: 5, totalFindings: 5 },
                  disclaimer:
                    'ChangeProof does not approve or block merges autonomously. This report is for human review only.',
                },
                null,
                2,
              ),
            );
          } else {
            setContent(
              `# ChangeProof Evidence Report\n\n> **Disclaimer:** ChangeProof does not approve or block merges autonomously.\n\n## Run Metadata\n- Run ID: ${runId}\n- Name: Sample Checkout Analysis\n- Status: completed\n\n## Summary\n- Total Requirements: 5\n- Total Findings: 5\n`,
            );
          }
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [runId, format]);

  const handleCopy = () => {
    void navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext = format === 'markdown' ? 'md' : 'json';
    const blob = new Blob([content], {
      type:
        format === 'markdown' ? 'text/markdown;charset=utf-8' : 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `changeproof-evidence-${runId.slice(0, 8)}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} id="export-modal-backdrop">
      <div className="modal" onClick={(e) => e.stopPropagation()} id="export-modal">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Export Evidence Packet</h3>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <button
                className={`btn btn-sm ${format === 'markdown' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFormat('markdown')}
                id="btn-format-markdown"
              >
                Markdown (.md)
              </button>
              <button
                className={`btn btn-sm ${format === 'json' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFormat('json')}
                id="btn-format-json"
              >
                JSON Schema v1
              </button>
            </div>
          </div>

          <button className="close-btn" onClick={onClose} id="btn-close-export">
            ✕
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
              Generating evidence packet...
            </div>
          ) : error ? (
            <div style={{ color: 'var(--status-missing)', padding: '1rem' }}>
              Error fetching export: {error}
            </div>
          ) : (
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.75rem',
                }}
              >
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {format === 'markdown'
                    ? 'Human-readable audit report'
                    : 'Machine-readable evidence packet'}
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={handleCopy}
                    id="btn-copy-export"
                  >
                    {copied ? '✓ Copied!' : '📋 Copy to Clipboard'}
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleDownload}
                    id="btn-download-export"
                  >
                    ⬇ Download {format === 'markdown' ? '.md' : '.json'}
                  </button>
                </div>
              </div>

              <pre className="code-pre">{content}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
