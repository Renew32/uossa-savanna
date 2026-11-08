// One source of truth for the road, camera, shoulders and vegetation clearance.
export const START_Z = 35;
export const TRAVEL = 208;
export const ROAD_HALF_WIDTH = 2.65;
export function roadX(z) {
  const t = (START_Z - z) * 0.026;
  return 9 * Math.sin(t) - 4.5 * Math.sin(t * 2);
}
export function roadSlope(z) {
  const t = (START_Z - z) * 0.026;
  return -0.234 * Math.cos(t) + 0.234 * Math.cos(t * 2);
}
export function roadHeight(z) { return 0.23 * Math.sin(z * 0.028) + 0.13 * Math.cos(z * 0.067); }
export function terrainHeight(x, z) {
  const edge = Math.min(1, Math.max(0, (Math.abs(x - roadX(z)) - 3.7) / 13));
  return roadHeight(z) - 0.04 + edge * (0.7 * Math.sin(x * 0.1 + z * 0.035) + 0.45 * Math.cos(z * 0.09 - x * 0.07));
}
