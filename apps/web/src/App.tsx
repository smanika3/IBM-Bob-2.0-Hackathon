import React from 'react';
import './index.css';
import { Header } from './components/Header.js';
import { OverviewTab } from './components/OverviewTab.js';
import { TraceabilityTab } from './components/TraceabilityTab.js';
import { FindingsTab } from './components/FindingsTab.js';
import { EvidenceTab } from './components/EvidenceTab.js';
import { HowItWorksTab } from './components/HowItWorksTab.js';
import { EvidenceDrawer } from './components/EvidenceDrawer.js';
import { ExportModal } from './components/ExportModal.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';
import {
  checkApiHealth,
  triggerAnalysis,
  fetchFindings,
  fetchTraceability,
  postReviewDecision,
} from './api.js';
import { getScenarioDataset } from './sample-data.js';
import type {
  ActiveTab,
  AnalysisRun,
  Finding,
  ReviewDecision,
  TraceabilityRequirement,
  EvidenceLink,
  ChangedArtifact,
  TestArtifact,
  DecisionPayload,
} from './types.js';

function enrichTraceability(
  rawReqs: TraceabilityRequirement[],
  artifacts: ChangedArtifact[],
  tests: TestArtifact[],
  links: EvidenceLink[],
  findings: Finding[],
): TraceabilityRequirement[] {
  return (rawReqs ?? []).map((req) => {
    const existing = req as Partial<TraceabilityRequirement>;
    if (
      Array.isArray(existing.linkedCodeArtifacts) &&
      existing.linkedCodeArtifacts.length > 0 &&
      Array.isArray(existing.linkedTestArtifacts) &&
      existing.status
    ) {
      return {
        ...req,
        tags: req.tags ?? [],
        acceptanceCriteria: req.acceptanceCriteria ?? [],
        linkedCodeArtifacts: existing.linkedCodeArtifacts,
        linkedTestArtifacts: existing.linkedTestArtifacts ?? [],
        status: existing.status,
      };
    }

    const codeLinks = (links ?? []).filter(
      (l) => l.fromId === req.id && l.toType === 'changed_artifact',
    );
    const testLinks = (links ?? []).filter(
      (l) => l.fromId === req.id && l.toType === 'test_artifact',
    );

    const linkedCodeArtifacts = codeLinks
      .map((link) => {
        const art = (artifacts ?? []).find((a) => a.id === link.toId);
        if (!art) return null;
        return {
          id: art.id,
          filePath: art.filePath,
          symbols: art.symbols ?? [],
          strength: link.strength,
          method: link.method,
        };
      })
      .filter((a): a is NonNullable<typeof a> => a !== null);

    const linkedTestArtifacts = testLinks
      .map((link) => {
        const t = (tests ?? []).find((x) => x.id === link.toId);
        if (!t) return null;
        return {
          id: t.id,
          filePath: t.filePath,
          testName: t.testName,
          strength: link.strength,
          method: link.method,
        };
      })
      .filter((t): t is NonNullable<typeof t> => t !== null);

    const finding = (findings ?? []).find((f) => f.requirementIds.includes(req.id));
    const status: 'verified' | 'partial' | 'missing_evidence' | 'needs_human_review' =
      finding?.status === 'verified' ||
      finding?.status === 'partial' ||
      finding?.status === 'missing_evidence' ||
      finding?.status === 'needs_human_review'
        ? finding.status
        : linkedCodeArtifacts.length > 0 && linkedTestArtifacts.length > 0
          ? 'verified'
          : linkedCodeArtifacts.length === 0
            ? 'missing_evidence'
            : 'needs_human_review';

    return {
      ...req,
      tags: req.tags ?? [],
      acceptanceCriteria: req.acceptanceCriteria ?? [],
      linkedCodeArtifacts,
      linkedTestArtifacts,
      status,
    };
  });
}

