// Next.js aliases the real `server-only` package to a no-op in server
// bundles and to a throwing stub in client bundles (via its build pipeline).
// Vitest runs outside that pipeline, so tests import this no-op instead —
// see the `server-only` alias in vitest.config.ts.
export {};
