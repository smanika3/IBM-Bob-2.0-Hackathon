import { z } from 'zod';

// ---------------------------------------------------------------------------
// Enumerations
// ---------------------------------------------------------------------------

export const SeveritySchema = z.enum(['critical', 'high', 'medium', 'low', 'informational']);
export type Severity = z.infer<typeof SeveritySchema>;

export const FindingStatusSchema = z.enum([
  'verified',
  'partial',
  'missing_evidence',
  'needs_human_review',
  'informational',
]);
export type FindingStatus = z.infer<typeof FindingStatusSchema>;

export const RuleIdSchema = z.enum([
  'REQ_WITHOUT_CODE',
  'CODE_WITHOUT_REQ',
  'REQ_WITHOUT_TEST',
  'PUBLIC_API_CHANGED',
  'CONFIG_OR_SCHEMA_CHANGED',
  'TEST_GAP_ON_CHANGED_SYMBOL',
  'DOC_STALE_OR_MISSING',
  'AMBIGUOUS_TRACEABILITY',
]);
export type RuleId = z.infer<typeof RuleIdSchema>;

export const MatchMethodSchema = z.enum([
  'explicit_req_id',
  'explicit_issue_ref',
  'direct_file_ref',
  'symbol_overlap',
  'test_name_match',
  'path_overlap',
  'keyword_overlap',
  'manual_confirmation',
]);
export type MatchMethod = z.infer<typeof MatchMethodSchema>;

export const MatchStrengthSchema = z.enum(['strong', 'moderate', 'weak', 'none']);
export type MatchStrength = z.infer<typeof MatchStrengthSchema>;

export const ReviewDecisionValueSchema = z.enum(['accepted', 'rejected', 'deferred']);
export type ReviewDecisionValue = z.infer<typeof ReviewDecisionValueSchema>;

export const ArtifactTypeSchema = z.enum([
  'requirement',
  'changed_artifact',
  'test_artifact',
  'evidence_link',
  'finding',
  'analysis_run',
  'documentation',
]);
export type ArtifactType = z.infer<typeof ArtifactTypeSchema>;

export const RunStatusSchema = z.enum(['pending', 'running', 'completed', 'failed']);
export type RunStatus = z.infer<typeof RunStatusSchema>;

// ---------------------------------------------------------------------------
// Source location
// ---------------------------------------------------------------------------

export const SourceLocationSchema = z.object({
  filePath: z.string(),
  startLine: z.number().int().nonnegative().optional(),
  endLine: z.number().int().nonnegative().optional(),
  symbolName: z.string().optional(),
});
export type SourceLocation = z.infer<typeof SourceLocationSchema>;

// ---------------------------------------------------------------------------
// Requirement
// ---------------------------------------------------------------------------

export const AcceptanceCriterionSchema = z.object({
  id: z.string(),
  requirementId: z.string(),
  text: z.string(),
  sourceLocation: SourceLocationSchema.optional(),
});
export type AcceptanceCriterion = z.infer<typeof AcceptanceCriterionSchema>;

export const RequirementSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  acceptanceCriteria: z.array(AcceptanceCriterionSchema),
  sourceLocation: SourceLocationSchema.optional(),
  tags: z.array(z.string()).default([]),
});
export type Requirement = z.infer<typeof RequirementSchema>;

// ---------------------------------------------------------------------------
// Changed artifact (from diff)
// ---------------------------------------------------------------------------

export const ChangedArtifactSchema = z.object({
  id: z.string(),
  filePath: z.string(),
  changeType: z.enum(['added', 'modified', 'deleted', 'renamed']),
  symbols: z.array(z.string()).default([]),
  addedLines: z.number().int().nonnegative().default(0),
  deletedLines: z.number().int().nonnegative().default(0),
  hunks: z
    .array(
      z.object({
        oldStart: z.number().int().nonnegative(),
        oldCount: z.number().int().nonnegative(),
        newStart: z.number().int().nonnegative(),
        newCount: z.number().int().nonnegative(),
        lines: z.array(z.string()),
      }),
    )
    .default([]),
  isPublicApi: z.boolean().default(false),
  isConfig: z.boolean().default(false),
  isSchema: z.boolean().default(false),
  isTest: z.boolean().default(false),
  isDocumentation: z.boolean().default(false),
});
export type ChangedArtifact = z.infer<typeof ChangedArtifactSchema>;

