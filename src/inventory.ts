import { Game, InputKey, Item, Creature } from "./types";
import { putItemOnFloorStack } from "./move";
import { dungeonHeight } from "./game";

export function printStatusScreen(game: Game, out: string): string {
  for (let i = 0; i < game.visibleActors.length; i++) {
    const actor = game.visibleActors.at(i);
    if (actor && actor.name !== "player") {
      if (actor.color) {
        out = out.concat(`${actor.color}${actor.glyph}{/}`);
      } else {
        out = out.concat(`{white-fg}${actor.glyph}{/}`);
      }
      if ((actor as Creature).isHostile) {
        out = out.concat(` {red-fg}${actor.name}{/red-fg}`);
      } else {
        out = out.concat(` {grey-fg}${actor.name}{/grey-fg}`);
      }
      out = out.concat(`\n`);
    }
  }
  return out;
}

export const printInventoryScreen = (game: Game, out: string): string => {
  out = out.concat(
    `{bold}HP{/bold} ${game.player.currentHp}/${game.player.maxHp}\t`,
  );
  out = out.concat(
    `{bold}Lvl{/bold} ${game.player.level}\t{bold}XP{/bold} ${game.player.XP}\t`,
  );
  out = out.concat(
    `${game.currentBranchLevel.branch.name}:${game.currentBranchLevel.level}`,
  );

  out = out.concat(`\n\n{bold}Inventory{/}\n`);
  // extra 7 for slots
  let disp = "";
  for (
    let i = 0;
    game.player.inventory && i < game.player.inventory?.length;
    i++
  ) {
    disp = disp.concat(
      `${game.dialogPointer === i + 1 ? "→ " : ""}${i + 1}: ${
        game.player.inventory[i].name
      }`,
    );
    if (game.dialogPointer === i + 1) {
      disp = disp.concat(` - ${game.player.inventory[i].description}`);
    }
    disp = disp.concat("\n");
  }
  out = out.concat(disp);
  // show item slots
  if (game.player.slots) {
    const invLen = game.player.inventory ? game.player.inventory.length : 0;
    out = out.concat(`\n{bold}Worn:{/}\n`);
    out = out.concat(
      `${game.dialogPointer === invLen + 1 ? "→ " : ""}{underline}h{/}ead: ${game.player.slots.head ? game.player.slots.head.name : "{#858282-fg}nothing{/}"}\n` +
        `${game.dialogPointer === invLen + 2 ? "→ " : ""}{underline}n{/}eck: ${game.player.slots.neck ? game.player.slots.neck.name : "{#858282-fg}nothing{/}"}\n` +
        `${game.dialogPointer === invLen + 3 ? "→ " : ""}{underline}b{/}ody: ${game.player.slots.body ? game.player.slots.body.name : "{#858282-fg}nothing{/}"}\n` +
        `${game.dialogPointer === invLen + 4 ? "→ " : ""}{underline}f{/}eet: ${game.player.slots.feet ? game.player.slots.feet.name : "{#858282-fg}nothing{/}"}\n` +
        `${game.dialogPointer === invLen + 5 ? "→ " : ""}h{underline}a{/}nds: ${game.player.slots.hands ? game.player.slots.hands.name : "{#858282-fg}nothing{/}"}\n` +
        `${game.dialogPointer === invLen + 6 ? "→ " : ""}{underline}s{/}hield: ${game.player.slots.shield ? game.player.slots.shield.name : "{#858282-fg}nothing{/}"}\n`,
    );
    out = out.concat("\n{bold}W{underline}i{/}{bold}elded:{/}\n");
    out = out.concat(`${game.dialogPointer === invLen + 7 ? "→ " : ""}`);
    if (game.player.slots.weapon) {
      out = out.concat(`${game.player.slots.weapon.name}`);
    } else {
      out = out.concat(
        game.player.naturalWeapon
          ? game.player.naturalWeapon.name
          : "{#858282-fg}nothing{/}",
      );
    }
  }
  // fill the rest of the screen with whitespace (start at 1 for inventory screen title)
  for (
    let i = 1;
    i < dungeonHeight - (game.player.inventory?.length || 0);
    i++
  ) {
    out = out.concat("\n");
  }
  return out;
};

