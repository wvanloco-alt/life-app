import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["better-sqlite3", "garmin-connect-client", "deasync", "node-libcurl-ja3"],
};

export default nextConfig;
