import assert from "assert";
import { dungeonHeight, dungeonWidth } from "./game";
import {
  Actor,
  Coords,
  CoordsMap,
  Creature,
  Game,
  MovementDirection,
  Player,
  Shout,
} from "./types";
import { CoordsUtil, coordsToKey } from "./utils";

export const moveActor = (
  game: Game,
  actor: Actor,
  moveDelta?: Coords,
  nextCoords?: Coords,
): Game => {
  const previousPosition = { ...actor };
  let nextPosition;
  if (moveDelta) {
   nextPosition = CoordsUtil.add(previousPosition, moveDelta);
  } else if (nextCoords) {
    nextPosition = nextCoords;
  } else {
    return game;
  }
  const nextPositionKey = coordsToKey(nextPosition);
  const whatsAtNextPosition = game.actors.get(nextPositionKey);
  const subjectCreature = whatsAtNextPosition as Creature;
  // interact with adjacent actor (bump)
  if (
    whatsAtNextPosition !== undefined &&
    game.actors.has(nextPositionKey) &&
    "isHostile" in whatsAtNextPosition
  ) {
    if (subjectCreature.name === "player") {
      // attack player
      game.messages.push(
        "the creature tries to attack you, but the programmer hasn't coded that yet!"
      );
      return game;
    }
  }

  // prevent move on boundary collision
  if (
    nextPosition.x > dungeonWidth - 1 ||
    nextPosition.x < 0 ||
    nextPosition.y > dungeonHeight - 1 ||
    nextPosition.y < 0
  ) {
    return game;
  }
  // prevent move on wall collision
  if (!game.tiles.has(nextPositionKey)) {
    return game;
  }
  // prevent move into other actors
  if (game.actors.has(nextPositionKey)) {
    return game;
  }
  actor.x = nextPosition.x;
  actor.y = nextPosition.y;

  game.actors.delete(coordsToKey(previousPosition));
  game.actors.set(coordsToKey(nextPosition), actor);

  // shouting
  if (
    "shoutChance" in actor &&
    "shouts" in actor &&
    Math.floor(Math.random() * 1000) <= (actor.shoutChance as number)
  ) {
    const shout = Math.floor(
      Math.random() * (actor.shouts as Array<Shout>).length
    );
    game.messages.push(
      `{grey-fg}${(actor.shouts as Array<Shout>)[shout].shout}{/}`
    );
  }

  game.isScreenDirty = true;
  return game;
};

export const getWanderingMoveDelta = (creature: Creature): Coords => {
  const moveDelta: Coords = { x: 0, y: 0 };

  if (creature.movementType !== "WANDERING") {
    return moveDelta;
  }

  if (!creature.wanderingDirection || Math.random() < 0.2) {
    const randomDirection = Math.floor(Math.random() * 5);
    creature.wanderingDirection = randomDirection as MovementDirection;
  }

  switch (creature.wanderingDirection) {
    case MovementDirection.N:
      moveDelta.y--;
      break;
    case MovementDirection.S:
      moveDelta.y++;
      break;
    case MovementDirection.E:
      moveDelta.x++;
      break;
    case MovementDirection.W:
      moveDelta.x--;
      break;
    case MovementDirection.STATIONARY:
      // No movement
      break;
  }

  return moveDelta;
};

type PathfindingNode = { coords: Coords; dist: number, shortestPathAncestor?: PathfindingNode };

// use Dijkstra's's algorithm to find the next most optimal move (one tile over) for pathfinding from starting tile to the target tile
export const getNextMoveToTarget = (
  tiles: CoordsMap,
  startingTile: Coords,
  targetTile: Coords,
): Coords | undefined => {
    // If we're already adjacent to the target, return the target's coords
  if(
    Math.abs(targetTile.x - startingTile.x) <= 1 && 
    Math.abs(targetTile.y - startingTile.y) <= 1) {
  return targetTile;
}

  // a map of coordinates and their distance from the start value (attacking creature)
  let unvisitedTiles = new Map<string, PathfindingNode>();
  
  // iterate over all the map tiles
  for (const [tileCoordsKey, tileCoords] of tiles) {
    // starting node is the creature's starting position
    if (tileCoordsKey === coordsToKey(startingTile)) {
      // set the distance of the starting node to zero
      unvisitedTiles.set(tileCoordsKey, { coords: tileCoords, dist: 0 });
    } else {
      // otherwise set the distance to infinity
      unvisitedTiles.set(tileCoordsKey, { coords: tileCoords, dist: Infinity });
    }
  }
  
  let currentNode;
  while (unvisitedTiles.size > 0) {
    // find node with smallest distance
    // if there are no unvisited nodes or if all nodes have distance of infinity, the target is unreachable
    currentNode = getNodeWithLeastDistance(unvisitedTiles);
    if (currentNode === undefined) {
      break;
    } else if (CoordsUtil.equals(currentNode.coords, targetTile)) {
      // target found
      break;
    }

    // iterate through the neighbors to all sides of the current node
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        if (i === 0 && j === 0) continue; // Skip the current node
        // update the distances of the unvisited neighbor nodes
        let neighbor = unvisitedTiles.get(coordsToKey({x: currentNode.coords.x + i, y: currentNode.coords.y + j}));
        if (neighbor) {
          // all edges are length 1 because this is a grid-based game, so we don't need to check edge length
          const prevNeighborDist = neighbor.dist;
          neighbor.dist = Math.min(currentNode.dist + 1, neighbor.dist); 
          if (neighbor.dist !== prevNeighborDist) {
            // update the neighbor's shortest path ancestor node if the neighbor was updated
            neighbor.shortestPathAncestor = {...currentNode};
          }
        }
      }
    }

    // delete the current node from the unvisited tile map
    unvisitedTiles.delete(coordsToKey(currentNode.coords));
  }

  if (!currentNode || !CoordsUtil.equals(currentNode.coords, targetTile)) {
    // target is unreachable
    return startingTile;
  }
  
  if (!currentNode.shortestPathAncestor) {
    // we are already 1 space away from the target
    return currentNode.coords;
  }
  
  // walk the tree of shortest path ancestors to get the vector of shortest path nodes,
  // starting at the currentNode which will be the target, or undefined if the target is unreachable
  let shortestAncestorNode: PathfindingNode | undefined = currentNode;
  while (shortestAncestorNode && 
    shortestAncestorNode.shortestPathAncestor && 
    !CoordsUtil.equals(shortestAncestorNode.shortestPathAncestor.coords, startingTile) ) {
    shortestAncestorNode = shortestAncestorNode.shortestPathAncestor;
  }
  return shortestAncestorNode?.coords;
};

// returns the node with the least distance or undefined if every node distance is Infinity
// this would be more optimal as a heap/priority queue
export function getNodeWithLeastDistance(
  nodes: Map<string, PathfindingNode>
): PathfindingNode | undefined {
  let returnValue = undefined;
  let minDist = Infinity;
  for (const [nodeCoords, coordsDist] of nodes) {
    if (coordsDist.dist < minDist) {
      returnValue = { ...coordsDist };
      minDist = coordsDist.dist;
    }
  }
  return returnValue;
}
