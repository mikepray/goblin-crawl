import {
  meleeActor,
} from "./combat";
import { handleDialogActions } from "./dialog";
import { dungeonHeight, dungeonWidth } from "./game";
import { ascend, descend } from "./levels";
import {
  Actor,
  ConversationBranch,
  Coords,
  CoordsMap,
  Creature,
  Game,
  InputKey,
  Item,
  MovementDirection,
  Shout,
} from "./types";
import { branchLevelToKey, coordsToKey, CoordsUtil, getCorpse } from "./utils";

export function movePlayer(game: Game, nextInput: any) {
  if (nextInput === InputKey.ESCAPE) {
    game.dialogMode = "game";
    game.activeDialog = undefined;
    game.interactingActor = undefined;
    game.isScreenDirty = true;
    game.dialogPointer = -1;
    return game;
  }


  if (game.dialogMode === "game") {
    let playerMove: Coords = { x: 0, y: 0 };
    if (nextInput) {
      if (nextInput === ">") {
        // get feature at coords
        let featureAtTile = game.features.get(coordsToKey({ ...game.player }));
        if (featureAtTile && featureAtTile.name === "Downstairs") {
          // descend level
          // take an extra turn
          game.turnCount++;
          return descend(game, {
            branchName: "D",
            level: game.currentBranchLevel.level + 1,
          });
        } else {
          game.messages.push(
            "Press > to go downstairs while standing on a > tile"
          );
          game.isScreenDirty = true;
          return game;
        }
      } else if (nextInput === "<") {
        // get feature at coords
        let featureAtTile = game.features.get(coordsToKey({ ...game.player }));
        if (featureAtTile && featureAtTile.name === "Upstairs") {
          // ascend level
          // get parent level
          let parentBranch = game.levels.get(
            branchLevelToKey(game.currentBranchLevel)
          )?.parentLevel;
          if (parentBranch) {
            // take an extra turn
            game.turnCount++;
            return ascend(game, { ...parentBranch });
          }
        } else {
          game.messages.push(
            "Press < to go upstairs while standing on a < tile"
          );
          game.isScreenDirty = true;
          return game;
        }
      } else if (nextInput === InputKey.UP || nextInput === "k") {
        playerMove.y--;
      } else if (nextInput === InputKey.DOWN || nextInput === "j") {
        playerMove.y++;
      } else if (nextInput === InputKey.LEFT || nextInput === "h") {
        playerMove.x--;
      } else if (nextInput === InputKey.RIGHT || nextInput === "l") {
        playerMove.x++;
      } else if (nextInput === "y") {
        // diagonal up left
        playerMove.x--;
        playerMove.y--;
      } else if (nextInput === "u") {
        // diagonal up right
        playerMove.x++;
        playerMove.y--;
      } else if (nextInput === "b") {
        // diagonal down left
        playerMove.x--;
        playerMove.y++;
      } else if (nextInput === "n") {
        // diagonal down right
        playerMove.x++;
        playerMove.y++;
      } else if (nextInput === ".") {

        // wait one turn
      } else if (nextInput === "^") {
        let featureAtTile = game.features.get(coordsToKey({ ...game.player }));
        if (featureAtTile && featureAtTile.glyph === "^") {
          game.messages.push("You pray to Meggled");
          let item = removeLastItemFromFloorStack(game, { ...game.player });
          if (item?.name === "skrunt egg") {
            game.messages.push(
              "The skrunt egg is engulfed in green flame. Meggled accepts your sacrifice!"
            );
          } else if (item) {
            putItemOnFloorStack(game, item);
            game.messages.push("Meggled does not accept this as a sacrifice!");
          }
        } else {
          game.messages.push(
            "There's no altar here. Press ^ to sacrifice and pray at altars"
          );
          game.isScreenDirty = true;
          return game;
        }
      } else if (nextInput === "g") {
        let item = removeLastItemFromFloorStack(game, { ...game.player });
        if (item) {
          game.player.inventory?.push(item);
          game.messages.push(`You pick up the ${item.name}`);
          game.turnCount++;
        } else if (!game.items.get(coordsToKey({ ...game.player }))) {
          game.messages.push("There's nothing on the ground here...");
        }
        game.isScreenDirty = true;
      } else if (nextInput === "i") {
        game.dialogMode = "inventory";
        game.isScreenDirty = true;
        return game;
      } else if (nextInput === "?") {
        game.messages.push(
          "You are the @ symbol, arrow keys and vim keys move, period waits one turn, < and > go up and down stairs. Move into other creatures to interact or attack\ni for inventory, g to interact with what's on the floor"
        );
        game.isScreenDirty = true;
        return game;
      } else {
        // unrecognized command
        return game;
      }

      // move player
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
            if ((subjectCreature.hp || 0) < 0) {
              if ((subjectCreature.hp || 0) <= 0) {
                // remove creature
                game.actors.delete(coordsToKey({...subjectCreature}));
                // add corpse
                game.features.set(coordsToKey({...subjectCreature}), {
                  ...getCorpse(subjectCreature.x, subjectCreature.y, subjectCreature.glyph, subjectCreature.name)
                })
              }
            }
            
            game.isScreenDirty = true;
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
                game.player
              );
              game.actors.set(
                coordsToKey({ x: subjectCreature.x, y: subjectCreature.y }),
                subjectCreature
              );

              game.messages.push(
                `You swap places with${
                  subjectCreature.useDefiniteArticle ? " the" : ""
                } ${subjectCreature.name}`
              );
              game.turnCount++;
              game.isScreenDirty = true;
            } else {
              game.messages.push(
                `${subjectCreature.useDefiniteArticle ? "The " : ""}${
                  subjectCreature.name
                }cannot move out of your way`
              );
            }

            if (subjectCreature.conversationBranches) {
              const conversationBranch =
                subjectCreature.conversationBranches[
                  Math.floor(
                    Math.random() * subjectCreature.conversationBranches.length
                  )
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

          game.turnCount++;
          game.isScreenDirty = true;
        }
      }

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
              `${itemsAtTile[i].name}${i + 1 < itemsAtTile.length ? ", " : ""}`
            );
          }
        }
        game.messages.push(out);
        game.isScreenDirty = true;
      } else if (featureAtTile) {
        game.messages.push(`here: ${featureAtTile?.description}`);
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
                game = moveActor(game, creature, moveDelta);
                // check dead creature
                // this is used for npcs attacking each other
                if (creature.name !== "player" && (creature.hp || 0) <= 0) {
                  // remove creature
                  game.actors.delete(actorsArrayRef[i]);
                  // add corpse
                  game.features.set(coordsToKey({...actor}), {
                    ...getCorpse(actor.x, actor.y, actor.glyph, actor.name)
                  })
                }
              } else {
                // creature is hostile, move to attack player
                let deconflictWith = new Map<string, Actor>();
                for (const [tileKey, actor] of game.actors) {
                  // make a list of other creatures to avoid pathing through them.
                  // allow player and current actor, (target and start tiles respectively)
                  //  so that those tiles can be considered in the pathing algorithm
                  if (tileKey !== coordsToKey({ ...game.player }) && tileKey !== coordsToKey({...creature})) {
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
                    deconflictWith
                  )
                );
              }
            }
          }
        }
      }
    }
  } else if (game.dialogMode === "dialog" && game.activeDialog) {
    handleDialogActions(game, nextInput);
  } else if (game.dialogMode === "inventory") {
    if (nextInput) {
      // inventory
      // if the next input is a number
      if (
        game.player.inventory &&
        Number.isInteger(Number.parseInt(nextInput))
      ) {
        // if the number is a valid choice, set the pointer to it
        let num = Number.parseInt(nextInput);
        if (num <= game.player.inventory.length) {
          game.dialogPointer = num;
        }
      } else if (game.player.inventory && nextInput) {
        if (nextInput === "d") {
          if (!game.dialogPointer || game.dialogPointer < 1) {
            game.messages.push(
              "Use the number keys to select an item. e to eat, d to drop. Esc to close"
            );
          } else if (
            !game.player.inventory ||
            game.player.inventory.length === 0
          ) {
            game.messages.push("You have nothing...");
          } else {
            // drop the inventory item
            let item = game.player.inventory[game.dialogPointer - 1];
            removeSelectedItemFromPlayerInventory(game);
            putItemOnFloorStack(game, item);
            game.messages.push(`You dropped the ${item.name}`);
            game.turnCount++;
          }
        } else if (nextInput === "e") {
          // eat the inventory item
          let item = game.player.inventory[game.dialogPointer - 1];
          if (item.edible) {
            removeSelectedItemFromPlayerInventory(game);
            game.messages.push(`You ate the ${item.name}. Delicious!`);
            game.turnCount++;
          } else {
            game.messages.push(`You cannot eat the ${item.name}!`);
          }
        }
      }
      game.isScreenDirty = true;
    }
  }

  return game;
}

