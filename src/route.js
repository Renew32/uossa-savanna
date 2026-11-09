// One source of truth for the roads, the camera, the shoulders and vegetation clearance.
export const START_Z = 35;
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

// ── Side roads ──
// Each side road leaves the main road at a crossroads, turns out into the savanna, runs
// past its boards, ends in a hairpin in front of its final board, then comes back and
// merges tangentially into the main road further along the journey.
// Headings: 0 = straight ahead (towards -z), positive = turning left (towards -x).
const rotate = ([x, z], a) => { const c = Math.cos(a), s = Math.sin(a); return [x * c + z * s, -x * s + z * c]; };
const headingOf = ([x, z]) => Math.atan2(-x, -z);
function mainDir(z) { const k = roadSlope(z), n = Math.hypot(k, 1); return [-k / n, -1 / n]; }
const STEP = 0.5;
// Screens the visitor scrolls through after the final board while driving back to the main road.
export const EXIT_SCREENS = 3;

function sidePath({ forkZ, side, turn, leg, hairpin, merge, gap, boards }) {
  const raw = [];
  let p = [roadX(forkZ), forkZ], d = mainDir(forkZ);
  raw.push(p);
  const straight = len => { const n = Math.max(1, Math.round(len / 0.25)), ds = len / n; for (let i = 0; i < n; i++) { p = [p[0] + d[0] * ds, p[1] + d[1] * ds]; raw.push(p); } };
  const arc = (r, angle) => { const n = Math.max(1, Math.ceil(Math.abs(angle) * r / 0.25)), da = angle / n, ds = Math.abs(angle) * r / n; for (let i = 0; i < n; i++) { const m = rotate(d, da / 2); p = [p[0] + m[0] * ds, p[1] + m[1] * ds]; d = rotate(d, da); raw.push(p); } };
  const length = () => { let L = 0; for (let i = 1; i < raw.length; i++) L += Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]); return L; };
  straight(2);
  arc(turn, side * Math.PI / 2 - headingOf(d));
  const legStart = length();
  straight(leg);
  const legEnd = length(), legEndPoint = p.slice(), legDir = d.slice();
  arc(hairpin, -side * Math.PI);
  // Back towards the main road, then a quarter turn that merges into it.
  const joinZ = p[1] - merge, approachX = roadX(joinZ) - side * merge;
  straight(Math.abs(approachX - p[0]));
  const P0 = p.slice(), T0 = d.slice(), P1 = [roadX(joinZ), joinZ], T1 = mainDir(joinZ), k = 1.66 * merge;
  for (let i = 1; i <= 160; i++) {
    const t = i / 160, t2 = t * t, t3 = t2 * t, h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t, h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
    raw.push([h00 * P0[0] + h10 * k * T0[0] + h01 * P1[0] + h11 * k * T1[0], h00 * P0[1] + h10 * k * T0[1] + h01 * P1[1] + h11 * k * T1[1]]);
  }
  const L = length();
  // The main road beyond the merge, so the camera can look ahead past it.
  for (let z = joinZ - 0.5; z >= joinZ - 40; z -= 0.5) raw.push([roadX(z), z]);
  // Resample at a constant step along the curve.
  const cum = [0];
  for (let i = 1; i < raw.length; i++) cum.push(cum[i - 1] + Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]));
  const count = Math.floor(cum[cum.length - 1] / STEP) + 1, xs = new Float32Array(count), zs = new Float32Array(count);
  for (let i = 0, j = 0; i < count; i++) {
    const s = i * STEP;
    while (j < cum.length - 2 && cum[j + 1] < s) j++;
    const f = Math.min(1, (s - cum[j]) / ((cum[j + 1] - cum[j]) || 1));
    xs[i] = raw[j][0] + (raw[j + 1][0] - raw[j][0]) * f; zs[i] = raw[j][1] + (raw[j + 1][1] - raw[j][1]) * f;
  }
  const out = { x: 0, z: 0, dx: 0, dz: -1 };
  function at(s, target = out) {
    const u = Math.min(Math.max(s / STEP, 0), count - 1.001), i = Math.floor(u), f = u - i;
    target.x = xs[i] + (xs[i + 1] - xs[i]) * f; target.z = zs[i] + (zs[i + 1] - zs[i]) * f;
    const tx = xs[i + 1] - xs[i], tz = zs[i + 1] - zs[i], n = Math.hypot(tx, tz) || 1;
    target.dx = tx / n; target.dz = tz / n;
    return target;
  }
  return {
    side, forkZ, joinZ, L, legStart, legEnd, gap, at, xs, zs, samples: Math.floor(L / STEP) + 1,
    boards: boards.map(([offset, boardSide]) => ({ s: legStart + offset, side: boardSide })),
    finale: { x: legEndPoint[0] + legDir[0] * gap, z: legEndPoint[1] + legDir[1] * gap, dx: legDir[0], dz: legDir[1], s: legEnd + gap },
  };
}

