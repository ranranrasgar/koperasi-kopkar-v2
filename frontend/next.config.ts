import type { NextConfig } from "next"

const nextConfig: NextConfig = {
    // Mesin posting di workspace backend ditulis dalam TypeScript tanpa build terpisah.
    transpilePackages: ["@kopkar/backend"],
    // Server uji (scripts/dev-uji.mjs) memakai folder build sendiri karena .next dikunci dev server utama,
    // dan tsconfig sendiri supaya Next tidak menambahkan .next-uji ke tsconfig.json.
    distDir: process.env.KOPKAR_DIST_DIR || ".next",
    typescript: { tsconfigPath: process.env.KOPKAR_DIST_DIR ? "tsconfig.uji.json" : "tsconfig.json" },
}

export default nextConfig
