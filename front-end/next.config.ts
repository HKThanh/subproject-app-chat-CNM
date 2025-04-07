import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['ui-avatars.com']
  },
  env: {
    PORT: "3001" // Convert number to string to fix type error
  }
};

export default nextConfig;