// One entry per side road, with the same name as in SIDES (content.js). Distances in metres.
//   forkZ    where it leaves the main road (the main road runs from START_Z = 35 towards -z)
//   side     1 = turns left, -1 = turns right
//   turn     radius of the turn out of the main road
//   leg      length of the straight stretch that carries the boards
//   hairpin  radius of the U-turn at its far end; merge: radius of the turn back onto the main road
//   gap      distance from the end of the straight stretch to the final board
//   boards   [distance along the straight stretch, 1 = board on the left / -1 = on the right],
//            one per photo in SIDES[name].boards
// Bureau: to the left at the first crossroads; three boards, left / right / left, then the group
// photo in the middle of the road at the end.
// Inscription: to the right at the second crossroads; a single final board.
export const SIDE_PATHS = {
  bureau: sidePath({ forkZ: -52.36, side: 1, turn: 15, leg: 46, hairpin: 10, merge: 15, gap: 13,
    boards: [[9, 1], [23, -1], [37, 1]] }),
  inscription: sidePath({ forkZ: -150, side: -1, turn: 15, leg: 14, hairpin: 8, merge: 15, gap: 12, boards: [] }),
};
// Scroll screens in each side road's layer: intro, one per board, the final board, the way back.
export const SIDE_SCREENS = Object.fromEntries(Object.entries(SIDE_PATHS).map(([k, p]) => [k, p.boards.length + 2 + EXIT_SCREENS]));
export const FORK_Z = Object.fromEntries(Object.entries(SIDE_PATHS).map(([k, p]) => [k, p.forkZ]));
export const JOIN_Z = Object.fromEntries(Object.entries(SIDE_PATHS).map(([k, p]) => [k, p.joinZ]));
// The main road goes on for ROAD_AFTER_LAST_JOIN metres after the last side road has merged back:
// the camera reaches its end at the very bottom of the page. Raise it to make the road longer
// (for new chapters after « Ensemble »).
export const ROAD_AFTER_LAST_JOIN = 8;
export const END_Z = Math.min(...Object.values(JOIN_Z)) - ROAD_AFTER_LAST_JOIN;
export const TRAVEL = START_Z - END_Z;

// Spatial buckets of side-road samples for fast distance queries (exact up to CELL units).
const CELL = 20, grid = new Map(), cellKey = (cx, cz) => (cx + 2000) * 4096 + (cz + 2000);
for (const path of Object.values(SIDE_PATHS)) {
  for (let i = 0; i < path.samples; i++) {
    const key = cellKey(Math.floor(path.xs[i] / CELL), Math.floor(path.zs[i] / CELL));
    let list = grid.get(key); if (!list) grid.set(key, list = []);
    list.push(path.xs[i], path.zs[i]);
  }
}
export function sideDistance(x, z) {
  const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
  let best = Infinity;
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
    const list = grid.get(cellKey(cx + i, cz + j)); if (!list) continue;
    for (let k = 0; k < list.length; k += 2) { const dx = list[k] - x, dz = list[k + 1] - z, d = dx * dx + dz * dz; if (d < best) best = d; }
  }
  return Math.sqrt(best);
}
// Horizontal distance to the nearest road centre line (main road or a side road).
export function roadDistance(x, z) { return Math.min(Math.abs(x - roadX(z)), sideDistance(x, z)); }
export function terrainHeight(x, z) {
  const edge = Math.min(1, Math.max(0, (roadDistance(x, z) - 3.7) / 13));
  return roadHeight(z) - 0.04 + edge * (0.7 * Math.sin(x * 0.1 + z * 0.035) + 0.45 * Math.cos(z * 0.09 - x * 0.07));
}
