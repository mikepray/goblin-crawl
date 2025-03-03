import { Coords } from "./types";

// Helper function to convert coordinates to a string key
export function coordsToKey(coords: Coords): string {
  return `${coords.x},${coords.y}`;
}

// Utility functions for working with coordinates
export const CoordsUtil = {
  add: (a: Coords, b: Coords): Coords => {
    return { x: a.x + b.x, y: a.y + b.y };
  },

  equals: (a: Coords, b: Coords): boolean => {
    return a.x === b.x && a.y === b.y;
  },
};
