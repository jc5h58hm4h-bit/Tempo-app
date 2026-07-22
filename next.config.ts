import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // L'app est une PWA : on garde la config Next minimale et on gère
  // le manifest + service worker manuellement dans /public (voir Partie 5).
};

export default nextConfig;
