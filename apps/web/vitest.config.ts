import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      // Mirror the "@/*" -> "./*" path alias from tsconfig.json.
      { find: /^@\//, replacement: `${root}/` },
      // Next.js aliases `server-only` to a no-op inside its own server
      // bundler; outside that pipeline (i.e. here) it throws unconditionally,
      // so stub it the same way Next effectively does.
      { find: "server-only", replacement: `${root}/tests/stubs/server-only.ts` },
    ],
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
