import type { AnalysisResult } from '@changeproof/domain';
import { analyzeBundle } from '@changeproof/analysis';
import { loadBundleFromDirectory } from '@changeproof/ingestion';
import type { ChangeProofStore } from '@changeproof/storage';
import { generateMarkdownReport, generateJsonReport } from '@changeproof/reporting';
import { z } from 'zod';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_ROOT = path.resolve(__dirname, '../../../../fixtures');

export interface BundleInfo {
  bundleId: string;
  name: string;
  description: string;
}

const AVAILABLE_BUNDLES: Record<string, { dir: string; name: string; description: string }> = {
  sample: {
    dir: path.join(FIXTURES_ROOT, 'sample-checkout'),
    name: 'Sample Checkout Analysis',
    description:
      'Synthetic TypeScript order-management project for ChangeProof demo. No real data.',
  },
  auth: {
    dir: path.join(FIXTURES_ROOT, 'sample-auth'),
    name: 'Auth & Session Service Analysis',
    description: 'JWT token rotation, password complexity, and MFA challenge verification.',
  },
  payments: {
    dir: path.join(FIXTURES_ROOT, 'sample-payments'),
    name: 'Payment Gateway & Webhook Analysis',
    description: 'Idempotent charge execution, webhook HMAC verification, and refund workflows.',
  },
};

// ---------------------------------------------------------------------------
// Service layer
// ---------------------------------------------------------------------------

export interface AnalysisService {
  getSampleMetadata(): {
    bundleId: string;
    name: string;
    description: string;
    availableBundles: BundleInfo[];
  };
  runAnalysis(bundleId: string): AnalysisResult;
  persistResult(result: AnalysisResult, store: ChangeProofStore): void;
}

export function createAnalysisService(): AnalysisService {
  return {
    getSampleMetadata() {
      const availableBundles: BundleInfo[] = Object.entries(AVAILABLE_BUNDLES).map(
        ([id, info]) => ({
          bundleId: id,
          name: info.name,
          description: info.description,
        }),
      );
      return {
        bundleId: 'sample',
        name: 'Sample Checkout',
        description:
          'Synthetic TypeScript order-management project for ChangeProof demo. No real data.',
        availableBundles,
      };
    },

    runAnalysis(bundleId: string): AnalysisResult {
      const config = AVAILABLE_BUNDLES[bundleId];
      if (!config) {
        throw new Error(
          `Unknown bundleId: ${bundleId}. Supported: ${Object.keys(AVAILABLE_BUNDLES).join(', ')}`,
        );
      }
      const bundle = loadBundleFromDirectory(config.dir, bundleId, config.name);
      const runId = crypto.randomUUID();
      return analyzeBundle(bundle, runId, config.name);
    },

    persistResult(result: AnalysisResult, store: ChangeProofStore): void {
      store.runs.save(result.runMetadata);
      store.requirements.saveAll(result.requirements, result.runMetadata.id);
      store.changedArtifacts.saveAll(result.changedArtifacts, result.runMetadata.id);
      store.testArtifacts.saveAll(result.testArtifacts, result.runMetadata.id);
      store.evidenceLinks.saveAll(result.evidenceLinks, result.runMetadata.id);
      store.findings.saveAll(result.findings, result.runMetadata.id);
    },
  };
}

// ---------------------------------------------------------------------------
// Request/response schemas
// ---------------------------------------------------------------------------

export const CreateRunRequestSchema = z.object({
  bundleId: z.string().min(1),
});

