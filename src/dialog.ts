import { findConversationBranchByCreatureSpeaks, removeItemFromCreatureInventory, removeItemFromPlayerInventory } from "./move";
import { Action, Creature, Game, Item } from "./types";

export function printDialogScreen(game: Game, out: string) {
  if (game.dialogMode === "dialog" && game.activeDialog) {
    out = out.concat(
      `\n${game.interactingActor?.name} says: \n\n${game.activeDialog.creatureSpeaks}\n\n`
    );
    if (game.activeDialog.conversationBranches) {
      for (let i = 0; i < game.activeDialog.conversationBranches?.length; i++) {
        out = out.concat(
          `${i + 1}: ${
            game.activeDialog.conversationBranches[i].playerResponse
          }\n`
        );
      }
      out = out.concat(
        "\nPress Number keys to answer or Escape to exit dialog..."
      );
    } else {
      out = out.concat("\n\nPress Escape to exit dialog...");
    }
  }
  return out;
}

export function handleDialogActions(game: Game, nextInput: string) {
  if (game.dialogMode === "dialog" && game.activeDialog) {
    // active dialog
    let creature = game.interactingActor as Creature;
    if (game.activeDialog.conversationBranches && nextInput !== undefined) {
      if (
        parseInt(nextInput) - 1 >= 0 &&
        parseInt(nextInput) - 1 < game.activeDialog.conversationBranches.length
      ) {
        // lookup branch from creatureReference branch if it exists
        game.activeDialog =
        game.activeDialog.conversationBranches[parseInt(nextInput) - 1];
        if (game.activeDialog.gotoBranch) {
          let foundConversationBranch = findConversationBranchByCreatureSpeaks(
            creature.conversationBranches,
            game.activeDialog.gotoBranch
          );
          if (foundConversationBranch) {
            game.activeDialog = foundConversationBranch;
          }
        } else {
          // perform dialog action on selected choice
          if (
            game.activeDialog.actions &&
            game.activeDialog.actions.length > 0
          ) {
            game.activeDialog.actions.forEach((action: Action) => {
              if (action.givePlayerItems) {
                action.givePlayerItems.forEach(itemName => {
                  let item = game.allItems.find(
                    (item: Item) => item.name === itemName
                  );
                  if (item) {game.player.inventory?.push(item);
                    game.messages.push( `${creature.useDefiniteArticle ? "The" : ""}${
                      creature.name
                    } gives you the ${itemName}`)
                  }
                  // optionally remove the item from the creature
                  removeItemFromCreatureInventory(creature, itemName);
                })
              }
              if (action.takePlayerItems) {
                // see if the player has the item
                action.takePlayerItems.forEach((itemName) => {
                  if (removeItemFromPlayerInventory(game, itemName)) {
                    // player had the item, it got removed
                    game.messages.push(
                      `You gave ${creature.useDefiniteArticle ? "the" : ""}${
                        creature.name
                      } the ${itemName}`
                    );
                    let item = game.allItems.find(
                      (item: Item) => item.name === itemName
                    );
                    if (item) creature.inventory?.push(item);
                  } else {
                    if (game.activeDialog?.actionFailedBranch) {
                      game.activeDialog = game.activeDialog.actionFailedBranch;
                    }
                    game.messages.push(
                      `You don't have a ${itemName} to give ${
                        creature.useDefiniteArticle ? "the" : ""
                      }${creature.name}`
                    );
                  }
                });
              }
              if (action.updateCreature) {
                // update creature
                creature = { ...creature, ...action.updateCreature };
              }
              if (action.updatePlayer) {
                // update player
                game.player = { ...game.player, ...action.updatePlayer };
              }
            });
          }
        }
        // set the dialog node to the selected response (walk the tree down to the next child node)
        game.isScreenDirty = true;
      }
    }
  }
}
