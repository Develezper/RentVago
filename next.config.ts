import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg"],
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      // Facebook CDN (propiedades scrapeadas de Facebook Marketplace)
      {
        protocol: "https",
        hostname: "**.fbcdn.net",
      },
      {
        protocol: "https",
        hostname: "**.facebook.com",
      },
      // Comodín para cualquier host HTTPS externo (imágenes de otras fuentes de scraping)
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
