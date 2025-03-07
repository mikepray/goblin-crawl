import { BranchLevel, Coords, CoordsMap } from "./types";

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

export function getBresenhamsLine(x0: number, y0:number , x1: number, y1: number) {
  let lineCoords = new Set<Coords>;
  let dx = Math.abs(x1 - x0);
  let sx = x0 < x1 ? 1 : -1;
  let dy = -Math.abs(y1 - y0);
  let sy = y0 < y1 ? 1 : -1;
  let error = dx + dy;
  let error2;

  while (true) {
    lineCoords.add({x: x0, y: y0});
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

// gets a random valid tile in the given list of tiles. deconflicts with actors if the actors are sent in too
export function getRandomValidTile(
  tiles: Map<string, Coords>,
  deconflictWith?: Map<string, Coords>
): Coords {
  let tileCoords = { x: 0, y: 0 };

  for (let attempts = 0; attempts < tiles.size; attempts++) {
    // get a random tile using an index of the tile array (the valid empty tiles for a given level)
    const coords = Math.floor(Math.random() * tiles.size);
    const key = Array.from(tiles.keys()).at(coords);
    tileCoords = {
      x: tiles.get(key!)!.x,
      y: tiles.get(key!)!.y,
    };

    // deconflict 
    // keep iterating if there's a collision in placement
    if (!deconflictWith || !deconflictWith.has(coordsToKey(tileCoords))) {
      break;
    }

    // TODO could make this more optimal by using the union of the deconflict map and tiles
  }
  return tileCoords;
}

