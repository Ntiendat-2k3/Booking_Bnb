// Màu nền Mapbox được nội suy từ token light/dark hiện có của trang.
const BASEMAP = {
  theme: "faded",
  lightPreset: "day",
  show3dObjects: false,
  show3dBuildings: false,
  show3dTrees: false,
  show3dLandmarks: false,
  show3dFacades: false,
  showPointOfInterestLabels: false,
  showTransitLabels: false,
};

function readColor(style, name) {
  return style.getPropertyValue(`--color-${name}`).trim().split(/\s+/).map(Number);
}

function rgb(channels) {
  return `rgb(${channels.map(Math.round).join(", ")})`;
}

function blend(base, tint, amount) {
  return rgb(base.map((channel, index) => channel * (1 - amount) + tint[index] * amount));
}

/** Chỉ đọc token khi tạo bản đồ hoặc đổi theme, không đọc CSS trong mỗi khung hình. */
export function getSearchMapColors(element) {
  const style = getComputedStyle(element);
  const canvas = readColor(style, "canvas");
  const surface = readColor(style, "surface");
  const positive = readColor(style, "positive");
  const accent = readColor(style, "accent");
  const line = readColor(style, "line");

  return {
    colorLand: rgb(canvas),
    colorGreenspace: blend(surface, positive, 0.18),
    colorWater: blend(surface, positive, 0.32),
    colorBuildings: rgb(readColor(style, "muted-surface")),
    colorRoads: rgb(surface),
    colorTrunks: blend(surface, line, 0.35),
    colorMotorways: blend(surface, accent, 0.12),
    colorPlaceLabels: rgb(readColor(style, "muted-ink")),
    colorRoadLabels: rgb(readColor(style, "muted-ink")),
    colorAdminBoundaries: rgb(line),
  };
}

export function getSearchMapLightPreset(element) {
  return getComputedStyle(element).colorScheme === "dark" ? "night" : "day";
}

export function getSearchMapStyle(element) {
  return {
    style: "mapbox://styles/mapbox/standard",
    config: { basemap: { ...BASEMAP, lightPreset: getSearchMapLightPreset(element), ...getSearchMapColors(element) } },
  };
}
