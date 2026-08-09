import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Pin workspace root to this project folder — prevents Next.js from
  // picking up the parent hack/ package-lock.json as the root.
  outputFileTracingRoot: __dirname,
}

export default nextConfig
