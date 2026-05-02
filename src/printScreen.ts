import { printDialogScreen } from "./dialog";

import { View } from "./init";
import { printInventoryScreen, printStatusScreen } from "./inventory";
import { printLevelUpScreen } from "./levelUpScreen";
import { Coords, CoordsMap, Game } from "./types";
import { isTileInFieldOfVision } from "./utils";

export const dungeonWidth = 100;
export const dungeonHeight = 100;
/** Blessed map box width (matches init.ts map.width). */
export const mapWidth = 70;
/** Blessed map box height (matches init.ts map.height / dungeonHeight). */
export const mapHeight = 24;

/** Inner map content cells (line border in init.ts). */
export const viewportCellWidth = mapWidth - 2;
export const viewportCellHeight = mapHeight - 2;

/**
 * World grid size for rendering and movement. Layouts can exceed the legacy
 * 100×100 constants; the viewport also samples cells up to roughly
 * player + viewportCellWidth/Height, so the grid must cover tile extents and
 * that window.
 */
export function getLogicalDungeonSize(
  tiles: CoordsMap,
  player: Coords,
): { width: number; height: number } {
  let maxX = -1;
  let maxY = -1;
  for (const c of tiles.values()) {
    maxX = Math.max(maxX, c.x);
    maxY = Math.max(maxY, c.y);
  }
  if (tiles.size === 0) {
    return { width: dungeonWidth, height: dungeonHeight };
  }
  maxX = Math.max(maxX, player.x + viewportCellWidth);
  maxY = Math.max(maxY, player.y + viewportCellHeight);
  return {
    width: Math.max(dungeonWidth, maxX + 1),
    height: Math.max(dungeonHeight, maxY + 1),
  };
}

const mapBorderGame = { border: { fg: "white" as const } };
const mapBorderDim = { border: { fg: "black" as const } };
const statusBorderDim = mapBorderDim;
const statusBorderBright = { border: { fg: "white" as const } };

export function viewportPrintScreen(game: Game, view: View): Game {
  let topbarContent = `{bold}GoblinCrawl{/bold} > ${game.dialogMode} {x: ${game.player.x}, y: ${game.player.y}}\n`;

  view.topbar.setContent(topbarContent);

  view.statusRight.setContent(printInventoryScreen(game, ""));
  view.statusLeft.setContent(printStatusScreen(game, ""));
  view.statusContainer.style =
    game.dialogMode !== "inventory" ? statusBorderDim : statusBorderBright;

  if (game.dialogMode === "dialog") {
    view.map.setContent(printDialogScreen(game, ""));
  } else if (game.dialogMode === "levelUp") {
    view.map.setContent(printLevelUpScreen(game, ""));
  } else {
    const { visibleActors, player, ylines } = printDungeonScreen(game);
    game.visibleActors = visibleActors;

    view.map.style = game.dialogMode === "game" ? mapBorderGame : mapBorderDim;

    const vw = viewportCellWidth;
    const vh = viewportCellHeight;
    const { width: worldW, height: worldH } = getLogicalDungeonSize(
      game.tiles,
      player,
    );

    const centerSx = Math.floor(vw / 2);
    const centerSy = Math.floor(vh / 2);
    const originX = Math.floor(player.x - centerSx);
    const originY = Math.floor(player.y - centerSy);
    game.xOffset = originX;
    game.yOffset = originY;

    const rows: string[] = new Array(vh);
    for (let sy = 0; sy < vh; sy++) {
      const dy = originY + sy;
      let row = "";
      for (let sx = 0; sx < vw; sx++) {
        const dx = originX + sx;
        if (dx < 0 || dx >= worldW || dy < 0 || dy >= worldH) {
          row += " ";
        } else {
          row += ylines[dy][dx];
        }
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

export function printDungeonScreen(game: Game) {
  const visibleActors = [];
  const player = game.player;
  const { width, height } = getLogicalDungeonSize(game.tiles, player);
  const ylines = new Array<Array<string>>(height);
  const branchGlyphColor = game.currentBranchLevel.branch.glyphColor;
  const wallGlyphLit = branchGlyphColor
    ? `${branchGlyphColor}#{/}`
    : "{white-fg}#{/}";

  // dungeon screen
  for (let y = 0; y < height; y++) {
    const xlines = new Array<string>(width);
    for (let x = 0; x < width; x++) {
      const key = `${x},${y}`;
      // field of vision
      if (
        game.seeAllTiles ||
        isTileInFieldOfVision({ x, y }, player, 8, game.tiles)
      ) {
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
  return { visibleActors, player, ylines };
}
