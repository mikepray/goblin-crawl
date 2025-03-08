import { moveActor, getWanderingMoveDelta } from "./actors";
import { descend, ascend } from "./levels";
import { Game, InputKey, Coords, Creature, Item, Action } from "./types";
import { coordsToKey, branchLevelToKey } from "./utils";

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
          return descend(game, {
            branchName: "D",
            level: game.currentBranchLevel.level + 1,
          });
        } else {
          game.messages.push(
            "Press > to go downstairs while standing on a > tile"
          );
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
            return ascend(game, { ...parentBranch });
          }
        } else {
          game.messages.push(
            "Press < to go upstairs while standing on a < tile"
          );
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
            game.messages.push("Meggled accepts your sacrifice!");
          } else if (item) {
            putItemOnFloorStack(game, item);
            game.messages.push("Meggled does not accept this as a sacrifice!");
          }
        } else {
          game.messages.push(
            "There's no altar here. Press ^ to sacrifice and pray at altars"
          );
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
        return game;
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
        return game;
      }

      game.turnCount++;
      // move player first
      game = moveActor(game, game.player, playerMove);

      // show what the player is standing on
      let itemsAtTile = game.items.get(coordsToKey({ ...game.player }));
      let featureAtTile = game.features.get(coordsToKey({ ...game.player }));
      if (itemsAtTile && itemsAtTile.length > 0) {
        let out = "";
        out = out.concat(`(g)round: ${itemsAtTile[0].name}.`);
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

      // copy list to prevent concurrent modification
      const previousActorList = new Map(game.actors);

      previousActorList.forEach((actor) => {
        let moveDelta = { x: 0, y: 0 };
        if (actor.name !== "player") {
          if ("movementType" in actor) {
            const creature = actor as Creature;
            if (creature.movementType === "WANDERING")
              moveDelta = getWanderingMoveDelta(creature);
          }
        }

        game = moveActor(game, actor, moveDelta);
      });
    }
  } else if (game.activeDialog) {
    // active dialog
    let creature = (game.interactingActor as Creature);
    if (game.activeDialog.conversationBranch && nextInput !== undefined) {
      if (
        parseInt(nextInput) - 1 >= 0 &&
        parseInt(nextInput) - 1 < game.activeDialog.conversationBranch.length
      ) {
        // lookup branch from creatureReference branch if it exists
        if (game.activeDialog.gotoBranch) {
          // TODO tree traversal
        } else {
        game.activeDialog =
          game.activeDialog.conversationBranch[parseInt(nextInput) - 1];
        // perform dialog action on selected choice
        if (game.activeDialog.actions && game.activeDialog.actions.length > 0) {
          game.activeDialog.actions.forEach((action: Action) => {
            if (action.givePlayerItems) {
            }
            if (action.takePlayerItems) {
              // see if the player has the item
              action.takePlayerItems.forEach((itemName) => {
                if (removeItemFromPlayerInventory(game, itemName)) {
                  // player had the item, it got removed
                  game.messages.push(`You gave ${creature.useDefiniteArticle ? "the" : ""}${creature.name} the ${itemName}`);
                  let item = game.allItems.find((item: Item) => item.name === itemName);
                  if (item) creature.inventory?.push(item);
                } else {
                  if (game.activeDialog?.actionFailedBranch) {
                    game.activeDialog = game.activeDialog.actionFailedBranch;
                  }
                  game.messages.push(`You don't have a ${itemName} to give ${creature.useDefiniteArticle ? "the" : ""}${creature.name}`)
                }
              });
              
            }
            if (action.updateCreature) {
            }
            if (action.updatePlayer) {
            }
          });
        }
        }
        // set the dialog node to the selected response (walk the tree down to the next child node)

        game.isScreenDirty = true;
      }
    }
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
function removeItemFromPlayerInventory(
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
