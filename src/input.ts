import { allBranches, getRandomKoboldCave } from "./branches";
import { ascend, descend } from "./levels";
import {
  doPlayerMove,
  putItemOnFloorStack,
  removeLastItemFromFloorStack,
} from "./move";
import { Coords, Creature, Downstairs, Game, InputKey } from "./types";
import { branchLevelToKey, coordsToKey, getRandomValidTile } from "./utils";

export function handlePlayerGameInput(game: Game, nextInput: any) {
  let playerMove: Coords = { x: 0, y: 0 };

  if (nextInput === ">") {
    // get feature at coords
    let featureAtTile = game.features.get(coordsToKey({ ...game.player }));
    // descend to other branch
    if (featureAtTile && featureAtTile.glyph === ">") {
      // look up branch by name on the feature (see descend code for name assignment to the feature)
      const nextBranch = allBranches?.find(
        (b) => b.name === (featureAtTile as Downstairs).toBranchName,
      );
      if (nextBranch) {
        game.gameTurns += 2;
        return descend(game, {
          branch: nextBranch,
          level: 1,
        });
      }
      if (featureAtTile.name === "Downstairs") {
        // descend level in the same branch
        game.gameTurns += 2;
        return descend(game, {
          branch: game.currentBranchLevel.branch,
          level: game.currentBranchLevel.level + 1,
        });
      }
    } else {
      game.messages.push("There's no staircase here...");
    }
  } else if (nextInput === "<") {
    // get feature at coords
    let featureAtTile = game.features.get(coordsToKey({ ...game.player }));
    if (featureAtTile && featureAtTile.name === "Upstairs") {
      // ascend level
      // get parent level
      let parentBranch = game.levels.get(
        branchLevelToKey(game.currentBranchLevel),
      )?.parentLevel;
      if (parentBranch) {
        // take an extra turn
        game.gameTurns++;
        return ascend(game, { ...parentBranch });
      }
    } else {
      game.messages.push("Press < to go upstairs while standing on a < tile");
    }
  } else if (nextInput === InputKey.UP || nextInput === "k") {
    playerMove.y--;
    doPlayerMove(game, playerMove);
  } else if (nextInput === InputKey.DOWN || nextInput === "j") {
    playerMove.y++;
    doPlayerMove(game, playerMove);
  } else if (nextInput === InputKey.LEFT || nextInput === "h") {
    playerMove.x--;
    doPlayerMove(game, playerMove);
  } else if (nextInput === InputKey.RIGHT || nextInput === "l") {
    playerMove.x++;
    doPlayerMove(game, playerMove);
  } else if (nextInput === "y") {
    // diagonal up left
    playerMove.x--;
    playerMove.y--;
    doPlayerMove(game, playerMove);
  } else if (nextInput === "u") {
    // diagonal up right
    playerMove.x++;
    playerMove.y--;
    doPlayerMove(game, playerMove);
  } else if (nextInput === "b") {
    // diagonal down left
    playerMove.x--;
    playerMove.y++;
    doPlayerMove(game, playerMove);
  } else if (nextInput === "n") {
    // diagonal down right
    playerMove.x++;
    playerMove.y++;
    doPlayerMove(game, playerMove);
  } else if (nextInput === ".") {
    // wait one turn
    game.gameTurns++;
  } else if (nextInput === "^" || nextInput === "p") {
    let featureAtTile = game.features.get(coordsToKey({ ...game.player }));
    if (featureAtTile && featureAtTile.glyph === "^") {
      game.gameTurns++;
      game.messages.push("You pray to Meggled");
      if (featureAtTile.name === "altar to Meggled") {
        let item = removeLastItemFromFloorStack(game, { ...game.player });
        if (item?.name === "egg") {
          game.messages.push(
            "{green-fg}The egg is engulfed in green flame. Meggled accepts your sacrifice!{/}",
          );
        } else if (item) {
          putItemOnFloorStack(game, item);
          game.messages.push("Meggled does not accept this as a sacrifice!");
        }
      } else {
        const meggledAltar = game.allFeatures.find(
          (f) => f.name === "altar to Meggled",
        );
        if (meggledAltar) {
          game.features.set(coordsToKey({ ...game.player }), meggledAltar);
          game.messages.push(
            `{green-fg}{bold}You conquer the ${featureAtTile.name} in the name of Meggled! It is consumed in green flame!{/bold}{/green-fg}`,
          );
          game.altarsConquered++;
          game.player.XP += game.player.XP * 0.1;
          if (featureAtTile.name === "dragon shrine") {
            // add a new kobold cave to the last level in the dungeon
            // get dungeon
            const dungeonBranch = allBranches.find((b) => b.name === "Dungeon");
            const dungeonLevel = game.levels.get(
              `Dungeon:${dungeonBranch?.maxLevel}`,
            );
            if (dungeonLevel && dungeonBranch) {
              const koboldCave = getRandomKoboldCave(game.altarsConquered);
              const downstairsTile = getRandomValidTile(
                dungeonLevel.tiles,
                dungeonLevel.actors,
              );
              const downstairs = {
                ...downstairsTile,
                glyph: ">",
                name: `Stairs to the ${koboldCave.name}`,
                toBranchName: koboldCave.name,
                color: koboldCave.glyphColor,
                description: `${koboldCave.description}`,
              } as Downstairs;
              dungeonLevel.features.set(
                coordsToKey(downstairsTile),
                downstairs,
              );
              game.messages.push(
                `{green-fg}{bold}Meggled opens a passage to the cave of ${koboldCave.koboldName}! Go forth and conquer!{/}`,
              );
            }
          }
        }
      }
    } else {
      game.messages.push(
        `There's no altar here. Press {underline}p{/underline} to sacrifice and pray at altars`,
      );
    }
  } else if (nextInput === "g") {
    let item = removeLastItemFromFloorStack(game, { ...game.player });
    if (item) {
      game.player.inventory?.push(item);
      game.messages.push(`You pick up the ${item.name}`);
      game.gameTurns++;
    } else if (!game.items.get(coordsToKey({ ...game.player }))) {
      game.messages.push("There's nothing on the ground here...");
    }
    game.isScreenDirty = true;
  } else if (nextInput === "i" || nextInput === "\x09") {
    game.dialogMode = "inventory";
    game.dialogPointer = 1;
    game.isScreenDirty = true;
    // game.messages.push(
    //   "{underline}e{/underline}at, {underline}d{/underline}rop, {underline}w{/underline}ear or {underline}w{/underline}ield, esc to exit",
    // );
  } else if (nextInput === "5") {
    // rest
    // can't rest if there are enemies visible
    if (game.visibleActors.some((a) => (a as Creature).isHostile)) {
      game.messages.push("You can't rest while there are enemies in sight!");
    } else {
      game.restTurns = 50;
      game.gameTurns++;
      game.messages.push("Resting...");
    }
  } else if (nextInput === "?") {
    game.messages.push(
      "You are the @ symbol, arrow keys and vim keys move, period waits one turn, < and > go up and down stairs. Move into other creatures to interact or attack\ni for inventory, g to interact with what's on the floor\n5 to rest to heal",
    );
  }

  return game;
}
