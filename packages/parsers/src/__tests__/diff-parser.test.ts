import { describe, it, expect } from 'vitest';
import { parseDiff } from '../diff-parser.js';

const SAMPLE_DIFF = `diff --git a/src/orders/order.service.ts b/src/orders/order.service.ts
index a1b2c3d..d4e5f6a 100644
--- a/src/orders/order.service.ts
+++ b/src/orders/order.service.ts
@@ -30,6 +30,12 @@ export function createOrder(itemId: string, quantity: number): Order {
   return order;
 }
 
+export function cancelOrder(orderId: string): Order {
+  const order = orderStore.get(orderId);
+  if (!order) throw new Error(\`Order not found: \${orderId}\`);
+  return order;
+}
+
 export function getOrder(orderId: string): Order | undefined {
   return orderStore.get(orderId);
 }
diff --git a/src/auth/auth.middleware.ts b/src/auth/auth.middleware.ts
new file mode 100644
index 0000000..9f8a1b2
--- /dev/null
+++ b/src/auth/auth.middleware.ts
@@ -0,0 +1,10 @@
+export const ADMIN_ROLE_HEADER = 'x-changeproof-admin-role';
+
+export function requireAdmin(context: AuthContext): void {
+  if (context.role !== 'admin') {
+    throw new Error('Forbidden');
+  }
+}
`;

describe('parseDiff', () => {
  it('detects changed files', () => {
    const result = parseDiff(SAMPLE_DIFF);
    const paths = result.artifacts.map((a) => a.filePath);
    expect(paths).toContain('src/orders/order.service.ts');
    expect(paths).toContain('src/auth/auth.middleware.ts');
  });

  it('identifies new files', () => {
    const result = parseDiff(SAMPLE_DIFF);
    const newFile = result.artifacts.find((a) => a.filePath === 'src/auth/auth.middleware.ts');
    expect(newFile?.changeType).toBe('added');
  });

  it('identifies modified files', () => {
    const result = parseDiff(SAMPLE_DIFF);
    const modFile = result.artifacts.find((a) => a.filePath === 'src/orders/order.service.ts');
    expect(modFile?.changeType).toBe('modified');
  });

  it('extracts added symbols', () => {
    const result = parseDiff(SAMPLE_DIFF);
    const authFile = result.artifacts.find((a) => a.filePath === 'src/auth/auth.middleware.ts');
    expect(authFile?.symbols).toContain('ADMIN_ROLE_HEADER');
    expect(authFile?.symbols).toContain('requireAdmin');
  });

  it('counts added and deleted lines', () => {
    const result = parseDiff(SAMPLE_DIFF);
    const serviceFile = result.artifacts.find((a) => a.filePath === 'src/orders/order.service.ts');
    expect(serviceFile?.addedLines ?? 0).toBeGreaterThan(0);
  });

  it('identifies public API files', () => {
    const result = parseDiff(SAMPLE_DIFF);
    // service.ts contains 'service' in path
    const serviceFile = result.artifacts.find((a) => a.filePath === 'src/orders/order.service.ts');
    expect(serviceFile?.isPublicApi).toBe(true);
  });

  it('returns empty for empty diff', () => {
    const result = parseDiff('');
    expect(result.artifacts).toHaveLength(0);
  });
});
