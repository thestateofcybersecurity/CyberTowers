import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // This project lives inside a directory tree that has an unrelated lockfile
  // higher up. Pinning the root stops Turbopack from inferring the wrong one.
  turbopack: {
    root: path.resolve(import.meta.dirname),
  },
};

export default nextConfig;
