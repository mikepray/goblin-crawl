import { defaultRoomsAndHallways } from "../branches";
import { Coords, RoomsAndHallwaysConfig } from "../types";
import { coordsToKey, getRandomInt } from "../utils";

// Builds a dunegon tile set built from several large rooms with hallways connecting each room to every other room using
// the midpoint of the rooms as the origin of the hallways. hallways are right angles
// in small map sizes, tends to build a big lumpy open room
// there's no guarantee that the rooms won't overlap
// the maps generated are guaranteed to be valid (no inaccessible tiles)
export function buildRoomsAndHallways(
  config?: RoomsAndHallwaysConfig,
): Map<string, Coords> {
  if (!config) {
    config = defaultRoomsAndHallways;
  }

  const numRooms = getRandomInt(config.minRooms, config.maxRooms);
  const width = getRandomInt(config.minWidth, config.maxWidth);
  const height = getRandomInt(config.minHeight, config.maxHeight);

  // a level consists of an unordered Map of (coordKey => coords) which represents the empty tiles
  let tiles = new Map<string, Coords>();
  let midpoints = new Array();

  for (let i = 0; i < numRooms; i++) {
    // randomly generate origin point of room (top left)
    const originX = getRandomInt(1, width - 2);
    const originY = getRandomInt(1, height - 2);
    let room = buildRoom(config, originX, originY);
    midpoints.push(room.midpoint);
    tiles = new Map([...tiles, ...room.tiles]);
  }

  // draw hallways between midpoints
  for (let i = 0; i < midpoints.length; i++) {
    for (let j = 0; j < midpoints.length; j++) {
      if (i === j) continue;
      let midpoint1 = midpoints[i];
      let midpoint2 = midpoints[j];

      // find the midpoint with the least x coord, start iterating from there to the next midpoint adding tiles
      // then iterate from that midpoint's Y to the next midpoint's Y
      let midpointWithLeastX =
        midpoint1.x < midpoint2.x ? midpoint1 : midpoint2;
      let leastX = midpoint1.x < midpoint2.x ? midpoint1.x : midpoint2.x;
      let greatestX = midpoint1.x < midpoint2.x ? midpoint2.x : midpoint1.x;
      let leastY = midpoint1.y < midpoint2.y ? midpoint1.y : midpoint2.y;
      let greatestY = midpoint1.y < midpoint2.y ? midpoint2.y : midpoint1.y;

      for (let k = 1; leastX + k <= greatestX; k++) {
        tiles.set(coordsToKey({ x: leastX + k, y: midpointWithLeastX.y }), {
          x: leastX + k,
          y: midpointWithLeastX.y,
        });
      }

      for (let k = 1; leastY + k <= greatestY; k++) {
        tiles.set(coordsToKey({ x: greatestX, y: leastY + k }), {
          x: greatestX,
          y: leastY + k,
        });
      }
    }
  }

  return tiles;
}

function buildRoom(
  config: RoomsAndHallwaysConfig,
  originX: number,
  originY: number,
) {
  let tiles = new Map<string, Coords>();

  const w = getRandomInt(config.minRoomWidth, config.maxRoomWidth);
  const h = getRandomInt(config.minRoomHeight, config.maxRoomHeight);

  // add room to tile set
  for (let i = 1; i < h; i++) {
    for (let j = 2; j < w; j++) {
      tiles.set(coordsToKey({ x: originX + j, y: originY + i }), {
        x: originX + j,
        y: originY + i,
      });
    }
  }

  let midpoint = {
    x: Math.floor(originX + w / 2),
    y: Math.floor(originY + h / 2),
  };

  // place them by adding their coords to the set
  return { tiles: tiles, midpoint: midpoint };
}
