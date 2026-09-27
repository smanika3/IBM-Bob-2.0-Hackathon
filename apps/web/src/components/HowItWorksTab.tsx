import React from 'react';

export const HowItWorksTab: React.FC = () => {
  return (
    <div id="how-it-works-view" style={{ maxWidth: '960px', margin: '0 auto' }}>
      <div className="panel">
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
          How ChangeProof Works
        </h2>
        <p
          style={{
            color: 'var(--text-secondary)',
            fontSize: '0.875rem',
            lineHeight: 1.6,
            margin: '0 0 1.5rem',
          }}
        >
          ChangeProof is an evidence-first change-readiness workbench. It bridges the gap between
          requirements, pull request diffs, codebase ASTs, and automated tests to provide
          deterministic traceability for human reviewers.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          <div
            style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
            }}
          >
            <div
              style={{
                fontWeight: 600,
                color: '#818cf8',
                marginBottom: '0.35rem',
                fontSize: '0.9rem',
              }}
            >
              1. Deterministic Rule Engine
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              ChangeProof operates 100% locally with zero external LLM API calls. Every finding is
              computed using explainable AST, diff, and symbol extraction rules.
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
            }}
          >
            <div
              style={{
                fontWeight: 600,
                color: '#34d399',
                marginBottom: '0.35rem',
                fontSize: '0.9rem',
              }}
            >
              2. Strict Grounding in Evidence
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Every finding explicitly references changed files, symbol hunks, or test suites. If
              evidence is missing (e.g. untested bulk import), it is declared as a concrete risk.
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
            }}
          >
            <div
              style={{
                fontWeight: 600,
                color: '#fbbf24',
                marginBottom: '0.35rem',
                fontSize: '0.9rem',
              }}
            >
              3. Human Reviewer Primacy
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              ChangeProof does not autonomously block or merge pull requests. Human engineers record
              decisions (Accepted, Waived, Clarify, Rejected) with documented rationale.
            </div>
          </div>
        </div>

        <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '1.5rem 0 0.75rem' }}>
          The 8 Deterministic Core Rules
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div
            style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.2rem',
              }}
            >
              <span className="mono" style={{ color: '#a5b4fc', fontWeight: 600 }}>
                REQ_WITHOUT_CODE
              </span>
              <span className="badge badge-high">High</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              A documented requirement has no linked implementation code in the change bundle.
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.2rem',
              }}
            >
              <span className="mono" style={{ color: '#a5b4fc', fontWeight: 600 }}>
                CODE_WITHOUT_REQ
              </span>
              <span className="badge badge-medium">Medium</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Production code was modified without any traceable requirement or documented
              motivation.
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.2rem',
              }}
            >
              <span className="mono" style={{ color: '#a5b4fc', fontWeight: 600 }}>
                REQ_WITHOUT_TEST
              </span>
              <span className="badge badge-high">High</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              A requirement was implemented in code but has no corresponding test verifying its
              acceptance criteria.
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.2rem',
              }}
            >
              <span className="mono" style={{ color: '#a5b4fc', fontWeight: 600 }}>
                PUBLIC_API_CHANGED
              </span>
              <span className="badge badge-medium">Medium</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Exported symbols or public signatures were altered, potentially impacting downstream
              callers.
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.2rem',
              }}
            >
              <span className="mono" style={{ color: '#a5b4fc', fontWeight: 600 }}>
                CONFIG_OR_SCHEMA_CHANGED
              </span>
              <span className="badge badge-high">High</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Configuration files, database migrations, or schemas were modified and require
              validation.
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.2rem',
              }}
            >
              <span className="mono" style={{ color: '#a5b4fc', fontWeight: 600 }}>
                TEST_GAP_ON_CHANGED_SYMBOL
              </span>
              <span className="badge badge-high">High</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Changed symbols in modified or added files have zero test coverage across all test
              suites.
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.2rem',
              }}
            >
              <span className="mono" style={{ color: '#a5b4fc', fontWeight: 600 }}>
                DOC_STALE_OR_MISSING
              </span>
              <span className="badge badge-low">Low</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              New behavior or changed configuration exists without corresponding updates to
              documentation.
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.2rem',
              }}
            >
              <span className="mono" style={{ color: '#a5b4fc', fontWeight: 600 }}>
                AMBIGUOUS_TRACEABILITY
              </span>
              <span className="badge badge-medium">Medium</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Multiple conflicting code artifacts matched a single requirement without an explicit
              identifier.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
