import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Default is 1MB — too small for real project documents (PDFs, slide
    // decks, screenshots from meetings). Server actions still run through
    // the app's normal auth/RBAC, this only raises the upload ceiling.
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
