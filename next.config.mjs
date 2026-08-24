/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow the dev server to be reached from other devices on the LAN
  // (e.g. testing the PWA on a phone). Add your machine's IP if it changes.
  allowedDevOrigins: ['192.168.1.10', 'localhost'],
};

export default nextConfig;