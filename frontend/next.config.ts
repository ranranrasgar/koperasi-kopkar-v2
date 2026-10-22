import type { NextConfig } from "next"

const nextConfig: NextConfig = {
    // Mesin posting di workspace backend ditulis dalam TypeScript tanpa build terpisah.
    transpilePackages: ["@kopkar/backend"],
}

export default nextConfig
