import Fastify, { type FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createStore, type ChangeProofStore } from '@changeproof/storage';
import { createAnalysisService, registerApiRoutes } from './routes/api.js';
import * as path from 'node:path';
import * as os from 'node:os';

const HealthResponseSchema = z.object({
  status: z.literal('ok'),
  version: z.string(),
  timestamp: z.string().datetime(),
});

type HealthResponse = z.infer<typeof HealthResponseSchema>;

export interface AppOptions {
  /** Path to SQLite database file. Defaults to :memory: in test mode */
  dbPath?: string;
  logLevel?: string;
}

export function buildApp(options: AppOptions = {}): {
  app: FastifyInstance;
  store: ChangeProofStore;
} {
  const dbPath =
    options.dbPath ??
    process.env['DATABASE_PATH'] ??
    path.join(os.tmpdir(), `changeproof-${process.pid}.db`);

  const store = createStore(dbPath);
  const service = createAnalysisService();

  const app = Fastify({
    logger: {
      level: options.logLevel ?? process.env['LOG_LEVEL'] ?? 'info',
    },
  });

  // CORS for local dev
  app.addHook('onSend', async (_request, reply) => {
    void reply.header('Access-Control-Allow-Origin', '*');
  });

  app.get<{ Reply: HealthResponse }>('/health', async (_request, _reply) => {
    const response: HealthResponse = {
      status: 'ok',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
    };
    HealthResponseSchema.parse(response);
    return response;
  });

  // Register API routes
  void app.register((instance, _opts, done) => {
    registerApiRoutes(instance, store, service);
    done();
  });

  return { app, store };
}
