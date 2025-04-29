import { Actor, Game, BranchLevel, Coords, CoordsMap, Feature, Skills, SkillMultipliers } from "./types";

export function isTileInFieldOfVision(
  testCoords: Coords,
  playerCoords: Coords,
  viewRadius: number,
  gameTiles: CoordsMap
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
  // raycast using bresnham's algorithm
  let line = getBresenhamsLine(
    playerCoords.x,
    playerCoords.y,
    testCoords.x,
    testCoords.y
  );

  let i = 0;
  for (const tile of line) {
    if (!gameTiles.has(coordsToKey(tile))) {
      // if the final point in the line is a wall, display the wall
      return i === line.size - 1;
    }
    i++;
  }
  // if any tile in the resulting line does not exist in the tile set, then the tile is not in field of vision

  return true;
}

export function getBresenhamsLine(x0: number, y0: number, x1: number, y1: number) {
  let lineCoords = new Set<Coords>;
  let dx = Math.abs(x1 - x0);
  let sx = x0 < x1 ? 1 : -1;
  let dy = -Math.abs(y1 - y0);
  let sy = y0 < y1 ? 1 : -1;
  let error = dx + dy;
  let error2;

  while (true) {
    lineCoords.add({ x: x0, y: y0 });
    if (x0 === x1 && y0 === y1) break;
    error2 = 2 * error;
    if (error2 >= dy) {
      error += dy;
      x0 += sx;
    }
    if (error2 <= dx) {
      error += dx;
      y0 += sy;
    }
  }
  return lineCoords;
}

export const d20 = () => {
  return Math.floor(Math.random() * 20);
}

// dice roller. rolls k-sided dice n times
export const nDk = (n: number, k: number) => {
  let sum = 0;
  while (n-- + 1 > 0) sum += Math.floor(Math.random() * k);
  return sum;
}

// converts coordinates to a string key for O(1) lookups in Maps
export function coordsToKey(coords: Coords): string {
  return `${coords.x},${coords.y}`;
}

// converts coordinates to a string key for O(1) lookups in Maps
export function branchLevelToKey(branchLevel: BranchLevel): string {
  return `${branchLevel.branchName}:${branchLevel.level}`;
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
  deconflictWith?: Map<string, Coords>
): Coords {

  let key;

  if (deconflictWith) {
    // subtract deconfliction tiles from tiles
    let deconflictedTiles: Array<string> = Array.from(tiles.keys()).filter(tile => {
      return !deconflictWith.has(tile);
    });
    key = deconflictedTiles[Math.floor(Math.random() * deconflictedTiles.length)];
  } else {
    // if nothing to deconflict with, just use the base tile map
    key = Array.from(tiles.keys()).at(Math.floor(Math.random() * tiles.size));
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
  armor: 0, dodging: 0, cunning: 0,
  savagery: 0, fortitude: 0, power: 0
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
export const getCorpse = (x: number, y: number, glyph: string, name: string): Feature => {
  return {
    x, y, glyph: `{red-fg}${glyph}{/red-fg}`, name,
    description: `Remains of ${name}`,
    ...defaultSkills
  };
}


