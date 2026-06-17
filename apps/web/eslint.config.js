import { nextJsConfig } from "@repo/eslint-config/next-js";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...nextJsConfig,
  {
    rules: {
      // Redundant in a TypeScript codebase — prop shapes are enforced by types.
      "react/prop-types": "off",
    },
  },
];
