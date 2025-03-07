import chalk from "chalk";
import { getWanderingMoveDelta, moveActor } from "./actors";
import { ascend, descend } from "./levels";
import { loadCreatures, loadItems } from "./loader";
import {
  Actor,
  Coords,
  CoordsMap,
  Creature,
  Feature,
  Game,
  InputKey,
  Item,
  Level,
  Player,
} from "./types";
import { branchLevelToKey, coordsToKey, getBresenhamsLine, isTileInFieldOfVision } from "./utils";
import { movePlayer } from "./move";

export const dungeonWidth = 48;
export const dungeonHeight = 24;

function initGame(): Game {
  let items = loadItems();
  let game = {
    turnCount: 0,
    actors: new Map<string, Actor>(),
    tiles: new Map<string, Coords>(),
    features: new Map<string, Feature>(),
    player: {
      x: 0,
      y: 0,
      inventory: [
        items.find(item => item.name === "skrunt egg")
      ],
      glyph: "@",
      name: "player",
      description: "It's you",
    } as Player,
    gameOver: false,
    isScreenDirty: true,
    dialogPointer: 0,
    allItems: items,
    currentBranchLevel: { branchName: "D", level: 0 },
    allCreatures: loadCreatures(),
    debugOutput: new Array<string>(0),
    levels: new Map<string, Level>(),
    items: new Map<string, Array<Item>>(),
    seenTiles: new Map<string, Coords>(),
    dialogMode: "game",
  };

  return descend(game, {
    branchName: "D",
    level: game.currentBranchLevel.level + 1,
  });
}

function printScreen(game: Game): Game {
  if (game.isScreenDirty) {
    console.clear();
    let out = `${chalk.greenBright("GoblinCrawl")} | ${game.currentBranchLevel.branchName}:${game.currentBranchLevel.level} Turn: ${game.turnCount}\n`;
    if (game.activeDialog) {
      // active dialog
      out = out.concat(
        `\n${game.interactingActor?.name} says: \n\n> ${game.activeDialog.dialog}\n\n`
      );
      if (game.activeDialog.creatureResponses) {
        for (let i = 0; i < game.activeDialog.creatureResponses?.length; i++) {
          out = out.concat(
            `${i + 1}: ${
              game.activeDialog.creatureResponses[i].playerResponse
            }\n`
          );
        }
        out = out.concat(
          "\nPress Number keys to answer or Escape to exit dialog..."
        );
      } else {
        out = out.concat("\n\nPress Escape to exit dialog...");
      }
    } else if (game.dialogMode === "inventory") {
      out = out.concat(`Inventory\n`);
      for (
        let i = 0;
        game.player.inventory && i < game.player.inventory?.length;
        i++
      ) {
        out = out.concat(
          `${game.dialogPointer === i + 1 ? "> " : ""}${i + 1}: ${
            game.player.inventory[i].name
          } - ${game.player.inventory[i].description}\n`
        );
      }
    } else {
      // dungeon screen
      for (let y = 0; y < dungeonHeight; y++) {
        for (let x = 0; x < dungeonWidth; x++) {
          // field of vision
          if (
            isTileInFieldOfVision(
              { x: x, y: y },
              { ...game.player },
              8,
              game.tiles
            )
          ) {
            // add tile to seen tiles
            game.seenTiles.set(coordsToKey({ x: x, y: y }), { x: x, y: y });
            // display order:
            // actors, features, items, tiles
            const actor = game.actors.get(coordsToKey({ x: x, y: y }));
            const feature = game.features.get(coordsToKey({ x: x, y: y }));
            const itemsOnTile = game.items.get(coordsToKey({ x: x, y: y }));
            if (actor) {
              out = out.concat(actor.glyph);
            } else if (feature) {
              out = out.concat(feature.glyph);
            } else if (itemsOnTile && itemsOnTile.length >= 0 && itemsOnTile[0]) {
              // show the last item's glyph
              out = out.concat(itemsOnTile[0].glyph);
            } else if (game.tiles.has(coordsToKey({ x: x, y: y }))) {
              out = out.concat(`${chalk.grey(".")}`);
            } else out = out.concat("#");
          } else {
            // if not in field of vision, render the tile dimmer if the player has already seen it
            if (game.seenTiles.has(coordsToKey({ x: x, y: y }))) {
              if (game.features.has(coordsToKey({ x: x, y: y }))) {
                // show seen features first
                const feature = game.features.get(coordsToKey({ x: x, y: y }));
                out = out.concat(`${chalk.grey.dim(feature?.glyph)}`);
              } else if (game.tiles.has(coordsToKey({ x: x, y: y }))) {
                out = out.concat(`${chalk.grey.dim(".")}`);
              } else {
                out = out.concat(`${chalk.grey.dim("#")}`);
              }
            } else {
              out = out.concat(" ");
            }
          }
        }
        out = out.concat("\n");
      }
    }

    for (let i = 0; i < game.debugOutput.length; i++) {
      out = out.concat(`${game.debugOutput.shift() || ""}\n`);
    }

    console.log(out);
    game.isScreenDirty = false;
  }
  return game;
}

function gameLoop(game: Game) {
  printScreen(game);
  game = movePlayer(game, inputBuffer.shift());
  if (!game.gameOver) {
    setTimeout(() => {
      gameLoop(game);
    }, 10);
  } else {
    console.log(`You lose!`);
  }
}

process.stdin.setEncoding("utf8");
process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.on("data", (key: Buffer) => {
  const keyStr = key.toString();
  // Exit on ctrl-c
  if (keyStr === "\u0003") {
    process.exit();
  }
  inputBuffer.push(keyStr);
});

let inputBuffer = new Array<string>();

gameLoop(initGame());
