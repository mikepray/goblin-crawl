import { meleeActor } from "./combat";
import { dungeonHeight, dungeonWidth } from "./game";
import {
  Actor,
  ConversationBranch,
  Coords,
  CoordsMap,
  Creature,
  Game,
  Item,
  MovementDirection,
  Shout,
} from "./types";
import { coordsToKey, CoordsUtil, getCorpse, getRandomInt } from "./utils";
import { getKoboldPhrase } from "./words";

export function doPlayerMove(game: Game, playerMove: Coords) {
  if (playerMove.x !== 0 || playerMove.y !== 0) {
    const previousPlayerPosition = { ...game.player };
    const nextPosition = CoordsUtil.add(previousPlayerPosition, playerMove);
    const nextPositionKey = coordsToKey(nextPosition);
    const whatsAtNextPosition = game.actors.get(nextPositionKey);

    // player and creature dialog activation and swap logic
    if (
      whatsAtNextPosition !== undefined &&
      game.actors.has(nextPositionKey) &&
      "isHostile" in whatsAtNextPosition
    ) {
      const subjectCreature = whatsAtNextPosition as Creature;
      if (subjectCreature.isHostile) {
        // attack
        game = meleeActor(game, game.player, subjectCreature);
        // check for dead enemies
        if ((subjectCreature.currentHp || 0) <= 0) {
          actorDeath(game, subjectCreature);
        }
        game.isScreenDirty = true;
        game.gameTurns++;
      } else {
        // swap player and creature
        if (subjectCreature.movementType !== "CANNOT_MOVE") {
          let creatureX = subjectCreature.x;
          let creatureY = subjectCreature.y;
          game.actors.delete(coordsToKey({ x: creatureX, y: creatureY }));
          game.actors.delete(coordsToKey(previousPlayerPosition));
          subjectCreature.x = game.player.x;
          subjectCreature.y = game.player.y;
          game.player.x = creatureX;
          game.player.y = creatureY;
          subjectCreature.wasSwappedByPlayer = true;
          game.actors.set(
            coordsToKey({ x: game.player.x, y: game.player.y }),
            game.player,
          );
          game.actors.set(
            coordsToKey({ x: subjectCreature.x, y: subjectCreature.y }),
            subjectCreature,
          );

          game.messages.push(
            `You swap places with${
              subjectCreature.useDefiniteArticle ? " the" : ""
            } ${subjectCreature.name}`,
          );
          game.isScreenDirty = true;
        } else {
          game.messages.push(
            `${subjectCreature.useDefiniteArticle ? "The " : ""}${
              subjectCreature.name
            } cannot move out of your way`,
          );
        }

        if (subjectCreature.conversationBranches) {
          const conversationBranch =
            subjectCreature.conversationBranches[
              getRandomInt(0, subjectCreature.conversationBranches.length)
            ];
          game.activeDialog = conversationBranch;
          game.interactingActor = subjectCreature;
          game.dialogMode = "dialog";
        } else {
          // creature doesn't speak
        }
      }
    } else if (
      whatsAtNextPosition === undefined ||
      !game.actors.has(nextPositionKey)
    ) {
      // player move logic
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

      game.player.x = nextPosition.x;
      game.player.y = nextPosition.y;

      game.actors.delete(coordsToKey(previousPlayerPosition));
      game.actors.set(coordsToKey(nextPosition), game.player);

      game.isScreenDirty = true;
      game.gameTurns++;

      // show what the player is standing on
      let itemsAtTile = game.items.get(coordsToKey({ ...game.player }));
      let featureAtTile = game.features.get(coordsToKey({ ...game.player }));
      if (itemsAtTile && itemsAtTile.length > 0) {
        let out = "";
        out = out.concat(`here: ${itemsAtTile[0].name}.`);
        if (itemsAtTile.length > 1) {
          out = out.concat(` also: `);
          for (let i = 1; i < itemsAtTile.length; i++) {
            out = out.concat(
              `${itemsAtTile[i].name}${i + 1 < itemsAtTile.length ? ", " : ""}`,
            );
          }
        }
        game.messages.push(out);
        game.isScreenDirty = true;
      } else if (featureAtTile) {
        game.messages.push(
          `here: ${featureAtTile.color ? featureAtTile.color : ""}${featureAtTile?.name}: ${featureAtTile?.description}{/}`,
        );
      }
    }
  }
}

