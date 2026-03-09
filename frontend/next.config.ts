import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  // GitHub Pages serves from /Car-warranty-AI-play/ in production
  basePath: isProd ? "/Car-warranty-AI-play" : "",
  assetPrefix: isProd ? "/Car-warranty-AI-play" : "",
};

export default nextConfig;
