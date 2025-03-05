import { BranchLevel, Coords } from "./types";

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
  actors?: Map<string, Coords>
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

    // deconflict with placed actors
    // keep iterating if there's a collision in placement
    if (!actors || !actors.has(coordsToKey(tileCoords))) {
      break;
    }
  }
  return tileCoords;
}
