import path from "node:path";
import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const nextConfig: NextConfig = {
  // Pin the project root: a stray lockfile in a parent directory would otherwise be picked up.
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    // Place photos uploaded from the admin live in the content store's public bucket.
    remotePatterns: supabaseUrl ? [new URL(`${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/place-images/**`)] : [],
  },
};

export default nextConfig;
