import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/arena",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
    ],
  },
  output: "standalone",
};

export default nextConfig;
