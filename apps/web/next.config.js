import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin the workspace root so Turbopack doesn't pick up a stray lockfile elsewhere.
  turbopack: {
    root: path.join(dirname, "..", ".."),
  },
};

export default nextConfig;