export const moveActor = (
  game: Game,
  actor: Actor,
  moveDelta?: Coords,
  nextCoords?: Coords
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
    if (subjectCreature.name === "player") {
      // attack player
      game = meleeActor(game, actor, subjectCreature);
      if ((game.player.hp || 0) <= 0) {
        game.messages.push("You die...");
        game.gameOver = true;
      }
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

type PathfindingNode = {
  coords: Coords;
  dist: number;
  shortestPathAncestor?: PathfindingNode;
};

// use Dijkstra's's algorithm to find the next most optimal move (one tile over) for pathfinding from starting tile to the target tile
export const getNextMoveToTarget = (
  tiles: CoordsMap,
  startingTile: Coords,
  targetTile: Coords,
  deconflictWith: Map<string, Actor> | undefined // actors to deconflict with
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
        unvisitedTiles.set(tileCoordsKey, { coords: tileCoords, dist: 0 });
      } else {
        // otherwise set the distance to infinity
        unvisitedTiles.set(tileCoordsKey, {
          coords: tileCoords,
          dist: Infinity,
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
          })
        );
        if (neighbor) {
          // all edges are length 1 because this is a grid-based game, so we don't need to check edge length
          const prevNeighborDist = neighbor.dist;
          neighbor.dist = Math.min(currentNode.dist + 1, neighbor.dist);
          if (neighbor.dist !== prevNeighborDist) {
            // update the neighbor's shortest path ancestor node if the neighbor was updated
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
      startingTile
    )
  ) {
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


// Depth-first search of conversation branch tree looking for a branch by the 'creatureSpeaks' string
// returns undefined if no branch was found
export function findConversationBranchByCreatureSpeaks(
  conversationBranches: ConversationBranch[] | undefined,
  creatureSpeaks: string
): ConversationBranch | undefined {
  if (conversationBranches !== undefined && conversationBranches.length > 0) {
    for (const seek of conversationBranches) {
      if (seek.creatureSpeaks === creatureSpeaks) {
        return seek;
      }
      let conversationBranchFound = findConversationBranchByCreatureSpeaks(
        seek.conversationBranches,
        creatureSpeaks
      );
      if (conversationBranchFound !== undefined) {
        return conversationBranchFound;
      }
    }
  }
  return undefined;
}

function putItemOnFloorStack(game: Game, item: Item) {
  // put the item on the floor in the tile stack
  let itemStack = game.items.get(coordsToKey({ ...game.player }));
  if (!itemStack) {
    itemStack = new Array<Item>();
  }
  itemStack.push(item);
  game.items.set(coordsToKey({ ...game.player }), itemStack);
}

function removeSelectedItemFromPlayerInventory(game: Game) {
  let newInventoryListWithoutItem = new Array<Item>();
  if (game.player.inventory) {
    // rebuild the list without the item
    for (let i = 0; i < game.player.inventory.length; i++) {
      if (i !== game.dialogPointer - 1) {
        newInventoryListWithoutItem.push(game.player.inventory[i]);
      }
    }
  }
  game.player.inventory = newInventoryListWithoutItem;
}

// attempts to remove the item and returns true if it did
export function removeItemFromPlayerInventory(
  game: Game,
  itemNameToRemove: string
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
  itemNameToRemove: string
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

function removeLastItemFromFloorStack(
  game: Game,
  coords: Coords
): Item | undefined {
  let itemsAtTile = game.items.get(coordsToKey(coords));
  // get the last in the list
  let item = itemsAtTile?.shift();
  if (item) {
    game.items.set(coordsToKey(coords), itemsAtTile!);
  }
  return item;
}
