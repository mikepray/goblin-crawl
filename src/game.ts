import chalk from "chalk";
import { getWanderingMoveDelta, moveActor } from "./actors";
import { ascend, descend } from "./levels";
import { loadCreatures } from "./loader";
import {
  Actor,
  Coords,
  CoordsMap,
  Creature,
  Feature,
  Game,
  InputKey,
  Level,
  Player,
} from "./types";
import { branchLevelToKey, coordsToKey, getBresenhamsLine } from "./utils";

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
          if (isTileInFieldOfVision({ x: x, y: y }, { ...game.player }, 8, game.tiles)) {
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

function isTileInFieldOfVision(
  testCoords: Coords,
  playerCoords: Coords,
  viewRadius: number,
  gameTiles: CoordsMap
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
  // raycast using bresnham's algorithm
  let line = getBresenhamsLine(playerCoords.x, playerCoords.y, testCoords.x, testCoords.y);

  let i = 0;
  for (const tile of line) {
    if (!gameTiles.has(coordsToKey(tile))) {
      // if the final point in the line is a wall, display the wall
      return i === line.size - 1;
    }
    i++;
  }
  // if any tile in the resulting line does not exist in the tile set, then the tile is not in field of vision

  return true;
}

function movePlayer(game: Game) {
  const nextInput = inputBuffer.shift();
  if (!game.activeDialog) {
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
        // do nothing
      } else if (nextInput === "?") {
        game.debugOutput.push("You are the @ symbol, arrow keys and vim keys move, period waits one turn, < and > go up and down stairs")
      } else { 
        return game;
      }

      game.turnCount++;
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
