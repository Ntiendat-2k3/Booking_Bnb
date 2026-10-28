/** Chờ cả SDK và CSS trước khi tạo bản đồ, tránh nạp CSS Mapbox vào giao diện chưa dùng bản đồ. */
export async function loadMapbox() {
  const [sdk] = await Promise.all([
    import("mapbox-gl"),
    import("mapbox-gl/dist/mapbox-gl.css"),
  ]);
  return sdk.default;
}
