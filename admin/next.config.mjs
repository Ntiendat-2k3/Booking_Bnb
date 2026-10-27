/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    if (process.env.NODE_ENV !== "production") return [];
    const backendOrigin = (process.env.BACKEND_API_ORIGIN || "https://booking-bnb-api.onrender.com").replace(/\/$/, "");
    return [{ source: "/api/v1/:path*", destination: `${backendOrigin}/api/v1/:path*` }];
  },
};

export default nextConfig;
