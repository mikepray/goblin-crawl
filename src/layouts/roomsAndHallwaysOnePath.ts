import { defaultRoomsAndHallways } from "../branches";
import {
  Coords,
  Direction,
  DIRECTIONS,
  RoomsAndHallwaysConfig,
  W,
} from "../types";
import { coordsToKey, getRandomInt } from "../utils";

function getNextDirection() {
  const options = DIRECTIONS.filter(
    (d) => d.name === "S" || d.name === "E" || d.name === "N",
  );
  return options[getRandomInt(0, options.length - 1)];
}

export function buildRoomsAndHallwaysOnePath(
  config?: RoomsAndHallwaysConfig,
): Map<string, Coords> {
  if (!config) {
    config = defaultRoomsAndHallways;
  }

  const numRooms = getRandomInt(config.minRooms, config.maxRooms);

  // a level consists of an unordered Map of (coordKey => coords) which represents the empty tiles
  let tiles = new Map<string, Coords>();
  let midpoints = new Array();

  let direction = W;
  let nextRoomOriginX = getRandomInt(1, 10 - 2);
  let nextRoomOriginY = getRandomInt(1, 10 - 2);

  for (let j = 0; j < numRooms; j++) {
    let room = buildRoom(config, nextRoomOriginX, nextRoomOriginY);
    midpoints.push(room.midpoint);
    tiles = new Map([...tiles, ...room.tiles]);
    direction = getNextDirection();
    // let hallwayLen = getRandomInt(room.w / 2 + 2, room.w / 2 + 12) + 4; // from the midpoint

    if (j < numRooms - 1) {
      let lastHallwayCoords = { x: 0, y: 0 };
      for (let i = 0; i < Math.max(room.w / 2, room.h / 2) + 5; i++) {
        const coords = {
          x: room.midpoint.x + i * direction.xMod,
          y: room.midpoint.y + i * direction.yMod,
        };
        tiles.set(coordsToKey(coords), coords);
        lastHallwayCoords = coords;
      }

      if (direction.name === "E") {
        nextRoomOriginX = lastHallwayCoords.x - 1;
        nextRoomOriginY = lastHallwayCoords.y - 4;
      } else if (direction.name === "S") {
        nextRoomOriginX = lastHallwayCoords.x - 4;
        nextRoomOriginY = lastHallwayCoords.y;
      } else if (direction.name === "N") {
        nextRoomOriginX = lastHallwayCoords.x - 4;
        nextRoomOriginY = lastHallwayCoords.y;
      }
    }
  }

  return tiles;
}

// top left origin
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
  return { tiles: tiles, midpoint: midpoint, w: w, h: h };
}