// ---------------------------------------------------------------------------
// Test artifact
// ---------------------------------------------------------------------------

export const TestArtifactSchema = z.object({
  id: z.string(),
  filePath: z.string(),
  testName: z.string(),
  referencedSymbols: z.array(z.string()).default([]),
  referencedRequirementIds: z.array(z.string()).default([]),
  sourceLocation: SourceLocationSchema.optional(),
});
export type TestArtifact = z.infer<typeof TestArtifactSchema>;

// ---------------------------------------------------------------------------
// Evidence link
// ---------------------------------------------------------------------------

export const EvidenceLinkSchema = z.object({
  id: z.string(),
  fromType: ArtifactTypeSchema,
  fromId: z.string(),
  toType: ArtifactTypeSchema,
  toId: z.string(),
  method: MatchMethodSchema,
  strength: MatchStrengthSchema,
  explanation: z.string(),
  sourceLocation: SourceLocationSchema.optional(),
});
export type EvidenceLink = z.infer<typeof EvidenceLinkSchema>;

// ---------------------------------------------------------------------------
// Finding
// ---------------------------------------------------------------------------

export const FindingSchema = z.object({
  id: z.string(),
  ruleId: RuleIdSchema,
  severity: SeveritySchema,
  status: FindingStatusSchema,
  title: z.string(),
  explanation: z.string(),
  requirementIds: z.array(z.string()).default([]),
  changedArtifactIds: z.array(z.string()).default([]),
  testArtifactIds: z.array(z.string()).default([]),
  evidenceLinkIds: z.array(z.string()).default([]),
  matchStrength: MatchStrengthSchema,
  recommendedAction: z.string(),
});
export type Finding = z.infer<typeof FindingSchema>;

// ---------------------------------------------------------------------------
// Review decision
// ---------------------------------------------------------------------------

export const ReviewDecisionSchema = z.object({
  id: z.string(),
  findingId: z.string(),
  runId: z.string(),
  decision: ReviewDecisionValueSchema,
  rationale: z.string().optional(),
  decidedBy: z.string().optional(),
  decidedAt: z.string().datetime(),
});
export type ReviewDecision = z.infer<typeof ReviewDecisionSchema>;

// ---------------------------------------------------------------------------
// Analysis run
// ---------------------------------------------------------------------------

export const AnalysisSummarySchema = z.object({
  totalRequirements: z.number().int().nonnegative(),
  totalChangedArtifacts: z.number().int().nonnegative(),
  totalTestArtifacts: z.number().int().nonnegative(),
  totalEvidenceLinks: z.number().int().nonnegative(),
  totalFindings: z.number().int().nonnegative(),
  findingsBySeverity: z.record(SeveritySchema, z.number().int().nonnegative()),
  findingsByStatus: z.record(FindingStatusSchema, z.number().int().nonnegative()),
  needsHumanReviewCount: z.number().int().nonnegative(),
});
export type AnalysisSummary = z.infer<typeof AnalysisSummarySchema>;

export const AnalysisRunSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: RunStatusSchema,
  contentFingerprint: z.string(),
  bundleId: z.string().optional(),
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  summary: AnalysisSummarySchema.optional(),
  errorMessage: z.string().optional(),
});
export type AnalysisRun = z.infer<typeof AnalysisRunSchema>;

// ---------------------------------------------------------------------------
// Full analysis result (in-memory, not persisted as a single blob)
// ---------------------------------------------------------------------------

export const AnalysisResultSchema = z.object({
  runMetadata: AnalysisRunSchema,
  requirements: z.array(RequirementSchema),
  changedArtifacts: z.array(ChangedArtifactSchema),
  testArtifacts: z.array(TestArtifactSchema),
  evidenceLinks: z.array(EvidenceLinkSchema),
  findings: z.array(FindingSchema),
  summary: AnalysisSummarySchema,
});
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
