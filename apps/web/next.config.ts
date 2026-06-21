import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  transpilePackages: ["@agentscope/shared", "@agentscope/ui"],
};

export default nextConfig;
