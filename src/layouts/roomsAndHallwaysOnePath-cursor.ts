import { defaultRoomsAndHallways } from "../branches";
import { dungeonHeight, dungeonWidth } from "../printScreen";
import {
  Coords,
  Direction,
  E,
  N,
  RoomsAndHallwaysConfig,
  S,
  W,
} from "../types";
import { coordsToKey, getRandomInt } from "../utils";

/** Cardinal only — predictable edge attachment and bounds. */
const CARDINAL: Direction[] = [N, S, E, W];

function opposite(d: Direction): Direction {
  const o = CARDINAL.find(
    (c) => c.xMod === -d.xMod && c.yMod === -d.yMod,
  )!;
  return o;
}

/** Pick a hallway direction; avoid doubling back along the incoming corridor. */
function pickHallwayDirection(incoming: Direction | null): Direction {
  const choices =
    incoming === null
      ? CARDINAL.slice()
      : CARDINAL.filter((d) => d !== opposite(incoming));
  return choices[getRandomInt(0, choices.length - 1)];
}

/** Floor bbox for buildRoom(origin, w, h) — same convention as roomsAndHallways.ts */
function floorBBox(ox: number, oy: number, w: number, h: number) {
  return {
    minX: ox + 2,
    maxX: ox + w - 1,
    minY: oy + 1,
    maxY: oy + h - 1,
  };
}

/** First hallway cell (walkable), adjacent to room floor, stepping in `dir`. */
function hallwayStart(
  ox: number,
  oy: number,
  w: number,
  h: number,
  dir: Direction,
): { x: number; y: number } {
  const { minX, maxX, minY, maxY } = floorBBox(ox, oy, w, h);
  const midX = Math.floor((minX + maxX) / 2);
  const midY = Math.floor((minY + maxY) / 2);
  if (dir === E) return { x: maxX + 1, y: midY };
  if (dir === W) return { x: minX - 1, y: midY };
  if (dir === N) return { x: midX, y: minY - 1 };
  /* S */ return { x: midX, y: maxY + 1 };
}

/**
 * Next room top-left origin so floor connects to hallway tip.
 * Hallway advanced in `dir` (e.g. E); tip is the last hallway tile.
 */
function originForRoomAfterTip(
  tip: Coords,
  dir: Direction,
  w: number,
  h: number,
): { ox: number; oy: number } {
  if (dir === E) {
    const ox = tip.x - 1;
    return { ox, oy: tip.y - Math.floor(h / 2) };
  }
  if (dir === W) {
    const ox = tip.x - w + 1;
    return { ox, oy: tip.y - Math.floor(h / 2) };
  }
  if (dir === S) {
    const oy = tip.y;
    return { ox: tip.x - Math.floor(w / 2), oy };
  }
  /* N */ const oy = tip.y - h + 1;
  return { ox: tip.x - Math.floor(w / 2), oy };
}

function roomFitsInDungeon(ox: number, oy: number, w: number, h: number): boolean {
  const { minX, maxX, minY, maxY } = floorBBox(ox, oy, w, h);
  return (
    minX >= 0 &&
    maxX < dungeonWidth &&
    minY >= 0 &&
    maxY < dungeonHeight &&
    ox >= 0 &&
    oy >= 0 &&
    ox + w <= dungeonWidth &&
    oy + h <= dungeonHeight
  );
}

function maxHallwayLength(
  ox: number,
  oy: number,
  w: number,
  h: number,
  dir: Direction,
  nextW: number,
  nextH: number,
): number {
  const start = hallwayStart(ox, oy, w, h, dir);
  if (
    start.x < 0 ||
    start.x >= dungeonWidth ||
    start.y < 0 ||
    start.y >= dungeonHeight
  ) {
    return 0;
  }
  let maxL = 0;
  for (let L = 1; L <= 80; L++) {
    const tip = {
      x: start.x + (L - 1) * dir.xMod,
      y: start.y + (L - 1) * dir.yMod,
    };
    if (
      tip.x < 0 ||
      tip.x >= dungeonWidth ||
      tip.y < 0 ||
      tip.y >= dungeonHeight
    ) {
      break;
    }
    const { ox: nox, oy: noy } = originForRoomAfterTip(tip, dir, nextW, nextH);
    if (roomFitsInDungeon(nox, noy, nextW, nextH)) maxL = L;
  }
  return maxL;
}

