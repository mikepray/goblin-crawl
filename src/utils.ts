import {
  Actor,
  BranchLevel,
  Coords,
  CoordsMap,
  Feature,
  Skills,
  SkillMultipliers,
  SpawnInfo,
} from "./types";

const bresenhamLineKeys: string[] = [];

/**
 * Integer Bresenham line from (x0,y0) to (x1,y1), inclusive.
 * Clears and fills `out` with coordsToKey-compatible strings in walk order.
 */
export function collectBresenhamLineKeys(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  out: string[],
): void {
  out.length = 0;
  let x = x0;
  let y = y0;
  const dx = Math.abs(x1 - x0);
  const sx = x0 < x1 ? 1 : -1;
  const dy = -Math.abs(y1 - y0);
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;

  while (true) {
    out.push(`${x},${y}`);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

export function isTileInFieldOfVision(
  testCoords: Coords,
  playerCoords: Coords,
  viewRadius: number,
  gameTiles: CoordsMap,
): boolean {
  // if test coord is not within player view radius
  if (
    testCoords.x > playerCoords.x + viewRadius ||
    testCoords.y > playerCoords.y + viewRadius ||
    testCoords.x < playerCoords.x - viewRadius ||
    testCoords.y < playerCoords.y - viewRadius
  ) {
    return false;
  }
  // raycast using Bresenham; reuse buffer to avoid Set + Coords allocations per ray
  collectBresenhamLineKeys(
    playerCoords.x,
    playerCoords.y,
    testCoords.x,
    testCoords.y,
    bresenhamLineKeys,
  );

  const line = bresenhamLineKeys;
  for (let i = 0; i < line.length; i++) {
    if (!gameTiles.has(line[i])) {
      // if the final point in the line is a wall, display the wall
      return i === line.length - 1;
    }
  }
  // if any tile in the resulting line does not exist in the tile set, then the tile is not in field of vision

  return true;
}

export const d20 = () => {
  return getRandomInt(0, 20);
};

export function getRandomInt(min: number, max: number) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// function getRandomArbitrary(min, max) {
//   return Math.random() * (max - min) + min;
// }

// dice roller. rolls k-sided dice n times
export const nDk = (n: number, k: number) => {
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += getRandomInt(1, k);
  }
  return sum;
};

// converts coordinates to a string key for O(1) lookups in Maps
export function coordsToKey(coords: Coords): string {
  return `${coords.x},${coords.y}`;
}

// converts coordinates to a string key for O(1) lookups in Maps
export function branchLevelToKey(branchLevel: BranchLevel): string {
  return `${branchLevel.branch.name}:${branchLevel.level}`;
}

export const CoordsUtil = {
  add: (a: Coords, b: Coords): Coords => {
    return { x: a.x + b.x, y: a.y + b.y };
  },

  equals: (a: Coords, b: Coords): boolean => {
    return a.x === b.x && a.y === b.y;
  },
};

// gets a random valid tile in the given list of tiles.
export function getRandomValidTile(
  tiles: Map<string, Coords>,
  deconflictWith?: Map<string, Coords>,
): Coords {
  let key;

  if (deconflictWith) {
    // subtract deconfliction tiles from tiles
    let deconflictedTiles: Array<string> = Array.from(tiles.keys()).filter(
      (tile) => {
        return !deconflictWith.has(tile);
      },
    );
    key = deconflictedTiles[getRandomInt(0, deconflictedTiles.length)];
  } else {
    // if nothing to deconflict with, just use the base tile map
    key = Array.from(tiles.keys()).at(getRandomInt(0, tiles.size));
  }

  // get a random valid tile key

  // get the tile by the deconflicted valid tile key
  return {
    x: tiles.get(key!)!.x,
    y: tiles.get(key!)!.y,
  };
}

// iterates through the given actor's slots and sums the skill multipliers for each skill
// also calculates the static bonuses like armor and dodging
export const getSkillMultipliers = (actor: Actor): SkillMultipliers => {
  let skillMultipliers: Skills = {
    armor: 1,
    dodging: 1,
    cunning: 1,
    savagery: 1,
    fortitude: 1,
    power: 1,
  };
  let bonuses = { armorBonus: 0, dodgingBonus: 0 };

  if (actor.slots) {
    for (const slot of Object.keys(actor.slots) as Array<
      keyof typeof actor.slots
    >) {
      if (actor.slots[slot]) {
        skillMultipliers.cunning += actor.slots[slot].cunning ?? 1;
        skillMultipliers.savagery += actor.slots[slot].savagery ?? 1;
        skillMultipliers.fortitude += actor.slots[slot].fortitude ?? 1;
        skillMultipliers.power += actor.slots[slot].power ?? 1;
        skillMultipliers.armor += actor.slots[slot].armor ?? 1;
        skillMultipliers.dodging += actor.slots[slot].dodging ?? 1;
        bonuses.armorBonus += actor.slots[slot].armorBonus ?? 1;
        bonuses.dodgingBonus += actor.slots[slot].dodgingBonus ?? 1;
      }
    }
  }
  return { multipliers: skillMultipliers, bonuses: bonuses };
};

export const defaultSkills: Skills = {
  armor: 0,
  dodging: 0,
  cunning: 0,
  savagery: 0,
  fortitude: 0,
  power: 0,
};

/**
 * Converts a actor to a feature and changes the glyph to be red
 *
 * @param {number} x - x cord
 * @param {number} y - y cord
 * @param {string} glyph - character indicator
 * @param {string} name - actor type
 * @returns {Feature} New feature.
 */
export const getCorpse = (
  x: number,
  y: number,
  glyph: string,
  name: string,
): Feature => {
  return {
    x,
    y,
    glyph: `{#4f4640-fg}${glyph}{/#4f4640-fg}`,
    name,
    description: `${name} remains`,
    level: 0,
    currentHp: 0,
    maxHp: 0,
    hitDie: 0,
    hpRegenEveryNTurns: 0,
    spawnInfo: [
      {
        branchName: "Dungeon",
        distribution: "determined",
        unique: false,
        spawnedNum: 0,
        spawnRate: 0,
        mustSpawn: false,
        frequency: 1,
      },
    ],
    ...defaultSkills,
  };
};

export const defaultSpawnInfo: SpawnInfo = {
  branchName: "Dungeon",
  distribution: "determined",
  unique: false,
  spawnedNum: 0,
  spawnRate: 0,
  mustSpawn: false,
  frequency: 1,
};

// roll n k-sided dice in the string format of nDk
// returns zero if anything is undefined or can't be parsed
export function roll(ndk?: string) {
  if (ndk) {
    const nk = ndk.split("d");
    if (nk[0] && parseInt(nk[0]) && nk[1] && parseInt(nk[1])) {
      return nDk(parseInt(nk[0]), parseInt(nk[1]));
    }
  }
  return 0;
}
