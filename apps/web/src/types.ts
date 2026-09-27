import type {
  AnalysisRun,
  Finding,
  ReviewDecision,
  EvidenceLink,
  ChangedArtifact,
  TestArtifact,
  Requirement,
  Severity,
  FindingStatus,
  RuleId,
} from '@changeproof/domain';

export type {
  AnalysisRun,
  Finding,
  ReviewDecision,
  EvidenceLink,
  ChangedArtifact,
  TestArtifact,
  Requirement,
  Severity,
  FindingStatus,
  RuleId,
};

export type ActiveTab = 'overview' | 'traceability' | 'findings' | 'evidence' | 'how-it-works';

export interface SampleBundleMeta {
  bundleId: string;
  name: string;
  description: string;
  fileCount: number;
  fingerprint: string;
}

export interface TraceabilityRequirement extends Requirement {
  linkedCodeArtifacts: Array<{
    id: string;
    filePath: string;
    symbols: string[];
    strength: string;
    method: string;
  }>;
  linkedTestArtifacts: Array<{
    id: string;
    filePath: string;
    testName: string;
    strength: string;
    method: string;
  }>;
  status: 'verified' | 'partial' | 'missing_evidence' | 'needs_human_review';
}

export interface TraceabilityResponse {
  runId: string;
  requirements: TraceabilityRequirement[];
  changedArtifacts: ChangedArtifact[];
  testArtifacts: TestArtifact[];
  evidenceLinks: EvidenceLink[];
}

export interface FindingsResponse {
  runId: string;
  findings: Finding[];
  decisions: ReviewDecision[];
}

export interface DecisionPayload {
  decision: 'accepted' | 'rejected' | 'deferred';
  rationale?: string | undefined;
  decidedBy?: string | undefined;
  runId?: string | undefined;
}
