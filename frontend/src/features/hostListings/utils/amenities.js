export function groupAmenities(items = []) {
  const map = new Map();
  for (const a of items) {
    const g = a.group || "Other";
    if (!map.has(g)) map.set(g, []);
    map.get(g).push(a);
  }
  return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
}
