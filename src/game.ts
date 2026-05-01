import { initArenaMode } from "./arenaMode";
import { handleDialogActions } from "./dialog";
import { defaultGame, initGame, initView, startScreen } from "./init";
import { handlePlayerGameInput } from "./input";
import { handleInventoryScreenAction } from "./inventory";
import { buildRoomsAndHallwaysOnePath } from "./layouts/roomsAndHallwaysOnePath";
import { handleLevelUpScreenAction } from "./levelUpScreen";
import { doGameTurn } from "./move";
import { levelUp } from "./player";
import { printDungeonScreen, viewportPrintScreen } from "./printScreen";
import { Creature } from "./types";

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

let view = initView();
const FRAME_RATE = 30;
const INTERVAL = Math.floor(1000 / FRAME_RATE); // ~33.33ms

view.screen.render();

// Check command line arguments for arena mode
const isArenaMode = process.argv.includes("--arena");
const isLayoutViewer = process.argv.includes("--layout");

if (isLayoutViewer) {
  const game = defaultGame;
  // game.tiles = buildRoomsAndHallways();
  game.tiles = buildRoomsAndHallwaysOnePath();
  game.seeAllTiles = true;
  const { ylines } = printDungeonScreen(game);
  view.layoutViewr.setContent(
    ylines.flatMap((line) => line.join("")).join("\n"),
  );
  view.screen.render();

  process.exit();
}
view.layoutViewr.destroy();

const introBox = startScreen(view);
let game = isArenaMode ? initArenaMode() : initGame();

// wait for any key to be pressed to clear start screen
const startScreenInterval = setInterval(() => {
  if (inputBuffer.length > 0) {
    inputBuffer.shift();
    if (!isArenaMode) {
      introBox.destroy();
    }
    clearInterval(startScreenInterval);
    game.messages = ["Welcome to GoblinCraw!"];

    viewportPrintScreen(game, view);
  }
}, INTERVAL);

function gameLoop() {
  // main game loop
  setInterval(() => {
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

    viewportPrintScreen(game, view);

    view.screen.render();
  }, INTERVAL);
}

gameLoop();