export default function App(): React.ReactElement {
  const [activeTab, setActiveTab] = React.useState<ActiveTab>('overview');
  const [isApiOnline, setIsApiOnline] = React.useState(false);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [selectedBundle, setSelectedBundle] = React.useState('sample');

  // Active run state (starts blank until Run Analysis is clicked)
  const [currentRun, setCurrentRun] = React.useState<AnalysisRun | null>(null);
  const [findings, setFindings] = React.useState<Finding[]>([]);
  const [decisions, setDecisions] = React.useState<ReviewDecision[]>([]);
  const [requirements, setRequirements] = React.useState<TraceabilityRequirement[]>([]);
  const [evidenceLinks, setEvidenceLinks] = React.useState<EvidenceLink[]>([]);
  const [changedArtifacts, setChangedArtifacts] = React.useState<ChangedArtifact[]>([]);
  const [testArtifacts, setTestArtifacts] = React.useState<TestArtifact[]>([]);

  // UI state
  const [selectedFinding, setSelectedFinding] = React.useState<Finding | null>(null);
  const [showExportModal, setShowExportModal] = React.useState(false);
  const [bannerNotice, setBannerNotice] = React.useState<string | null>(null);

  // Check API health on mount
  React.useEffect(() => {
    let isMounted = true;
    checkApiHealth()
      .then((online) => {
        if (!isMounted) return;
        setIsApiOnline(online);
      })
      .catch((e) => console.error(e));

    return () => {
      isMounted = false;
    };
  }, []);

  const handleRunSample = async (bundleId = selectedBundle) => {
    setIsAnalyzing(true);
    try {
      if (isApiOnline) {
        try {
          const run = await triggerAnalysis(bundleId);
          setCurrentRun(run);
          const findingsRes = await fetchFindings(run.id);
          const traceRes = await fetchTraceability(run.id);
          setFindings(findingsRes.findings);
          setDecisions(findingsRes.decisions);
          setEvidenceLinks(traceRes.evidenceLinks);
          setChangedArtifacts(traceRes.changedArtifacts);
          setTestArtifacts(traceRes.testArtifacts);

          const enriched = enrichTraceability(
            traceRes.requirements,
            traceRes.changedArtifacts,
            traceRes.testArtifacts,
            traceRes.evidenceLinks,
            findingsRes.findings,
          );
          setRequirements(enriched);
          return;
        } catch (apiErr) {
          console.warn('API error, falling back to standalone dataset:', apiErr);
        }
      }

      // Standalone Cloud Demo mode: load bundled dataset for the selected scenario
      await new Promise((r) => setTimeout(r, 400));
      const dataset = getScenarioDataset(bundleId);
      setCurrentRun(dataset.run);
      setFindings(dataset.findings);
      setDecisions(dataset.decisions);
      setRequirements(dataset.requirements);
      setEvidenceLinks(dataset.evidenceLinks);
      setChangedArtifacts(dataset.changedArtifacts);
      setTestArtifacts(dataset.testArtifacts);
    } catch (err) {
      console.error(err);
      alert(`Analysis execution failed for ${bundleId}.`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRecordDecision = async (findingId: string, payload: DecisionPayload) => {
    const runId = currentRun?.id ?? 'sample-run-fixture';
    if (isApiOnline) {
      const record = await postReviewDecision(findingId, { ...payload, runId });
      setDecisions((prev) => {
        const filtered = prev.filter((d) => d.findingId !== findingId);
        return [...filtered, record];
      });
    } else {
      // Local demo mode state update
      const localRecord: ReviewDecision = {
        id: `local-dec-${Date.now()}`,
        findingId,
        runId,
        decision: payload.decision,
        decidedAt: new Date().toISOString(),
      };
      if (payload.rationale) localRecord.rationale = payload.rationale;
      if (payload.decidedBy) localRecord.decidedBy = payload.decidedBy;
      setDecisions((prev) => {
        const filtered = prev.filter((d) => d.findingId !== findingId);
        return [...filtered, localRecord];
      });
    }
  };

  const activeDecision = selectedFinding
    ? decisions.find((d) => d.findingId === selectedFinding.id)
    : undefined;

  return (
    <div className="app-container" id="app-root">
      {/* Header */}
      <Header
        run={currentRun}
        isApiOnline={isApiOnline}
        isAnalyzing={isAnalyzing}
        selectedBundle={selectedBundle}
        onSelectBundle={(id) => {
          setSelectedBundle(id);
          // Keep page blank on switch until Run Analysis is clicked
          setCurrentRun(null);
          setFindings([]);
          setDecisions([]);
          setRequirements([]);
          setEvidenceLinks([]);
          setChangedArtifacts([]);
          setTestArtifacts([]);
          setSelectedFinding(null);
        }}
        onRunSample={(id) => {
          void handleRunSample(id ?? selectedBundle);
        }}
        onOpenExport={() => setShowExportModal(true)}
      />

      {/* Navigation Tabs */}
      <nav className="tabs-nav" id="main-tabs-nav">
        <div className="tabs-inner">
          <button
            id="tab-btn-overview"
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>

          <button
            id="tab-btn-traceability"
            className={`tab-btn ${activeTab === 'traceability' ? 'active' : ''}`}
            onClick={() => setActiveTab('traceability')}
          >
            Traceability Matrix
            <span className="tab-badge">{requirements.length}</span>
          </button>

          <button
            id="tab-btn-findings"
            className={`tab-btn ${activeTab === 'findings' ? 'active' : ''}`}
            onClick={() => setActiveTab('findings')}
          >
            Findings
            <span className="tab-badge">{findings.length}</span>
          </button>

          <button
            id="tab-btn-evidence"
            className={`tab-btn ${activeTab === 'evidence' ? 'active' : ''}`}
            onClick={() => setActiveTab('evidence')}
          >
            Evidence Graph
            <span className="tab-badge">{evidenceLinks.length}</span>
          </button>

          <button
            id="tab-btn-how-it-works"
            className={`tab-btn ${activeTab === 'how-it-works' ? 'active' : ''}`}
            onClick={() => setActiveTab('how-it-works')}
          >
            How This Works
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="main-content">
        {bannerNotice && (
          <div className="notification-banner" id="banner-notification">
            <span>{bannerNotice}</span>
            <button
              className="close-btn"
              onClick={() => setBannerNotice(null)}
              style={{ fontSize: '0.9rem', color: 'inherit' }}
            >
              ✕
            </button>
          </div>
        )}

        <ErrorBoundary fallbackTitle="View Error">
          {!currentRun && activeTab !== 'how-it-works' ? (
            <div
              className="panel"
              id="empty-scenario-state"
              style={{
                textAlign: 'center',
                padding: '4.5rem 2rem',
                margin: '1.5rem 0',
                background: 'var(--bg-subtle)',
                border: '1px dashed var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚡</div>
              <h2
                style={{
                  fontSize: '1.35rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: '0.6rem',
                }}
              >
                Ready to Analyze: {getScenarioDataset(selectedBundle).name}
              </h2>
              <p
                style={{
                  color: 'var(--text-secondary)',
                  maxWidth: '520px',
                  margin: '0 auto 1.5rem',
                  lineHeight: 1.6,
                  fontSize: '0.9rem',
                }}
              >
                {getScenarioDataset(selectedBundle).description}
              </p>
              <p
                style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}
              >
                Click <strong>▶ Run Analysis</strong> in the header to parse requirements, inspect
                AST changes, and verify test evidence.
              </p>
              <button
                className="btn btn-primary"
                id="btn-run-from-empty"
                onClick={() => void handleRunSample(selectedBundle)}
                disabled={isAnalyzing}
                style={{ padding: '0.65rem 1.6rem', fontSize: '0.9rem' }}
              >
                {isAnalyzing ? 'Analyzing Scenario...' : '▶ Run Analysis'}
              </button>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && currentRun && (
                <OverviewTab
                  run={currentRun}
                  findings={findings}
                  decisions={decisions}
                  onGoToFindings={() => setActiveTab('findings')}
                  onGoToTraceability={() => setActiveTab('traceability')}
                  onOpenFindingDrawer={(f) => setSelectedFinding(f)}
                />
              )}

              {activeTab === 'traceability' && <TraceabilityTab requirements={requirements} />}

              {activeTab === 'findings' && (
                <FindingsTab
                  findings={findings}
                  decisions={decisions}
                  onSelectFinding={(f) => setSelectedFinding(f)}
                />
              )}

              {activeTab === 'evidence' && <EvidenceTab evidenceLinks={evidenceLinks} />}

              {activeTab === 'how-it-works' && <HowItWorksTab />}
            </>
          )}
        </ErrorBoundary>
      </main>

      {/* Evidence Detail Drawer */}
      {selectedFinding && (
        <EvidenceDrawer
          finding={selectedFinding}
          existingDecision={activeDecision}
          changedArtifacts={changedArtifacts}
          testArtifacts={testArtifacts}
          onClose={() => setSelectedFinding(null)}
          onRecordDecision={handleRecordDecision}
        />
      )}

      {/* Export Modal */}
      {showExportModal && currentRun && (
        <ExportModal runId={currentRun.id} onClose={() => setShowExportModal(false)} />
      )}
    </div>
  );
}
