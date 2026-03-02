import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-parse', 'chromadb', '@chroma-core/default-embed'],
  /* config options here */
};

export default nextConfig;
