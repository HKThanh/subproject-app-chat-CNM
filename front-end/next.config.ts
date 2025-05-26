import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  reactStrictMode: true,
  images: {
    domains: [
      'ui-avatars.com',
      'nodebucketcnm203.s3.ap-southeast-1.amazonaws.com',
      'nodejs-hk2.s3.ap-southeast-1.amazonaws.com',
      'example.com',
      'static.vecteezy.com',
      'danhgiaxe.edu.vn',
      'https://picsum.photos',
      'nodejs-hk2.s3.ap-southeast-1.amazonaws.com',
      '*'
    ],
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  env: {
    PORT: "3001", // Convert number to string to fix type error
  },
};

export default nextConfig;
