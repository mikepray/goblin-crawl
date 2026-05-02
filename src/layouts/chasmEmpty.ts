import { defaultRoomsAndHallways } from "../branches";
import { Coords, RoomsAndHallwaysConfig } from "../types";
import { coordsToKey, getRandomInt, random } from "../utils";

export function buildChasmEmpty(
  config?: RoomsAndHallwaysConfig,
): Map<string, Coords> {
  let tiles = new Map<string, Coords>();
  if (!config) {
    config = defaultRoomsAndHallways;
  }
  // start midpoint Y and origin X
  let originX = 1;
  let originY = 20;
  // get random width
  let width = getRandomInt(config.minWidth, config.maxWidth);

  // iterate left to right until hit chasm width
  for (let i = 0; i < width; i++) {
    getChasmSection({ x: originX + i, y: originY }, tiles);
  }

  return tiles;
}

function getChasmSection(coords: Coords, tiles: Map<string, Coords>) {
  const x = coords.x;
  let y = coords.y - getSectionUpOrDown();
  const upperBound = y;
  const lowerBound = y + 4 + getSectionUpOrDown();

  for (let yy = upperBound; yy < lowerBound; yy++) {
    const cell = { x, y: yy };
    tiles.set(coordsToKey(cell), cell);
  }
}

function getSectionUpOrDown() {
  return random([-1, -1, 0, 1, 1]);
}
