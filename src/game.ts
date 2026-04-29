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
import { isTileInFieldOfVision } from "./utils";

export const dungeonWidth = 48;
export const dungeonHeight = 24;
/** Blessed map box width (matches init.ts map.width). */
export const mapWidth = 70;
/** Blessed map box height (matches init.ts map.height / dungeonHeight). */
export const mapHeight = 24;

/** Inner map content cells (line border in init.ts). */
export const viewportCellWidth = mapWidth - 2;
export const viewportCellHeight = mapHeight - 2;

const mapBorderGame = { border: { fg: "white" as const } };
const mapBorderDim = { border: { fg: "black" as const } };
const statusBorderDim = mapBorderDim;
const statusBorderBright = { border: { fg: "white" as const } };

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
  view.statusContainer.style =
    game.dialogMode !== "inventory" ? statusBorderDim : statusBorderBright;

  if (game.dialogMode === "dialog") {
    view.map.setContent(`{left}${printDialogScreen(game, "")}{/left}`);
  } else if (game.dialogMode === "levelUp") {
    view.map.setContent(`{left}${printLevelUpScreen(game, "")}{/left}`);
  } else {
    const visibleActors = [];
    const ylines = new Array<Array<string>>(dungeonHeight);
    const player = game.player;
    const branchGlyphColor = game.currentBranchLevel.branch.glyphColor;
    const wallGlyphLit = branchGlyphColor
      ? `${branchGlyphColor}#{/}`
      : "{white-fg}#{/}";

    // dungeon screen
    for (let y = 0; y < dungeonHeight; y++) {
      const xlines = new Array<string>(dungeonWidth);
      for (let x = 0; x < dungeonWidth; x++) {
        const key = `${x},${y}`;
        // field of vision
        if (isTileInFieldOfVision({ x, y }, player, 8, game.tiles)) {
          // add tile to seen tiles
          game.seenTiles.set(key, { x, y });
          // display order:
          // actors, features, items, tiles
          const actor = game.actors.get(key);
          const feature = game.features.get(key);
          const itemsOnTile = game.items.get(key);
          if (actor) {
            if (actor.color) {
              xlines[x] = `${actor.color}${actor.glyph}{/}`;
            } else {
              xlines[x] = `{white-fg}${actor.glyph}{/}`;
            }
            visibleActors.push(actor);
          } else if (feature) {
            if (feature.color) {
              xlines[x] = `${feature.color}${feature.glyph}{/}`;
            } else {
              xlines[x] = `{white-fg}${feature.glyph}{/}`;
            }
          } else if (itemsOnTile?.[0]) {
            const it = itemsOnTile[0];
            if (it.color) {
              xlines[x] = `${it.color}${it.glyph}{/}`;
            } else {
              xlines[x] = `{white-fg}${it.glyph}{/}`;
            }
          } else if (game.tiles.has(key)) {
            xlines[x] = `{white-fg}.{/}`;
          } else {
            xlines[x] = wallGlyphLit;
          }
        } else {
          // if not in field of vision, render the tile dimmer if the player has already seen it
          if (game.seenTiles.has(key)) {
            if (game.features.has(key)) {
              // show seen features first
              const feature = game.features.get(key);
              xlines[x] = `{#858282-fg}${feature?.glyph}{/}`;
            } else if (game.tiles.has(key)) {
              xlines[x] = `{#858282-fg}.{/}`;
            } else {
              xlines[x] = "{#858282-fg}#{/}";
            }
          } else {
            xlines[x] = " ";
          }
        }
      }
      ylines[y] = xlines;
    }
    game.visibleActors = visibleActors;

    view.map.style = game.dialogMode === "game" ? mapBorderGame : mapBorderDim;

    const vw = viewportCellWidth;
    const vh = viewportCellHeight;

    const maxOriginX = Math.max(0, dungeonWidth - vw);
    const maxOriginY = Math.max(0, dungeonHeight - vh);
    const originX = Math.min(
      Math.max(0, Math.floor(player.x - Math.floor(vw / 2))),
      maxOriginX,
    );
    const originY = Math.min(
      Math.max(0, Math.floor(player.y - Math.floor(vh / 2))),
      maxOriginY,
    );
    game.xOffset = originX;
    game.yOffset = originY;

    const rows: string[] = new Array(vh);
    for (let sy = 0; sy < vh; sy++) {
      const dy = originY + sy;
      const line = ylines[dy];
      let row = "";
      for (let sx = 0; sx < vw; sx++) {
        const dx = originX + sx;
        row += dx < dungeonWidth ? line[dx] : " ";
      }
      rows[sy] = row;
    }

    view.map.setContent(rows.join("\n"));
  }

  // tail of last five messages, old and new combined with new messages highlighted and old messages dimmed
  const allMessages = game.oldMessages.concat(game.messages);
  const showMessages = allMessages.slice(-Math.min(5, allMessages.length));
  const newMsgCount = game.messages.length;
  const logLines: string[] = new Array(showMessages.length);
  for (let i = 0; i < showMessages.length; i++) {
    const tag = i >= showMessages.length - newMsgCount ? "white-fg" : "grey-fg";
    logLines[i] = `{${tag}}${showMessages[i]}{/}\n`;
  }
  view.log.setContent(logLines.join(""));

  return game;
}
