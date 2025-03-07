import { moveActor, getWanderingMoveDelta } from "./actors";
import { descend, ascend } from "./levels";
import { Game, InputKey, Coords, Creature, Item } from "./types";
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
          game.debugOutput.push(
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
          game.debugOutput.push(
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
      } else if (nextInput === InputKey.PERIOD) {
        // wait one turn
      } else if (nextInput === "g") {
        // get the items under the player
        let itemsAtTile = game.items.get(coordsToKey({ ...game.player }));
        // get the last in the list
        let item = itemsAtTile?.shift();
        if (item) {
          game.player.inventory?.push(item);
          game.items.set(coordsToKey({ ...game.player }), itemsAtTile!);
          game.debugOutput.push(`You pick up the ${item.name}`);
          game.turnCount++;
        } else {
          game.debugOutput.push("There's nothing to pick up here...");
        }
        game.isScreenDirty = true;
        return game;
      } else if (nextInput === "i") {
        game.dialogMode = "inventory";
        game.isScreenDirty = true;
        return game;
      } else if (nextInput === "?") {
        game.debugOutput.push(
          "You are the @ symbol, arrow keys and vim keys move, period waits one turn, < and > go up and down stairs. Move into other creatures to interact or attack\ni for inventory, g to pick up items from the floor"
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
        out = out.concat(`Here: ${itemsAtTile[0].name}, press g to pick up`);
        if (itemsAtTile.length > 1) {
          out = out.concat(`\nAlso on this tile:\n`);
          for (let i = 1; i < itemsAtTile.length; i++) {
            out = out.concat(`${itemsAtTile[i].name}\n`);
          }
        }
        game.debugOutput.push(out);
        game.isScreenDirty = true;
      } else if (featureAtTile) {
        game.debugOutput.push(`${featureAtTile?.description}`);
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
    if (game.activeDialog.creatureResponses && nextInput !== undefined) {
      if (
        parseInt(nextInput) - 1 >= 0 &&
        parseInt(nextInput) - 1 < game.activeDialog.creatureResponses.length
      ) {
        game.activeDialog =
          game.activeDialog.creatureResponses[parseInt(nextInput) - 1];
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
            game.debugOutput.push(
              "Use the number keys to select an item. e to eat, d to drop"
            );
          } else if (
            !game.player.inventory ||
            game.player.inventory.length === 0
          ) {
            game.debugOutput.push("You have nothing...");
          } else {
            // drop the inventory item
            let item = game.player.inventory[game.dialogPointer - 1];
            removeSelectedItemFromPlayerInventory(game);
            putItemOnFloorStack(game, item);
            game.debugOutput.push(`You dropped the ${item.name}`);
            game.turnCount++;
          }
        } else if (nextInput === "e") {
          // eat the inventory item
          let item = game.player.inventory[game.dialogPointer - 1];
          if (item.edible) {
            removeSelectedItemFromPlayerInventory(game);
            game.debugOutput.push(`You ate the ${item.name}. Delicious!`);
            game.turnCount++;
          } else {
            game.debugOutput.push(`You cannot eat the ${item.name}!`);
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
