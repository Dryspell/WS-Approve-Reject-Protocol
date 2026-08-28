/** Matches hex placement and pathing in `server/src/battle_genetics.rs`. */
export const HEX_RADIUS = 4;
export const GROUP_RING = 3;

export const AXIAL_DIRS: Array<[number, number]> = [
  [1, 0],
  [1, -1],
  [0, -1],
  [-1, 0],
  [-1, 1],
  [0, 1],
];

export function hexDist(aq: number, ar: number, bq: number, br: number): number {
  return (Math.abs(aq - bq) + Math.abs(aq + ar - bq - br) + Math.abs(ar - br)) / 2;
}

export function inBoard(q: number, r: number): boolean {
  return hexDist(0, 0, q, r) <= HEX_RADIUS;
}

export function hexesOnRing(radius: number): Array<[number, number]> {
  if (radius <= 0) return [[0, 0]];
  const hexes: Array<[number, number]> = [];
  let q = -radius;
  let r = radius;
  for (const [dq, dr] of AXIAL_DIRS) {
    for (let i = 0; i < radius; i++) {
      hexes.push([q, r]);
      q += dq;
      r += dr;
    }
  }
  return hexes;
}

export function allBoardHexes(): Array<[number, number]> {
  const hexes: Array<[number, number]> = [];
  for (let q = -HEX_RADIUS; q <= HEX_RADIUS; q++) {
    for (let r = -HEX_RADIUS; r <= HEX_RADIUS; r++) {
      if (inBoard(q, r)) hexes.push([q, r]);
    }
  }
  return hexes;
}

export function groupCenters(groupCount: number): Array<[number, number]> {
  if (groupCount <= 0) return [];
  if (groupCount === 1) return [[0, 0]];
  const ring = hexesOnRing(GROUP_RING);
  return Array.from({ length: groupCount }, (_, i) => {
    const index = Math.floor((i * ring.length + Math.floor(groupCount / 2)) / groupCount) % ring.length;
    return ring[index];
  });
}

export function clusterCells(
  origin: [number, number],
  count: number,
  taken: Set<string>,
): Array<[number, number]> {
  const cells: Array<[number, number]> = [];
  const used = new Set(taken);
  for (let radius = 0; radius <= HEX_RADIUS && cells.length < count; radius++) {
    const ring = radius === 0 ? [origin] : hexesOnRing(radius).map(([q, r]) => [origin[0] + q, origin[1] + r] as [number, number]);
    for (const [q, r] of ring) {
      const key = `${q},${r}`;
      if (!inBoard(q, r) || used.has(key)) continue;
      used.add(key);
      cells.push([q, r]);
      if (cells.length >= count) break;
    }
  }
  return cells;
}

export function stepToward(
  q: number,
  r: number,
  tq: number,
  tr: number,
  occupied: Set<string>,
): [number, number] | null {
  const current = hexDist(q, r, tq, tr);
  let best: [number, number] | null = null;
  let bestDist = current;
  for (const [dq, dr] of AXIAL_DIRS) {
    const nq = q + dq;
    const nr = r + dr;
    if (!inBoard(nq, nr) || occupied.has(`${nq},${nr}`)) continue;
    const next = hexDist(nq, nr, tq, tr);
    if (next < bestDist) {
      bestDist = next;
      best = [nq, nr];
    }
  }
  return best;
}

export function hexToPixel(q: number, r: number, size: number): { x: number; y: number } {
  return {
    x: size * Math.sqrt(3) * (q + r / 2),
    y: size * (3 / 2) * r,
  };
}

export function eventAction(event: { action?: number | string | null }): "attack" | "move" | "wait" {
  if (event.action === 1 || event.action === "move") return "move";
  if (event.action === 2 || event.action === "wait") return "wait";
  return "attack";
}

export const OWNER_PALETTE = [
  { bg: "bg-red-600", border: "border-red-400", text: "text-red-300", ring: "ring-red-300" },
  { bg: "bg-blue-600", border: "border-blue-400", text: "text-blue-300", ring: "ring-blue-300" },
  { bg: "bg-emerald-600", border: "border-emerald-400", text: "text-emerald-300", ring: "ring-emerald-300" },
  { bg: "bg-violet-600", border: "border-violet-400", text: "text-violet-300", ring: "ring-violet-300" },
  { bg: "bg-amber-500", border: "border-amber-300", text: "text-amber-200", ring: "ring-amber-200" },
  { bg: "bg-cyan-600", border: "border-cyan-400", text: "text-cyan-300", ring: "ring-cyan-300" },
  { bg: "bg-orange-500", border: "border-orange-300", text: "text-orange-200", ring: "ring-orange-200" },
  { bg: "bg-pink-500", border: "border-pink-300", text: "text-pink-200", ring: "ring-pink-200" },
] as const;

export function paletteFor(team: string, teams: string[]) {
  const index = Math.max(0, teams.indexOf(team));
  return OWNER_PALETTE[index % OWNER_PALETTE.length];
}