// move actors on the level
export function doGameTurn(game: Game) {
  game.turnCount++;
  // heal player for hp regen every some turns
  if (
    game.turnCount % game.player.hpRegenEveryNTurns === 0 &&
    game.player.hpRegen
  ) {
    game.player.currentHp = Math.min(
      game.player.maxHp,
      game.player.currentHp + game.player.hpRegen,
    );
  }
  // iterate through the list of actors and move each one
  // uses an array ref of the game actors to prevent concurrent modifications
  // each actor should move atomically so that subsequent actors don't path through them
  let actorsArrayRef = Array.from(game.actors.keys());
  for (let i = 0; i < actorsArrayRef.length; i++) {
    let actor = game.actors.get(actorsArrayRef[i]);
    if (actor && actor.name !== "player") {
      if ("movementType" in actor) {
        const creature = actor as Creature;
        if (creature.movementType === "WANDERING") {
          if (!creature.isHostile) {
            let moveDelta = { x: 0, y: 0 };
            if (!creature.wasSwappedByPlayer) {
              moveDelta = getWanderingMoveDelta(creature);
            } else {
              creature.wasSwappedByPlayer = false;
            }
            // check dead creature
            // this is used for npcs attacking each other
            if (creature.name !== "player" && (creature.currentHp || 0) <= 0) {
              actorDeath(game, actor);
            } else {
              game = moveActor(game, creature, moveDelta);
            }
          } else {
            // creature is hostile, move to attack player
            let deconflictWith = new Map<string, Actor>();
            for (const [tileKey, actor] of game.actors) {
              // make a list of other creatures to avoid pathing through them.
              // allow player and current actor, (target and start tiles respectively)
              //  so that those tiles can be considered in the pathing algorithm
              if (
                tileKey !== coordsToKey({ ...game.player }) &&
                tileKey !== coordsToKey({ ...creature })
              ) {
                deconflictWith.set(tileKey, actor);
              }
            }

            game = moveActor(
              game,
              creature,
              undefined,
              getNextMoveToTarget(
                game.tiles,
                creature,
                game.player,
                deconflictWith,
              ),
            );
          }
        }
      }
    }
  }
}

/**
 * Removes actor and replaces them with a corpse
 *
 * @param {Actor} actor - The character beind put down
 * @param {Game} game - game board
 */
