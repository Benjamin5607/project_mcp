const pages = process.env.STATIC_EXPORT === "1";

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  ...(pages
    ? {
        output: "export",
        basePath: "/project_mcp",
        assetPrefix: "/project_mcp/",
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {}),
};

export default nextConfig;
