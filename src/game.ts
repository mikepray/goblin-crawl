import { initArenaMode } from "./arenaMode";
import { handleDialogActions, printDialogScreen } from "./dialog";
import { initGame, initView, startScreen, View } from "./init";
import { handlePlayerGameInput } from "./input";
import {
  handleInventoryScreenAction,
  printInventoryScreen,
  printStatusScreen,
} from "./inventory";
import { handleLevelUpScreenAction, printLevelUpScreen } from "./levelUpScreen";
import { doGameTurn } from "./move";
import { levelUp } from "./player";
import { Creature, Game } from "./types";
import { coordsToKey, isTileInFieldOfVision } from "./utils";

export const dungeonWidth = 48;
export const dungeonHeight = 24;

// Only set up stdin when not in test mode
if (process.env.NODE_ENV !== "test") {
  process.stdin.setEncoding("utf8");
  process.stdin.setRawMode(true);
  process.stdin.resume();
}

process.stdin.on("data", (key: Buffer) => {
  const keyStr = key.toString();
  // Exit on ctrl-c
  if (keyStr === "\u0003") {
    process.exit();
  }
  inputBuffer.push(keyStr);
});

let inputBuffer = new Array<string>();

function gameLoop() {
  let view = initView();

  // Check command line arguments for arena mode
  const isArenaMode = process.argv.includes("--arena");
  let game = isArenaMode ? initArenaMode() : initGame();

  let startupMessages = isArenaMode
    ? ["Welcome to Arena Mode"]
    : ["Welcome to GoblinCrawl! May Meggled's heads speak only truth!"];

  const FRAME_RATE = 30;
  const INTERVAL = Math.floor(1000 / FRAME_RATE); // ~33.33ms

  const introBox = startScreen(view);
  view.screen.render();

  // wait for any key to be pressed to clear start screen
  const startScreenInterval = setInterval(() => {
    if (inputBuffer.length > 0) {
      inputBuffer.shift();
      introBox.destroy();
      clearInterval(startScreenInterval);
      if (startupMessages.length > 0) {
        game.messages = startupMessages;
        startupMessages = [];
      }
      printScreen(game, view);
      const interval = setInterval(() => {
        // rest
        if (game.restTurns && game.restTurns > 0) {
          if (game.visibleActors.some((a) => (a as Creature).isHostile)) {
            game.messages.push("An enemy is in sight, stopping rest");
            game.restTurns = 0;
          } else {
            game.restTurns--;
            game.gameTurns++;
            if (game.restTurns === 0) {
              game.messages.push("Finished resting");
            }
          }
        }

        if (inputBuffer.length > 0 && !game.gameOver) {
          if (game.restTurns && game.restTurns > 0) {
            game.messages.push("Key pressed, stopping rest");
            game.restTurns = 0;
          }
          game.oldMessages = game.oldMessages.concat(game.messages);
          game.messages = new Array();
          const nextInput = inputBuffer.shift();
          if (game.dialogMode === "game") {
            game = handlePlayerGameInput(game, nextInput);
          } else if (game.dialogMode === "dialog" && nextInput) {
            game = handleDialogActions(game, nextInput);
          } else if (game.dialogMode === "inventory" && nextInput) {
            game = handleInventoryScreenAction(game, nextInput);
          } else if (game.dialogMode === "levelUp" && nextInput) {
            game = handleLevelUpScreenAction(game, nextInput);
          }

          levelUp(game);
          if (game.gameTurns > 0) {
            game.gameTurns--;
            doGameTurn(game);
          }
        } else {
          if (game.gameTurns > 0) {
            game.gameTurns--;
            doGameTurn(game);
          }
        }

        printScreen(game, view);

        view.screen.render();
      }, INTERVAL);
    }
  }, INTERVAL);
}

gameLoop();

