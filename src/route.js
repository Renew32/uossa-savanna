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

// ── The crossroads: a second track leaves the main road towards the left. ──
// The camera holds at FORK_PROGRESS of the main journey while the arrows are offered.
export const FORK_PROGRESS = 0.42;
export const FORK_Z = START_Z - FORK_PROGRESS * TRAVEL;
// Distance travelled along the branch (s) where each executive-board photo stands.
// Seven portrait boards line the track; the group photo closes it like a gate.
export const BRANCH_SPACING = 14;
export const BRANCH_FIRST_PHOTO = 21;
export const BRANCH_SIDE_PHOTOS = 7;
export const BRANCH_STOPS = BRANCH_SIDE_PHOTOS + 1;
export const BRANCH_FINALE = BRANCH_STOPS * BRANCH_SPACING + 9;
export const BRANCH_LENGTH = 200;
// Lateral separation from the main road: tangent at the fork, smooth curve, then parallel.
function branchOffset(s) {
  if (s <= 0) return 0;
  if (s < 40) return 18 * (s / 40) ** 2;
  if (s < 80) { const u = s - 40; return 18 + 0.9 * u - 0.45 * u * u / 40; }
  return 36;
}
export function branchZ(s) { return FORK_Z - s; }
export function branchX(z) { return roadX(z) - branchOffset(FORK_Z - z); }
export function branchSlope(z) { return (branchX(z + 0.05) - branchX(z - 0.05)) / 0.1; }
// Horizontal distance to the nearest road centre line (main road or branch).
export function roadDistance(x, z) {
  const main = Math.abs(x - roadX(z));
  if (z > FORK_Z || z < FORK_Z - BRANCH_LENGTH - 10) return main;
  return Math.min(main, Math.abs(x - branchX(z)));
}
export function terrainHeight(x, z) {
  const edge = Math.min(1, Math.max(0, (roadDistance(x, z) - 3.7) / 13));
  return roadHeight(z) - 0.04 + edge * (0.7 * Math.sin(x * 0.1 + z * 0.035) + 0.45 * Math.cos(z * 0.09 - x * 0.07));
}
