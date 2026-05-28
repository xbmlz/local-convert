import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    // heic2any uses a WASM file that needs to be accessible
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    return config;
  },
  // Serve WASM files with correct headers
  async headers() {
    return [
      {
        source: "/(.*)\\.wasm",
        headers: [
          { key: "Content-Type", value: "application/wasm" },
        ],
      },
    ];
  },
};

export default nextConfig;
