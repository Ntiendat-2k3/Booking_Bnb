/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  async rewrites() {
    if (process.env.NODE_ENV !== "production") return [];
    return [
      {
        source: "/api/v1/:path*",
        destination: "https://booking-bnb-api.onrender.com/api/v1/:path*",
      },
    ];
  },

  // Loại bỏ log chẩn đoán khỏi bản production.
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },

  // Chỉ đưa các biểu tượng và hàm thực sự sử dụng vào bundle.
  experimental: {
    optimizePackageImports: [
      "@phosphor-icons/react",
      "date-fns",
    ],
  },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "api.mapbox.com", pathname: "/**" },
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      // Ảnh dự phòng cho dữ liệu mẫu.
      { protocol: "https", hostname: "picsum.photos", pathname: "/**" },
      { protocol: "https", hostname: "i.pravatar.cc", pathname: "/**" },
      // Backend trong môi trường phát triển.
      {
        protocol: "http",
        hostname: "localhost",
        port: "3000",
        pathname: "/**",
      },
    ],
  },
};

module.exports = nextConfig;
