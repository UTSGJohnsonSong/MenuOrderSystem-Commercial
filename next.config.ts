import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // standalone：Docker 部署只拷 .next/standalone，镜像小、启动快
  output: "standalone",
  images: {
    unoptimized: true,
  },
  // 手机连同一 WiFi 调试时必需。Next 16 默认拒绝从非 localhost 的地址请求
  // /_next 下的开发资源（返回 403），页面 HTML 照常返回但所有 JS chunk 被拦，
  // 表现为「页面能看、点什么都没反应」——极难从现象反推。
  // 仅影响 next dev；生产构建没有这个检查。换网络后本机内网 IP 会变，要同步改。
  allowedDevOrigins: ["192.168.2.25"],
};

export default nextConfig;
