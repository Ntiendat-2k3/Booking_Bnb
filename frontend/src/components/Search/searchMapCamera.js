const CAMERA_PROFILES = {
  desktop: { device: "desktop", pitch: 30, buildingZoom: 14, duration: 600 },
  tablet: { device: "tablet", pitch: 25, buildingZoom: 15, duration: 500 },
  mobile: { device: "mobile", pitch: 18, buildingZoom: 16, duration: 350 },
};

export function getSearchMapCameraProfile(viewportWidth) {
  if (viewportWidth >= 1024) return CAMERA_PROFILES.desktop;
  if (viewportWidth >= 640) return CAMERA_PROFILES.tablet;
  return CAMERA_PROFILES.mobile;
}

export function getSearchMapFitPadding(element) {
  const width = element?.clientWidth || 360;
  const height = element?.clientHeight || 520;
  const side = Math.min(40, Math.max(20, Math.round(width * 0.06)));
  return {
    top: Math.min(72, Math.round(height * 0.16)),
    right: side,
    bottom: Math.min(48, Math.round(height * 0.12)),
    left: side,
  };
}

export function getSearchMapFocusOffset(element, hasPopup) {
  if (!hasPopup) return [0, 0];
  const width = element?.clientWidth || 360;
  const height = element?.clientHeight || 520;
  if (width < 600) return [0, -Math.min(140, Math.round(height * 0.24))];
  if (width < 900) return [Math.min(90, Math.round(width * 0.12)), -Math.min(70, Math.round(height * 0.1))];
  return [0, 0];
}

/** Chặn tòa nhà 3D trên thiết bị có dấu hiệu thiếu tài nguyên; tốc độ render vẫn được theo dõi khi bật. */
export function canUseMobileBuildings(browser) {
  if (browser?.connection?.saveData) return false;
  if (browser?.deviceMemory && browser.deviceMemory < 4) return false;
  if (browser?.hardwareConcurrency && browser.hardwareConcurrency < 4) return false;
  return true;
}