export function buildRoomsAndHallwaysOnePath(
  config?: RoomsAndHallwaysConfig,
): Map<string, Coords> {
  if (!config) {
    config = defaultRoomsAndHallways;
  }

  const numRooms = getRandomInt(config.minRooms, config.maxRooms);

  for (let attempt = 0; attempt < 80; attempt++) {
    const tiles = tryBuildOnePath(config, numRooms);
    if (tiles) return tiles;
  }

  // last resort: empty center stub so callers never get null
  const fallback = new Map<string, Coords>();
  const cx = Math.floor(dungeonWidth / 2);
  const cy = Math.floor(dungeonHeight / 2);
  for (let dx = -2; dx <= 2; dx++) {
    for (let dy = -2; dy <= 2; dy++) {
      const c = { x: cx + dx, y: cy + dy };
      fallback.set(coordsToKey(c), c);
    }
  }
  return fallback;
}

function tryBuildOnePath(
  config: RoomsAndHallwaysConfig,
  numRooms: number,
): Map<string, Coords> | null {
  let tiles = new Map<string, Coords>();

  let w = getRandomInt(config.minRoomWidth, config.maxRoomWidth);
  let h = getRandomInt(config.minRoomHeight, config.maxRoomHeight);
  const first = randomOriginInDungeon(w, h);
  if (!first) return null;
  let { ox, oy } = first;

  let incoming: Direction | null = null;

  for (let n = 0; n < numRooms; n++) {
    const room = buildRoom(config, ox, oy, w, h);
    for (const [k, v] of room.tiles) tiles.set(k, v);

    if (n === numRooms - 1) break;

    const dir = pickHallwayDirection(incoming);
    const wNext = getRandomInt(config.minRoomWidth, config.maxRoomWidth);
    const hNext = getRandomInt(config.minRoomHeight, config.maxRoomHeight);

    const maxL = maxHallwayLength(ox, oy, w, h, dir, wNext, hNext);
    const minL = Math.max(3, Math.floor(w / 2) + 1);
    if (maxL < minL) return null;

    const L = getRandomInt(minL, maxL);
    const start = hallwayStart(ox, oy, w, h, dir);
    let tip = { ...start };
    for (let i = 0; i < L; i++) {
      tip = {
        x: start.x + i * dir.xMod,
        y: start.y + i * dir.yMod,
      };
      if (
        tip.x < 0 ||
        tip.x >= dungeonWidth ||
        tip.y < 0 ||
        tip.y >= dungeonHeight
      ) {
        return null;
      }
      tiles.set(coordsToKey(tip), tip);
    }

    const next = originForRoomAfterTip(tip, dir, wNext, hNext);
    if (!roomFitsInDungeon(next.ox, next.oy, wNext, hNext)) return null;

    ox = next.ox;
    oy = next.oy;
    w = wNext;
    h = hNext;
    incoming = dir;
  }

  return tiles;
}

function randomOriginInDungeon(
  w: number,
  h: number,
): { ox: number; oy: number } | null {
  const maxOx = dungeonWidth - w;
  const maxOy = dungeonHeight - h;
  if (maxOx < 0 || maxOy < 0) return null;
  return {
    ox: getRandomInt(0, maxOx),
    oy: getRandomInt(0, maxOy),
  };
}

function buildRoom(
  config: RoomsAndHallwaysConfig,
  originX: number,
  originY: number,
  w?: number,
  h?: number,
) {
  let tiles = new Map<string, Coords>();

  const rw = w ?? getRandomInt(config.minRoomWidth, config.maxRoomWidth);
  const rh = h ?? getRandomInt(config.minRoomHeight, config.maxRoomHeight);

  for (let i = 1; i < rh; i++) {
    for (let j = 2; j < rw; j++) {
      tiles.set(coordsToKey({ x: originX + j, y: originY + i }), {
        x: originX + j,
        y: originY + i,
      });
    }
  }

  const midpoint = {
    x: Math.floor(originX + rw / 2),
    y: Math.floor(originY + rh / 2),
  };

  return { tiles, midpoint, w: rw, h: rh };
}
