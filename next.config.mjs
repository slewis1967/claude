/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The Claude CLI bridge spawns a child process; keep it server-only.
  serverExternalPackages: [],
};

export default nextConfig;
