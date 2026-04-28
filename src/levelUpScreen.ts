import {
  findConversationBranchByCreatureSpeaks,
  removeItemFromCreatureInventory,
  removeItemFromPlayerInventory,
} from "./move";
import { levelUp } from "./player";
import { Action, Creature, Game, Item, InputKey } from "./types";
import { nDk } from "./utils";

export function printLevelUpScreen(game: Game, out: string) {
  if (game.dialogMode === "levelUp") {
    out =
      out.concat(`{bold}You leveled up and are now at level ${game.player.level + 1}!{/bold}\n
Your current skills:
  Cunning: ${game.player.cunning}
  Savagery: ${game.player.savagery}
  Fortitude: ${game.player.fortitude}
  Power: ${game.player.power}
  Armor: ${game.player.armor}
  Dodging: ${game.player.dodging}

Choose a skill to increase:
  1. Cunning - {grey-fg}your ability with cunning weapons, attacks, and abilities{/grey-fg}
  2. Savagery - {grey-fg}your ability with savage weapons, attacks, and abilities{/grey-fg}
  3. Fortitude - {grey-fg}your ability to resist damage{/grey-fg}
  4. Power - {grey-fg}how hard you hit{/grey-fg}
  5. Armor - {grey-fg}your skill wearing armor{/grey-fg}
  6. Dodging - {grey-fg}your ability to dodge attacks{/grey-fg}
    `);
  }
  return out;
}

export function handleLevelUpScreenAction(game: Game, nextInput: string): Game {
  let levelUpMessage = "";
  if (game.dialogMode === "levelUp") {
    if (nextInput === "1") {
      game.player.cunning++;
      levelUpMessage = levelUpMessage.concat(`You gained a rank in Cunning\n`);
    } else if (nextInput === "2") {
      game.player.savagery++;
      levelUpMessage = levelUpMessage.concat(`You gained a rank in Savagery\n`);
    } else if (nextInput === "3") {
      game.player.fortitude++;
      levelUpMessage = levelUpMessage.concat(
        `You gained a rank in Fortitude\n`,
      );
    } else if (nextInput === "4") {
      game.player.power++;
      levelUpMessage = levelUpMessage.concat(`You gained a rank in Power\n`);
    } else if (nextInput === "5") {
      game.player.armor++;
      levelUpMessage = levelUpMessage.concat(`You gained a rank in Armor\n`);
    } else if (nextInput === "6") {
      game.player.dodging++;
      levelUpMessage = levelUpMessage.concat(`You gained a rank in Dodging\n`);
    } else {
      game.messages.push("You must choose an option");
      return game;
    }
    game.player.level++;
    // add 1d(hit die) HP
    const hp = nDk(1, game.player.hitDie) + 1;
    game.player.maxHp += hp;
    game.player.currentHp += hp;

    // add regen every third level
    const everyThirdLevel = game.player.level % 3 === 0;
    if (everyThirdLevel) {
      game.player.hpRegen ? game.player.hpRegen++ : (game.player.hpRegen = 1);
    }

    // add a random rank every other level
    const everySecondLevel = game.player.level % 2 === 0;
    if (everySecondLevel) {
      const rank = nDk(1, 6);
      if (rank === 1) {
        game.player.cunning++;
        levelUpMessage = levelUpMessage.concat(
          `You gained a rank in Cunning\n`,
        );
      } else if (rank === 2) {
        game.player.savagery++;
        levelUpMessage = levelUpMessage.concat(
          `You gained a rank in Savagery\n`,
        );
      } else if (rank === 3) {
        game.player.fortitude++;
        levelUpMessage = levelUpMessage.concat(
          `You gained a rank in Fortitude\n`,
        );
      } else if (rank === 4) {
        game.player.power++;
        levelUpMessage = levelUpMessage.concat(`You gained a rank in Power\n`);
      } else if (rank === 5) {
        game.player.armor++;
        levelUpMessage = levelUpMessage.concat(`You gained a rank in Armor\n`);
      } else if (rank === 6) {
        game.player.dodging++;
        levelUpMessage = levelUpMessage.concat(
          `You gained a rank in Dodging\n`,
        );
      }
    }
    game.messages.push(levelUpMessage);
    game.dialogMode = "game";
  }
  return game;
}
