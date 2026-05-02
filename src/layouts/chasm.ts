import { defaultRoomsAndHallways } from "../branches";
import { Coords, RoomsAndHallwaysConfig } from "../types";
import { coordsToKey, getRandomInt, random } from "../utils";

export function buildChasm(
  config?: RoomsAndHallwaysConfig,
): Map<string, Coords> {
  let tiles = new Map<string, Coords>();
  if (!config) {
    config = defaultRoomsAndHallways;
  }
  // start midpoint Y and origin X
  let originX = 1;
  let originY = 20;
  // initial chasm height
  let chasmHeight = getRandomInt(2, 4);
  // get random width
  let width = getRandomInt(config.minWidth, config.maxWidth);

  // iterate left to right until hit chasm width
  for (let i = 0; i < width; i++) {
    getChasmSection(
      chasmHeight,
      { x: originX + i, y: originY - chasmHeight },
      tiles,
      config,
    );
    getChasmSection(chasmHeight, { x: originX + i, y: originY }, tiles, config);
    getChasmSection(
      chasmHeight,
      { x: originX + i, y: originY + chasmHeight },
      tiles,
      config,
    );
  }

  return tiles;
}

function getChasmSection(
  prevHeight: number,
  startCoords: Coords,
  tiles: Map<string, Coords>,
  _config: RoomsAndHallwaysConfig,
) {
  const x = startCoords.x;
  let y = startCoords.y;
  // above midpoint
  const midpointLowerClamp = y - 1;
  for (let i = 0; i < prevHeight; i++) {
    y = Math.max(midpointLowerClamp, y + getSectionUpOrDown());
    const cell = { x, y };
    tiles.set(coordsToKey(cell), cell);
  }
  // below midpoint
  const midpointUpperClamp = midpointLowerClamp + 1;
  for (let i = 0; i < prevHeight; i++) {
    y = Math.min(midpointUpperClamp, y - getSectionUpOrDown());
    const cell = { x, y };
    tiles.set(coordsToKey(cell), cell);
  }
}

function getSectionUpOrDown() {
  return random([-1, 0, 1]);
}
