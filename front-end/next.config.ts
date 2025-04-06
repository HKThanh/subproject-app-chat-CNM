import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    PORT: "3001" // Convert number to string to fix type error
  }
};

export default nextConfig;