export const actorDeath = (game: Game, actor: Actor) => {
  const coords = coordsToKey({ ...actor });
  // drop actor inventory
  if (actor.inventory && actor.inventory.length > 0) {
    for (const item of actor.inventory) {
      putItemOnFloorStackByCoords(game, coords, item);
    }
  }
  // drop actor slots
  if (actor.slots) {
    if (actor.slots.body) {
      putItemOnFloorStackByCoords(game, coords, actor.slots.body);
    }
    if (actor.slots.feet) {
      putItemOnFloorStackByCoords(game, coords, actor.slots.feet);
    }
    if (actor.slots.hands) {
      putItemOnFloorStackByCoords(game, coords, actor.slots.hands);
    }
    if (actor.slots.head) {
      putItemOnFloorStackByCoords(game, coords, actor.slots.head);
    }
    if (actor.slots.neck) {
      putItemOnFloorStackByCoords(game, coords, actor.slots.neck);
    }
    if (actor.slots.shield) {
      putItemOnFloorStackByCoords(game, coords, actor.slots.shield);
    }
    if (actor.slots.weapon) {
      putItemOnFloorStackByCoords(game, coords, actor.slots.weapon);
    }
  }
  // remove actor
  game.messages.push(`The ${actor.name} dies`);
  game.items.get(coords);
  game.actors.delete(coords);
  // add corpse only if no other feature
  // (e.g., don't vaporize staircases)
  if (!game.features.get(coords)) {
    game.features.set(coords, {
      ...getCorpse(actor.x, actor.y, actor.glyph, actor.name),
    });
  } else {
    game.messages.push(`The corpse of the ${actor.name} vaporizes!`);
  }
  // gain player xp
  game.player.XP += actor.level * 100;
};

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
    "isHostile" in actor
  ) {
    if (subjectCreature.name === "player" && actor.isHostile) {
      // attack player
      game = meleeActor(game, actor, subjectCreature);
      if ((game.player.currentHp || 0) <= 0) {
        game.messages.push("You die...");
        game.gameOver = true;
      }
      game.isScreenDirty = true;
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
    getRandomInt(1, 1000) <= (actor.shoutChance as number)
  ) {
    if ("shoutGenerator" in actor && actor.shoutGenerator) {
      if (actor.shoutGenerator === "kobold") {
        game.messages.push(`{grey-fg}${getKoboldPhrase()}{/}`);
      }
    } else {
      const shout = getRandomInt(0, (actor.shouts as Array<Shout>).length);
      game.messages.push(
        `{grey-fg}${(actor.shouts as Array<Shout>)[shout].shout}{/}`,
      );
    }
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
    const randomDirection = getRandomInt(0, 5);
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

type PathfindingNode = {
  coords: Coords;
  dist: number;
  /** Diagonal steps taken while on the same row or column as the target (tie-breaker). */
  alignedDiagPenalty: number;
  shortestPathAncestor?: PathfindingNode;
};

// use Dijkstra's's algorithm to find the next most optimal move (one tile over) for pathfinding from starting tile to the target tile
export const getNextMoveToTarget = (
  tiles: CoordsMap,
  startingTile: Coords,
  targetTile: Coords,
  deconflictWith: Map<string, Actor> | undefined, // actors to deconflict with
): Coords | undefined => {
  // If we're already adjacent to the target, return the target's coords
  if (
    Math.abs(targetTile.x - startingTile.x) <= 1 &&
    Math.abs(targetTile.y - startingTile.y) <= 1
  ) {
    return targetTile;
  }

  // a map of coordinates and their distance from the start value (attacking creature)
  let unvisitedTiles = new Map<string, PathfindingNode>();

  // iterate over all the map tiles
  for (const [tileCoordsKey, tileCoords] of tiles) {
    if (!deconflictWith?.has(tileCoordsKey)) {
      // starting node is the creature's starting position
      if (tileCoordsKey === coordsToKey(startingTile)) {
        // set the distance of the starting node to zero
        unvisitedTiles.set(tileCoordsKey, {
          coords: tileCoords,
          dist: 0,
          alignedDiagPenalty: 0,
        });
      } else {
        // otherwise set the distance to infinity
        unvisitedTiles.set(tileCoordsKey, {
          coords: tileCoords,
          dist: Infinity,
          alignedDiagPenalty: 0,
        });
      }
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
        let neighbor = unvisitedTiles.get(
          coordsToKey({
            x: currentNode.coords.x + i,
            y: currentNode.coords.y + j,
          }),
        );
        if (neighbor) {
          const isDiagonal = i !== 0 && j !== 0;
          const onSameRankAsTarget =
            currentNode.coords.y === targetTile.y ||
            currentNode.coords.x === targetTile.x;
          const stepAlignedDiagPenalty =
            isDiagonal && onSameRankAsTarget ? 1 : 0;
          const candidateDist = currentNode.dist + 1;
          const candidatePenalty =
            currentNode.alignedDiagPenalty + stepAlignedDiagPenalty;
          const betterPath =
            candidateDist < neighbor.dist ||
            (candidateDist === neighbor.dist &&
              candidatePenalty < neighbor.alignedDiagPenalty);
          if (betterPath) {
            neighbor.dist = candidateDist;
            neighbor.alignedDiagPenalty = candidatePenalty;
            neighbor.shortestPathAncestor = { ...currentNode };
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
  while (
    shortestAncestorNode &&
    shortestAncestorNode.shortestPathAncestor &&
    !CoordsUtil.equals(
      shortestAncestorNode.shortestPathAncestor.coords,
      startingTile,
    )
  ) {
    shortestAncestorNode = shortestAncestorNode.shortestPathAncestor;
  }
  return shortestAncestorNode?.coords;
};

// returns the node with the least distance or undefined if every node distance is Infinity
// this would be more optimal as a heap/priority queue
export function getNodeWithLeastDistance(
  nodes: Map<string, PathfindingNode>,
): PathfindingNode | undefined {
  let best: PathfindingNode | undefined;
  let minDist = Infinity;
  let minPenalty = Infinity;
  let bestKey = "";

  for (const [nodeCoords, node] of nodes) {
    if (node.dist < minDist) {
      minDist = node.dist;
      minPenalty = node.alignedDiagPenalty;
      bestKey = nodeCoords;
      best = { ...node };
    } else if (node.dist === minDist && node.dist < Infinity) {
      if (node.alignedDiagPenalty < minPenalty) {
        minPenalty = node.alignedDiagPenalty;
        bestKey = nodeCoords;
        best = { ...node };
      } else if (
        node.alignedDiagPenalty === minPenalty &&
        (best === undefined || nodeCoords < bestKey)
      ) {
        bestKey = nodeCoords;
        best = { ...node };
      }
    }
  }
  return best;
}

// Depth-first search of conversation branch tree looking for a branch by the 'creatureSpeaks' string
// returns undefined if no branch was found
export function findConversationBranchByCreatureSpeaks(
  conversationBranches: ConversationBranch[] | undefined,
  creatureSpeaks: string,
): ConversationBranch | undefined {
  if (conversationBranches !== undefined && conversationBranches.length > 0) {
    for (const seek of conversationBranches) {
      if (seek.creatureSpeaks === creatureSpeaks) {
        return seek;
      }
      let conversationBranchFound = findConversationBranchByCreatureSpeaks(
        seek.conversationBranches,
        creatureSpeaks,
      );
      if (conversationBranchFound !== undefined) {
        return conversationBranchFound;
      }
    }
  }
  return undefined;
}

export function putItemOnFloorStackByCoords(
  game: Game,
  coords: string,
  item: Item,
) {
  // put the item on the floor in the tile stack
  let itemStack = game.items.get(coords);
  if (!itemStack) {
    itemStack = new Array<Item>();
  }
  itemStack.push(item);
  game.items.set(coords, itemStack);
}

export function putItemOnFloorStack(game: Game, item: Item) {
  putItemOnFloorStackByCoords(game, coordsToKey({ ...game.player }), item);
}

// attempts to remove the item and returns true if it did
export function removeItemFromPlayerInventory(
  game: Game,
  itemNameToRemove: string,
): boolean {
  const originalInventoryLength = game.player.inventory?.length || 0;
  let filteredItems = game.player.inventory?.filter((item: Item) => {
    item.name !== itemNameToRemove;
  });
  game.player.inventory = filteredItems;
  return (
    filteredItems !== undefined &&
    originalInventoryLength > filteredItems?.length
  );
}

// attempts to remove the item and returns true if it did
export function removeItemFromCreatureInventory(
  creature: Creature,
  itemNameToRemove: string,
): boolean {
  const originalInventoryLength = creature.inventory?.length || 0;
  let filteredItems = creature.inventory?.filter((item: Item) => {
    item.name !== itemNameToRemove;
  });
  creature.inventory = filteredItems;
  return (
    filteredItems !== undefined &&
    originalInventoryLength > filteredItems?.length
  );
}

export function removeLastItemFromFloorStack(
  game: Game,
  coords: Coords,
): Item | undefined {
  let itemsAtTile = game.items.get(coordsToKey(coords));
  // get the last in the list
  let item = itemsAtTile?.shift();
  if (item) {
    game.items.set(coordsToKey(coords), itemsAtTile!);
  }
  return item;
}
