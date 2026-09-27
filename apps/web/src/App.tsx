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
import {
  SAMPLE_RUN,
  SAMPLE_FINDINGS,
  SAMPLE_TRACEABILITY,
  SAMPLE_EVIDENCE_LINKS,
  SAMPLE_CHANGED_ARTIFACTS,
  SAMPLE_TEST_ARTIFACTS,
  SAMPLE_DECISIONS,
} from './sample-data.js';
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

  // Active run state
  const [currentRun, setCurrentRun] = React.useState<AnalysisRun>(SAMPLE_RUN);
  const [findings, setFindings] = React.useState<Finding[]>(SAMPLE_FINDINGS);
  const [decisions, setDecisions] = React.useState<ReviewDecision[]>(SAMPLE_DECISIONS);
  const [requirements, setRequirements] =
    React.useState<TraceabilityRequirement[]>(SAMPLE_TRACEABILITY);
  const [evidenceLinks, setEvidenceLinks] = React.useState<EvidenceLink[]>(SAMPLE_EVIDENCE_LINKS);
  const [changedArtifacts, setChangedArtifacts] =
    React.useState<ChangedArtifact[]>(SAMPLE_CHANGED_ARTIFACTS);
  const [testArtifacts, setTestArtifacts] = React.useState<TestArtifact[]>(SAMPLE_TEST_ARTIFACTS);

  // UI state
  const [selectedFinding, setSelectedFinding] = React.useState<Finding | null>(null);
  const [showExportModal, setShowExportModal] = React.useState(false);
  const [bannerNotice, setBannerNotice] = React.useState<string | null>(null);

  // Check health and initialize
  React.useEffect(() => {
    let isMounted = true;
    checkApiHealth()
      .then(async (online) => {
        if (!isMounted) return;
        setIsApiOnline(online);
        if (online) {
          try {
            // Run or load initial sample through API
            const run = await triggerAnalysis('sample');
            if (!isMounted) return;
            setCurrentRun(run);
            const findingsRes = await fetchFindings(run.id);
            const traceRes = await fetchTraceability(run.id);
            if (!isMounted) return;
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
          } catch (e) {
            console.warn('API error initializing sample run, using preloaded fixture:', e);
          }
        } else {
          setBannerNotice(
            '⚡ Demo Mode: Fastify API offline — using preloaded synthetic checkout fixture. Start the API with "pnpm --filter @changeproof/api dev" for live SQLite persistence.',
          );
        }
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
      } else {
        // Reset to preloaded fixture
        await new Promise((r) => setTimeout(r, 600)); // slight artificial delay for feedback
        setCurrentRun(SAMPLE_RUN);
        setFindings(SAMPLE_FINDINGS);
        setDecisions(SAMPLE_DECISIONS);
        setRequirements(SAMPLE_TRACEABILITY);
        setEvidenceLinks(SAMPLE_EVIDENCE_LINKS);
        setChangedArtifacts(SAMPLE_CHANGED_ARTIFACTS);
        setTestArtifacts(SAMPLE_TEST_ARTIFACTS);
      }
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
          void handleRunSample(id);
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
          {activeTab === 'overview' && (
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