export const RecordDecisionRequestSchema = z.object({
  decision: z.enum(['accepted', 'rejected', 'deferred']),
  rationale: z.string().optional(),
  decidedBy: z.string().optional(),
  runId: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Route registration
// ---------------------------------------------------------------------------

import type { FastifyInstance } from 'fastify';

export function registerApiRoutes(
  app: FastifyInstance,
  store: ChangeProofStore,
  service: AnalysisService,
): void {
  // GET /api/sample
  app.get('/api/sample', async (_req, _reply) => {
    return service.getSampleMetadata();
  });

  // POST /api/runs
  app.post('/api/runs', async (request, reply) => {
    const parseResult = CreateRunRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Invalid request',
        details: parseResult.error.flatten(),
      });
    }

    const { bundleId } = parseResult.data;
    let result: AnalysisResult;
    try {
      result = service.runAnalysis(bundleId);
    } catch (err) {
      return reply.status(400).send({
        error: 'Analysis failed',
        message: err instanceof Error ? err.message : String(err),
      });
    }

    service.persistResult(result, store);
    return reply.status(201).send(result.runMetadata);
  });

  // GET /api/runs/:runId
  app.get<{ Params: { runId: string } }>('/api/runs/:runId', async (request, reply) => {
    const run = store.runs.findById(request.params.runId);
    if (!run) return reply.status(404).send({ error: 'Run not found' });
    return run;
  });

  // GET /api/runs/:runId/findings
  app.get<{ Params: { runId: string } }>('/api/runs/:runId/findings', async (request, reply) => {
    const run = store.runs.findById(request.params.runId);
    if (!run) return reply.status(404).send({ error: 'Run not found' });
    const findings = store.findings.findByRunId(request.params.runId);
    const decisions = store.decisions.findByRunId(request.params.runId);
    return {
      runId: request.params.runId,
      findings,
      decisions,
    };
  });

  // GET /api/runs/:runId/traceability
  app.get<{ Params: { runId: string } }>(
    '/api/runs/:runId/traceability',
    async (request, reply) => {
      const run = store.runs.findById(request.params.runId);
      if (!run) return reply.status(404).send({ error: 'Run not found' });
      const rawRequirements = store.requirements.findByRunId(request.params.runId);
      const artifacts = store.changedArtifacts.findByRunId(request.params.runId);
      const tests = store.testArtifacts.findByRunId(request.params.runId);
      const links = store.evidenceLinks.findByRunId(request.params.runId);
      const findings = store.findings.findByRunId(request.params.runId);

      const requirements = rawRequirements.map((req) => {
        const codeLinks = links.filter(
          (l) => l.fromId === req.id && l.toType === 'changed_artifact',
        );
        const testLinks = links.filter((l) => l.fromId === req.id && l.toType === 'test_artifact');

        const linkedCodeArtifacts = codeLinks
          .map((link) => {
            const artifact = artifacts.find((a) => a.id === link.toId);
            if (!artifact) return null;
            return {
              id: artifact.id,
              filePath: artifact.filePath,
              symbols: artifact.symbols ?? [],
              strength: link.strength,
              method: link.method,
            };
          })
          .filter((a): a is NonNullable<typeof a> => a !== null);

        const linkedTestArtifacts = testLinks
          .map((link) => {
            const test = tests.find((t) => t.id === link.toId);
            if (!test) return null;
            return {
              id: test.id,
              filePath: test.filePath,
              testName: test.testName,
              strength: link.strength,
              method: link.method,
            };
          })
          .filter((t): t is NonNullable<typeof t> => t !== null);

        const finding = findings.find((f) => f.requirementIds.includes(req.id));
        let status: 'verified' | 'partial' | 'missing_evidence' | 'needs_human_review';
        if (finding) {
          status =
            finding.status === 'verified' ||
            finding.status === 'partial' ||
            finding.status === 'missing_evidence' ||
            finding.status === 'needs_human_review'
              ? finding.status
              : 'needs_human_review';
        } else if (linkedCodeArtifacts.length > 0 && linkedTestArtifacts.length > 0) {
          status = 'verified';
        } else if (linkedCodeArtifacts.length === 0) {
          status = 'missing_evidence';
        } else {
          status = 'needs_human_review';
        }

        return {
          ...req,
          tags: req.tags ?? [],
          acceptanceCriteria: req.acceptanceCriteria ?? [],
          linkedCodeArtifacts,
          linkedTestArtifacts,
          status,
        };
      });

      return {
        runId: request.params.runId,
        requirements,
        changedArtifacts: artifacts,
        testArtifacts: tests,
        evidenceLinks: links,
      };
    },
  );

  // POST /api/findings/:findingId/decision
  app.post<{ Params: { findingId: string } }>(
    '/api/findings/:findingId/decision',
    async (request, reply) => {
      const parseResult = RecordDecisionRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Invalid request',
          details: parseResult.error.flatten(),
        });
      }
      const { decision, rationale, decidedBy, runId } = parseResult.data;
      // runId is required — look it up from stored findings if not provided
      const resolvedRunId = runId ?? 'unresolved';
      const decisionRecord = {
        id: crypto.randomUUID(),
        findingId: request.params.findingId,
        runId: resolvedRunId,
        decision,
        rationale,
        decidedBy,
        decidedAt: new Date().toISOString(),
      };
      store.decisions.save(decisionRecord);
      return reply.status(201).send(decisionRecord);
    },
  );

  // GET /api/runs/:runId/export?format=markdown|json
  app.get<{ Params: { runId: string }; Querystring: { format?: string } }>(
    '/api/runs/:runId/export',
    async (request, reply) => {
      const run = store.runs.findById(request.params.runId);
      if (!run) return reply.status(404).send({ error: 'Run not found' });

      // Reconstruct AnalysisResult from storage
      const result: AnalysisResult = {
        runMetadata: run,
        requirements: store.requirements.findByRunId(request.params.runId),
        changedArtifacts: store.changedArtifacts.findByRunId(request.params.runId),
        testArtifacts: store.testArtifacts.findByRunId(request.params.runId),
        evidenceLinks: store.evidenceLinks.findByRunId(request.params.runId),
        findings: store.findings.findByRunId(request.params.runId),
        summary: run.summary ?? {
          totalRequirements: 0,
          totalChangedArtifacts: 0,
          totalTestArtifacts: 0,
          totalEvidenceLinks: 0,
          totalFindings: 0,
          findingsBySeverity: { critical: 0, high: 0, medium: 0, low: 0, informational: 0 },
          findingsByStatus: {
            verified: 0,
            partial: 0,
            missing_evidence: 0,
            needs_human_review: 0,
            informational: 0,
          },
          needsHumanReviewCount: 0,
        },
      };

      const decisions = store.decisions.findByRunId(request.params.runId);
      const format = request.query.format ?? 'markdown';

      if (format === 'json') {
        const report = generateJsonReport(result, decisions);
        return reply
          .header('Content-Type', 'application/json')
          .header('Content-Disposition', `attachment; filename="changeproof-${run.id}.json"`)
          .send(report);
      }

      const markdown = generateMarkdownReport(result, decisions);
      return reply
        .header('Content-Type', 'text/markdown; charset=utf-8')
        .header('Content-Disposition', `attachment; filename="changeproof-${run.id}.md"`)
        .send(markdown);
    },
  );
}
