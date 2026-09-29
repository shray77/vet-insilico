import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: process.env.NODE_ENV === "production" ? "/vet-insilico" : "",
  // Публичный basePath для клиентского кода (wasm-пути transformers.js в esm-browser.ts)
  env: {
    NEXT_PUBLIC_BASE_PATH: process.env.NODE_ENV === "production" ? "/vet-insilico" : "",
  },
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
