"use client";

/** Dùng CDN ảnh hiện có để tạo srcset; giữ nguyên URL có chữ ký và nguồn không hỗ trợ biến đổi. */
export default function imageLoader({ src, width, quality }) {
  let url;
  try { url = new URL(src); } catch { return src; }
  if (url.protocol !== "https:") return src;

  if (url.hostname === "images.unsplash.com" && !url.searchParams.has("s")) {
    url.searchParams.set("auto", "format");
    url.searchParams.set("w", String(width));
    url.searchParams.set("q", String(quality || 75));
    return url.toString();
  }

  if (url.hostname === "res.cloudinary.com" && !url.search && /\/image\/upload\/v\d+\//.test(url.pathname)) {
    url.pathname = url.pathname.replace("/image/upload/", `/image/upload/f_auto,q_${quality || "auto"},c_limit,w_${width}/`);
    return url.toString();
  }
  return src;
}
