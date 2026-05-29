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
  // Serve WASM files with correct headers and enable SharedArrayBuffer for FFmpeg
  async headers() {
    return [
      {
        source: "/(.*)\\.wasm",
        headers: [
          { key: "Content-Type", value: "application/wasm" },
        ],
      },
      // Note: FFmpeg.wasm in single-threaded mode does NOT need
      // SharedArrayBuffer / COOP / COEP headers. Removing them
      // avoids blocking cross-origin CDN resources.
    ];
  },
};

export default nextConfig;
