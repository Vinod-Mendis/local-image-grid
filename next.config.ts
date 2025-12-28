import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true, // Required for local static images
  },
};

export default nextConfig;
