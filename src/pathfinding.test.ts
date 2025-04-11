import { describe, expect, it } from 'vitest';
import { Coords } from './types';
import { coordsToKey } from './utils';
import { getNodeWithLeastDistance, getNextMoveToTarget } from './move';

describe('getNodeWithLeastDistance', () => {
  it('should return undefined for empty map', () => {
    const nodes = new Map();
    const result = getNodeWithLeastDistance(nodes);
    expect(result).toBeUndefined();
  });

  it('should return undefined when all nodes have Infinity distance', () => {
    const nodes = new Map();
    nodes.set(coordsToKey({x: 0, y: 0}), { coords: {x: 0, y: 0}, dist: Infinity });
    nodes.set(coordsToKey({x: 1, y: 1}), { coords: {x: 1, y: 1}, dist: Infinity });
    const result = getNodeWithLeastDistance(nodes);
    expect(result).toBeUndefined();
  });

  it('should return node with minimum distance', () => {
    const nodes = new Map();
    nodes.set(coordsToKey({x: 0, y: 0}), { coords: {x: 0, y: 0}, dist: 3 });
    nodes.set(coordsToKey({x: 1, y: 1}), { coords: {x: 1, y: 1}, dist: 4 });
    nodes.set(coordsToKey({x: 2, y: 2}), { coords: {x: 2, y: 2}, dist: 1 });
    const result = getNodeWithLeastDistance(nodes);
    expect(result).toEqual({ coords: {x: 2, y: 2}, dist: 1 });
  });
});

describe('getNextMoveToTarget', () => {
  it('should return starting tile if target is unreachable', () => {
    // Create a map with a wall between start and target
    const tiles = new Map<string, Coords>();
    tiles.set(coordsToKey({x: 0, y: 0}), {x: 0, y: 0}); // start
    tiles.set(coordsToKey({x: 2, y: 0}), {x: 2, y: 0}); // target
    // No tile at {x: 1, y: 0} creates a wall

    const result = getNextMoveToTarget(tiles, {x: 0, y: 0}, {x: 2, y: 0}, undefined);
    expect(result).toEqual({x: 0, y: 0});
  });

  it('should find direct path when available', () => {
    // Create a straight line path
    const tiles = new Map<string, Coords>();
    tiles.set(coordsToKey({x: 0, y: 0}), {x: 0, y: 0}); // start
    tiles.set(coordsToKey({x: 1, y: 0}), {x: 1, y: 0}); // middle
    tiles.set(coordsToKey({x: 2, y: 0}), {x: 2, y: 0}); // target

    const result = getNextMoveToTarget(tiles, {x: 0, y: 0}, {x: 2, y: 0}, undefined);
    expect(result).toEqual({x: 1, y: 0});
  });

  it('should find path around obstacles', () => {
    // Create a path that requires going around
    const tiles = new Map<string, Coords>();
    tiles.set(coordsToKey({x: 0, y: 0}), {x: 0, y: 0}); // start
    tiles.set(coordsToKey({x: 0, y: 1}), {x: 0, y: 1}); // path
    tiles.set(coordsToKey({x: 1, y: 1}), {x: 1, y: 1}); // path
    tiles.set(coordsToKey({x: 2, y: 1}), {x: 2, y: 1}); // path
    tiles.set(coordsToKey({x: 2, y: 0}), {x: 2, y: 0}); // target

    const result = getNextMoveToTarget(tiles, {x: 0, y: 0}, {x: 2, y: 0}, undefined);
    expect(result).toEqual({x: 1, y: 1});
  });

  it('should return current position when already adjacent to target', () => {
    const tiles = new Map<string, Coords>();
    tiles.set(coordsToKey({x: 0, y: 0}), {x: 0, y: 0}); // start
    tiles.set(coordsToKey({x: 1, y: 0}), {x: 1, y: 0}); // target

    const result = getNextMoveToTarget(tiles, {x: 0, y: 0}, {x: 1, y: 0}, undefined);
    expect(result).toEqual({x: 1, y: 0});
  });
}); 