function printScreen(game: Game, view: View): Game {
  let topbarContent = `{bold}GoblinCrawl{/bold} > ${game.dialogMode}\n`;

  view.topbar.setContent(topbarContent);

  view.statusRight.setContent(printInventoryScreen(game, ""));
  view.statusLeft.setContent(printStatusScreen(game, ""));
  if (game.dialogMode !== "inventory") {
    view.statusContainer.style = {
      border: {
        fg: "black",
      },
    };
  } else {
    view.statusContainer.style = {
      border: {
        fg: "white",
      },
    };
  }

  if (game.dialogMode === "dialog") {
    view.map.setContent(`{left}${printDialogScreen(game, "")}{/left}`);
  } else if (game.dialogMode === "levelUp") {
    view.map.setContent(`{left}${printLevelUpScreen(game, "")}{/left}`);
  } else {
    let out = "";
    let visibleActors = [];
    // dungeon screen
    for (let y = 0; y < dungeonHeight; y++) {
      for (let x = 0; x < dungeonWidth; x++) {
        // field of vision
        if (
          isTileInFieldOfVision(
            { x: x, y: y },
            { ...game.player },
            8,
            game.tiles,
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
            if (actor.color) {
              out = out.concat(`${actor.color}${actor.glyph}{/}`);
            } else {
              out = out.concat(`{white-fg}${actor.glyph}{/}`);
            }
            visibleActors.push(actor);
          } else if (feature) {
            if (feature.color) {
              out = out.concat(`${feature.color}${feature.glyph}{/}`);
            } else {
              out = out.concat(`{white-fg}${feature.glyph}{/}`);
            }
          } else if (itemsOnTile && itemsOnTile.length >= 0 && itemsOnTile[0]) {
            // show the last item's glyph

            if (itemsOnTile[0].color) {
              out = out.concat(
                `${itemsOnTile[0].color}${itemsOnTile[0].glyph}{/}`,
              );
            } else {
              out = out.concat(`{white-fg}${itemsOnTile[0].glyph}{/}`);
            }
          } else if (game.tiles.has(coordsToKey({ x: x, y: y }))) {
            out = out.concat(`{white-fg}.{/}`);
          } else {
            if (game.currentBranchLevel.branch.glyphColor) {
              out = out.concat(
                `${game.currentBranchLevel.branch.glyphColor}#{/}`,
              );
            } else {
              out = out.concat("{white-fg}#{/}");
            }
          }
        } else {
          // if not in field of vision, render the tile dimmer if the player has already seen it
          if (game.seenTiles.has(coordsToKey({ x: x, y: y }))) {
            if (game.features.has(coordsToKey({ x: x, y: y }))) {
              // show seen features first
              const feature = game.features.get(coordsToKey({ x: x, y: y }));
              out = out.concat(`{#858282-fg}${feature?.glyph}{/}`);
            } else if (game.tiles.has(coordsToKey({ x: x, y: y }))) {
              out = out.concat(`{#858282-fg}.{/}`);
            } else {
              out = out.concat("{#858282-fg}#{/}");
            }
          } else {
            out = out.concat("{black-bg} {/}");
          }
        }
      }
      out = out.concat("\n");
      if (game.dialogMode !== "game") {
        view.map.style = {
          border: {
            fg: "black",
          },
        };
        view.map.setContent(`{center}${out}{/center}`);
      } else {
        view.map.style = {
          border: {
            fg: "white",
          },
        };
        view.map.setContent(`{center}${out}{/center}`);
      }
    }
    game.visibleActors = visibleActors;
  }

  // tail of last five messages, old and new combined with new messages highlighted and old messages dimmed
  let showMessages = game.oldMessages
    .concat(game.messages)
    .slice(-Math.min(5, game.oldMessages.length + game.messages.length));
  let stringMessages = "";
  for (let i = 0; i < showMessages.length; i++) {
    if (i >= showMessages.length - game.messages.length) {
      stringMessages = stringMessages.concat(
        `{white-fg}${showMessages[i]}{/}\n`,
      );
    } else {
      stringMessages = stringMessages.concat(
        `{grey-fg}${showMessages[i]}{/}\n`,
      );
    }
  }

  view.log.setContent(stringMessages);

  return game;
}
