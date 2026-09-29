import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the project root: a stray lockfile in a parent directory would otherwise be picked up.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
