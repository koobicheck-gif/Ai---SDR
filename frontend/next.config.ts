import type { NextConfig } from "next";

// Set GITHUB_PAGES=true in CI to enable static export + basePath for GitHub Pages.
// Docker / self-hosted deployments leave this unset and get a normal Next.js server.
const isGitHubPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  ...(isGitHubPages && { output: "export" }),
  trailingSlash: true,
  images: { unoptimized: true },
  basePath: isGitHubPages ? "/Ai---SDR" : "",
  assetPrefix: isGitHubPages ? "/Ai---SDR" : "",
};

export default nextConfig;