export const handleInventoryScreenAction = (game: Game, nextInput: string) => {
  if (
    game.dialogMode === "inventory" &&
    (nextInput === InputKey.ESCAPE || nextInput === InputKey.TAB)
  ) {
    game.dialogMode = "game";
    game.activeDialog = undefined;
    game.interactingActor = undefined;
    game.isScreenDirty = true;
    game.dialogPointer = -1;
    // game.messages.push(
    //   "{underline}i{/underline}nventory, {underline}g{/underline} to pick up from the ground, {underline}>{/underline} down stair, {underline}<{/underline} up stair, {underline}^{/underline} pray at altar",
    // );
    return game;
  }
  // if the next input is a number
  if (game.player.inventory && Number.isInteger(Number.parseInt(nextInput))) {
    // if the number is a valid choice, set the pointer to it
    let num = Number.parseInt(nextInput);
    if (num <= game.player.inventory.length) {
      game.dialogPointer = num;
    }
  } else if (game.player.inventory && nextInput) {
    if (
      nextInput === InputKey.DOWN ||
      nextInput === "\x1bOB" ||
      nextInput === "j"
    ) {
      game.dialogPointer++;
      if (game.dialogPointer > game.player.inventory.length + 7) {
        game.dialogPointer = 1;
      }
    } else if (
      nextInput === InputKey.UP ||
      nextInput === "\x1bOA" ||
      nextInput === "k"
    ) {
      game.dialogPointer--;
      if (game.dialogPointer < 1) {
        game.dialogPointer = game.player.inventory.length + 7;
      }
      // game.dialogPointer % (game.player.inventory.length + 7);
    } else if (nextInput === "h") {
      game.dialogPointer = game.player.inventory.length + 1;
    } else if (nextInput === "n") {
      game.dialogPointer = game.player.inventory.length + 2;
    } else if (nextInput === "b") {
      game.dialogPointer = game.player.inventory.length + 3;
    } else if (nextInput === "f") {
      game.dialogPointer = game.player.inventory.length + 4;
    } else if (nextInput === "a") {
      game.dialogPointer = game.player.inventory.length + 5;
    } else if (nextInput === "s") {
      game.dialogPointer = game.player.inventory.length + 6;
    } else if (nextInput === "i") {
      game.dialogPointer = game.player.inventory.length + 7;
    } else if (nextInput === "d") {
      if (!game.dialogPointer || game.dialogPointer < 1) {
        game.messages.push("First select an item to drop");
      } else if (!game.player.inventory || game.player.inventory.length === 0) {
        game.messages.push("You have nothing to drop...");
      } else {
        if (game.dialogPointer <= game.player.inventory.length) {
          // drop the inventory item
          let item = game.player.inventory[game.dialogPointer - 1];
          removeSelectedItemFromPlayerInventory(game);
          putItemOnFloorStack(game, item);
          game.messages.push(`You dropped the ${item.name}`);
          game.turnCount++;
        } else if (game.player.slots) {
          const slotIndex = game.dialogPointer - game.player.inventory.length;
          if (slotIndex === 0 && game.player.slots.head) {
            const item = game.player.slots.head;
            game.player.slots.head = undefined;
            putItemOnFloorStack(game, item);
            game.turnCount++;
          } else if (slotIndex === 1 && game.player.slots.neck) {
            const item = game.player.slots.neck;
            game.player.slots.neck = undefined;
            putItemOnFloorStack(game, item);
            game.turnCount++;
          } else if (slotIndex === 2 && game.player.slots.body) {
            const item = game.player.slots.body;
            game.player.slots.body = undefined;
            putItemOnFloorStack(game, item);
            game.turnCount++;
          } else if (slotIndex === 3 && game.player.slots.feet) {
            const item = game.player.slots.feet;
            game.player.slots.feet = undefined;
            putItemOnFloorStack(game, item);
            game.turnCount++;
          } else if (slotIndex === 4 && game.player.slots.hands) {
            const item = game.player.slots.hands;
            game.player.slots.hands = undefined;
            putItemOnFloorStack(game, item);
            game.turnCount++;
          } else if (slotIndex === 5 && game.player.slots.neck) {
            const item = game.player.slots.neck;
            game.player.slots.neck = undefined;
            putItemOnFloorStack(game, item);
            game.turnCount++;
          } else if (slotIndex === 6 && game.player.slots.shield) {
            const item = game.player.slots.shield;
            game.player.slots.shield = undefined;
            putItemOnFloorStack(game, item);
            game.turnCount++;
          } else if (slotIndex === 7) {
            if (game.player.slots.weapon) {
              const item = game.player.slots.weapon;
              game.player.slots.weapon = undefined;
              putItemOnFloorStack(game, item);
              game.turnCount++;
            } else {
              game.messages.push(
                `You cannot drop your ${game.player.naturalWeapon?.name}!`,
              );
            }
          }
        }
      }
    } else if (nextInput === "e") {
      // eat the inventory item
      if (!game.dialogPointer || game.dialogPointer < 1) {
        game.messages.push("First select an item to eat");
      } else if (!game.player.inventory || game.player.inventory.length === 0) {
        game.messages.push("You have nothing to eat...");
      } else {
        let item = game.player.inventory[game.dialogPointer - 1];
        if (item.edible) {
          removeSelectedItemFromPlayerInventory(game);
          game.messages.push(`You ate the ${item.name}. Delicious!`);
          game.turnCount++;
        } else {
          game.messages.push(`You cannot eat the ${item.name}!`);
        }
      }
    } else if (nextInput === "w") {
      // wear or wield the inventory item
      if (!game.dialogPointer || game.dialogPointer < 1) {
        game.messages.push("First select an item to wear or wield");
      } else if (!game.player.inventory || game.player.inventory.length === 0) {
        game.messages.push("You have nothing to wear or wield...");
      } else {
        if (game.dialogPointer <= game.player.inventory.length) {
          let item = game.player.inventory[game.dialogPointer - 1];
          if (!item.slot) {
            game.messages.push(`You cannot wear or weild the ${item.name}!`);
          } else {
            if (game.player.slots) {
              // if there's already something in the slot, put it in the inventory
              if (game.player.slots[item.slot]) {
                let swappedItem = game.player.slots[item.slot];
                if (swappedItem) {
                  game.player.inventory?.push(swappedItem);
                }
              }
              // remove the weilded/worn item from inventory since it's in the slot now
              removeSelectedItemFromPlayerInventory(game);
              // weild/wear the item
              game.player.slots[item.slot] = item;
              if (item.slot === "weapon") {
                game.messages.push(`You wield the ${item.name}`);
              } else {
                game.messages.push(`You wear the ${item.name}`);
              }
            }
          }
        } else if (game.player.slots) {
          // unwield slot item
          const slotIndex = game.dialogPointer - game.player.inventory.length;
          if (slotIndex === 0 && game.player.slots.head) {
            const item = game.player.slots.head;
            game.player.slots.head = undefined;
            game.player.inventory?.push(item);
            game.turnCount++;
          } else if (slotIndex === 1 && game.player.slots.neck) {
            const item = game.player.slots.neck;
            game.player.slots.neck = undefined;
            game.player.inventory?.push(item);
            game.turnCount++;
          } else if (slotIndex === 2 && game.player.slots.body) {
            const item = game.player.slots.body;
            game.player.slots.body = undefined;
            game.player.inventory?.push(item);
            game.turnCount++;
          } else if (slotIndex === 3 && game.player.slots.feet) {
            const item = game.player.slots.feet;
            game.player.slots.feet = undefined;
            game.player.inventory?.push(item);
            game.turnCount++;
          } else if (slotIndex === 4 && game.player.slots.hands) {
            const item = game.player.slots.hands;
            game.player.slots.hands = undefined;
            game.player.inventory?.push(item);
            game.turnCount++;
          } else if (slotIndex === 5 && game.player.slots.neck) {
            const item = game.player.slots.neck;
            game.player.slots.neck = undefined;
            game.player.inventory?.push(item);
            game.turnCount++;
          } else if (slotIndex === 6 && game.player.slots.shield) {
            const item = game.player.slots.shield;
            game.player.slots.shield = undefined;
            putItemOnFloorStack(game, item);
            game.turnCount++;
          } else if (slotIndex === 7)
            if (game.player.slots.weapon) {
              const item = game.player.slots.weapon;
              game.player.slots.weapon = undefined;
              game.player.inventory?.push(item);
              game.turnCount++;
            } else {
              game.messages.push(
                `You cannot unwield your ${game.player.naturalWeapon?.name}! Find a weapon to use`,
              );
            }
        }
      }
    }
  }
  game.isScreenDirty = true;
};

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
