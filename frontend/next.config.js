/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos", pathname: "/**" },
      { protocol: "https", hostname: "i.pravatar.cc", pathname: "/**" },
      { protocol: "https", hostname: "api.mapbox.com", pathname: "/**" },
      // local dev backend / assets
      { protocol: "http", hostname: "localhost", port: "3000", pathname: "/**" },
      { protocol: "http", hostname: "localhost", port: "3001", pathname: "/**" },
    ],
  },
};

module.exports = nextConfig;
