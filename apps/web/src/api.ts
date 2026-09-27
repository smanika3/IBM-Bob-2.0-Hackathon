import type {
  AnalysisRun,
  SampleBundleMeta,
  FindingsResponse,
  TraceabilityResponse,
  DecisionPayload,
  ReviewDecision,
} from './types.js';

const API_BASE = ''; // Uses Vite proxy in dev, relative in production

export async function checkApiHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchSampleMeta(): Promise<SampleBundleMeta> {
  const res = await fetch(`${API_BASE}/api/sample`);
  if (!res.ok) throw new Error(`Failed to load sample metadata: ${res.statusText}`);
  return (await res.json()) as SampleBundleMeta;
}

export async function triggerAnalysis(bundleId = 'sample'): Promise<AnalysisRun> {
  const res = await fetch(`${API_BASE}/api/runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bundleId }),
  });
  if (!res.ok) {
    const errData = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
    throw new Error(errData.message ?? errData.error ?? `Analysis request failed: ${res.status}`);
  }
  return (await res.json()) as AnalysisRun;
}

export async function fetchRun(runId: string): Promise<AnalysisRun> {
  const res = await fetch(`${API_BASE}/api/runs/${runId}`);
  if (!res.ok) throw new Error(`Failed to fetch run ${runId}`);
  return (await res.json()) as AnalysisRun;
}

export async function fetchFindings(runId: string): Promise<FindingsResponse> {
  const res = await fetch(`${API_BASE}/api/runs/${runId}/findings`);
  if (!res.ok) throw new Error(`Failed to fetch findings for run ${runId}`);
  return (await res.json()) as FindingsResponse;
}

export async function fetchTraceability(runId: string): Promise<TraceabilityResponse> {
  const res = await fetch(`${API_BASE}/api/runs/${runId}/traceability`);
  if (!res.ok) throw new Error(`Failed to fetch traceability for run ${runId}`);
  return (await res.json()) as TraceabilityResponse;
}

export async function postReviewDecision(
  findingId: string,
  payload: DecisionPayload,
): Promise<ReviewDecision> {
  const res = await fetch(`${API_BASE}/api/findings/${findingId}/decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `Failed to save review decision: ${res.status}`);
  }
  return (await res.json()) as ReviewDecision;
}

export async function fetchExport(runId: string, format: 'markdown' | 'json'): Promise<string> {
  const res = await fetch(`${API_BASE}/api/runs/${runId}/export?format=${format}`);
  if (!res.ok) throw new Error(`Export failed: ${res.statusText}`);
  return await res.text();
}
