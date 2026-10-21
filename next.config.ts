import type { NextConfig } from "next";

// On GitHub Pages the site lives under /<repo-name>. The deploy workflow sets
// PAGES_BASE_PATH; locally it is empty so `npm run dev` serves from /.
const basePath = process.env.PAGES_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
