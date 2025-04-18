import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'ui-avatars.com',
      'nodebucketcnm203.s3.ap-southeast-1.amazonaws.com',
      'example.com',
      'static.vecteezy.com'
    ],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  env: {
    PORT: "3001" // Convert number to string to fix type error
  }
};

export default nextConfig;
