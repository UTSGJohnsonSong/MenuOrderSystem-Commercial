import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // standalone：Docker 部署只拷 .next/standalone，镜像小、启动快
  output: "standalone",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
