import chalk from "chalk";
import { getWanderingMoveDelta, moveActor } from "./actors";
import { ascend, descend } from "./levels";
import { loadCreatures } from "./loader";
import {
  Actor,
  Coords,
  Creature,
  Feature,
  Game,
  InputKey,
  Level,
  Player,
} from "./types";
import { branchLevelToKey, coordsToKey } from "./utils";

export const dungeonWidth = 48;
export const dungeonHeight = 24;

function initGame(): Game {
  let game = {
    turnCount: 0,
    actors: new Map<string, Actor>(),
    tiles: new Map<string, Coords>(),
    features: new Map<string, Feature>(),
    player: { x: 0, y: 0 } as Player,
    gameOver: false,
    isScreenDirty: true,
    dialogPointer: 0,
    currentBranchLevel: { branchName: "D", level: 0 },
    creatures: loadCreatures(),
    debugOutput: new Array<string>(0),
    levels: new Map<string, Level>(),
    seenTiles: new Map<string, Coords>(),
  };

  return descend(game, {
    branchName: "D",
    level: game.currentBranchLevel.level + 1,
  });
}

function printScreen(game: Game): Game {
  if (game.isScreenDirty) {
    console.clear();
    let out = "GoblinCrawl \n";
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
        out = out.concat("\n\nPress any key to exit dialog...");
      }
    } else {
      // dungeon screen
      for (let y = 0; y < dungeonHeight; y++) {
        for (let x = 0; x < dungeonWidth; x++) {
          // field of vision
          if (isInFieldOfVision({ x: x, y: y }, { ...game.player }, 8)) {
            // add tile to seen tiles
            game.seenTiles.set(coordsToKey({ x: x, y: y }), { x: x, y: y });
            // display order:
            // actors, features, tiles
            const actor = game.actors.get(coordsToKey({ x: x, y: y }));
            const feature = game.features.get(coordsToKey({ x: x, y: y }));
            if (actor) {
              out = out.concat(actor.glyph);
            } else if (feature) {
              out = out.concat(feature.glyph);
            } else if (game.tiles.has(coordsToKey({ x: x, y: y }))) {
              out = out.concat(`${chalk.grey(".")}`);
            } else out = out.concat("#");
          } else {
            // if not in field of vision, render the tile dimmer if the player has already seen it
            if (game.seenTiles.has(coordsToKey({ x: x, y: y }))) {
              if (game.tiles.has(coordsToKey({ x: x, y: y }))) {
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

function isInFieldOfVision(
  testCoords: Coords,
  playerCoords: Coords,
  viewRadius: number
): boolean {
  // if test coord is not within player view radius
  if (
    testCoords.x > playerCoords.x + viewRadius ||
    testCoords.y > playerCoords.y + viewRadius ||
    testCoords.x < playerCoords.x - viewRadius ||
    testCoords.y < playerCoords.y - viewRadius
  ) {
    return false;
  }
  // 
  return true;
}

function bresenhams(x0: number, y0:number , x1: number, y1: number) {
  let lineCoords = new Map<string, Coords>();
  let dx = Math.abs(x1 - x0);
  let sx = x0 < x1 ? 1 : -1;
  let dy = -Math.abs(y1 - y0);
  let sy = y0 < y1 ? 1 : -1;
  let error = dx + dy;
  let error2;

  while (true) {
    lineCoords.set(coordsToKey({x: x0, y: y0}), {x: x0, y: y0});
    if (x0 === x1 && y0 === y1) break;
    error2 = 2 * error;
    if (error2 >= dy) {
      error += dy; 
      x0 += sx; 
    }
    if (error2 <= dx) {
      error += dx; 
      y0 += sy;
    }
  }
  return lineCoords;
}

function movePlayer(game: Game) {
  const nextInput = inputBuffer.shift();
  if (!game.activeDialog) {
    let playerMove: Coords = { x: 0, y: 0 };
    if (nextInput) {
      game.turnCount++;
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
      }

      if (nextInput === InputKey.UP) {
        playerMove.y--;
      } else if (nextInput === InputKey.DOWN) {
        playerMove.y++;
      } else if (nextInput === InputKey.LEFT) {
        playerMove.x--;
      } else if (nextInput === InputKey.RIGHT) {
        playerMove.x++;
      } else if (nextInput === InputKey.PERIOD) {
        // do nothing
      }

      // move player first
      game = moveActor(game, game.player, playerMove);

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
  } else {
    // active dialog
    if (
      nextInput === InputKey.ESCAPE ||
      (nextInput !== undefined &&
        game.activeDialog.creatureResponses === undefined)
    ) {
      game.activeDialog = undefined;
      game.interactingActor = undefined;
      game.isScreenDirty = true;
      return game;
    }
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
  }
  return game;
}

function gameLoop(game: Game) {
  printScreen(game);
  game = movePlayer(game);
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
