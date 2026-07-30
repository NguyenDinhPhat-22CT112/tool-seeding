import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@seeding/contracts", "@seeding/validation"],
};

export default nextConfig;
