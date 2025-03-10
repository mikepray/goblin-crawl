import blessed from "blessed";
import { printDialogScreen } from "./dialog";
import { descend } from "./levels";
import { loadCreatures, loadFeatures, loadItems } from "./loader";
import { movePlayer } from "./move";
import { Actor, Coords, Feature, Game, Item, Level, Player } from "./types";
import { coordsToKey, isTileInFieldOfVision } from "./utils";

export const dungeonWidth = 48;
export const dungeonHeight = 24;

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

function gameLoop() {
  let view = initView();
  let game = initGame();
  const FRAME_RATE = 30;
  const INTERVAL = Math.floor(1000 / FRAME_RATE); // ~33.33ms

  const introBox = startScreen(view);
  view.screen.render();

  const startScreenInterval = setInterval(() => {
    if (inputBuffer.length > 0) {
      inputBuffer.shift();
      introBox.destroy();
      clearInterval(startScreenInterval);
      return;
    }
  }, INTERVAL);

  const interval = setInterval(() => {
    if (game.gameOver) {
      clearInterval(interval);
      return;
    }

    printScreen(game, view);
    if (inputBuffer.length > 0) {
      game = movePlayer(game, inputBuffer.shift());
    }
    view.screen.render();
  }, INTERVAL);
}

gameLoop();

function initGame(): Game {
  let items = loadItems();
  let features = loadFeatures();
  let messages = new Array<string>();

  let game: Game = {
    turnCount: 0,
    actors: new Map<string, Actor>(),
    tiles: new Map<string, Coords>(),
    features: new Map<string, Feature>(),
    player: {
      x: 0,
      y: 0,
      inventory: [items.find((item) => item.name === "skrunt egg")],
      glyph: "@",
      name: "player",
      description: "It's you",
    } as Player,
    gameOver: false,
    isScreenDirty: true,
    dialogPointer: 0,
    currentBranchLevel: { branchName: "D", level: 0 },
    allFeatures: features,
    allCreatures: loadCreatures(),
    allItems: items,
    messages: messages,
    levels: new Map<string, Level>(),
    items: new Map<string, Array<Item>>(),
    seenTiles: new Map<string, Coords>(),
    dialogMode: "game",
  };

  // welcome message

  return descend(game, {
    branchName: "D",
    level: game.currentBranchLevel.level + 1,
  });
}

function printScreen(game: Game, view: View): Game {
  let topbarContent = `{bold}GoblinCrawl{/bold} | ${game.currentBranchLevel.branchName}:${game.currentBranchLevel.level} Turn: ${game.turnCount}\n`;

  view.topbar.setContent(topbarContent);

  let out = "";
  if (game.dialogMode === "dialog") {
    out = out.concat(printDialogScreen(game, out));
  } else if (game.dialogMode === "inventory") {
    out = out.concat(`Inventory\n`);
    for (
      let i = 0;
      game.player.inventory && i < game.player.inventory?.length;
      i++
    ) {
      out = out.concat(
        `${game.dialogPointer === i + 1 ? "→ " : ""}${i + 1}: ${
          game.player.inventory[i].name
        } - ${game.player.inventory[i].description}\n`
      );
    }

    // fill the rest of the screen with whitespace (start at 1 for inventory screen title)
    for (
      let i = 1;
      i < dungeonHeight - (game.player.inventory?.length || 0);
      i++
    ) {
      out = out.concat("\n");
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
            out = out.concat(`{grey-fg}.{/grey-fg}`);
          } else out = out.concat("#");
        } else {
          // if not in field of vision, render the tile dimmer if the player has already seen it
          if (game.seenTiles.has(coordsToKey({ x: x, y: y }))) {
            if (game.features.has(coordsToKey({ x: x, y: y }))) {
              // show seen features first
              const feature = game.features.get(coordsToKey({ x: x, y: y }));
              out = out.concat(`{grey-fg}${feature?.glyph}{/grey-fg}`);
            } else if (game.tiles.has(coordsToKey({ x: x, y: y }))) {
              out = out.concat(`{grey-fg}.{/grey-fg}`);
            } else {
              out = out.concat(`{grey-fg}#{/grey-fg}`);
            }
          } else {
            out = out.concat(" ");
          }
        }
      }
      out = out.concat("\n");
    }
  }

  view.map.setContent(out);

  let logOut = "";
  if (game.dialogMode === "game" || game.dialogMode === "inventory") {
    // messages
    for (let j = 0; j < 5 - game.messages.length; j++) {
      logOut = logOut.concat(`\n`);
    }
    for (let i = 0; i < Math.min(5, game.messages.length); i++) {
      // show last 5 messages
      if (i < game.messages.length - 1) {
        // Older messages are dimmed
        logOut = logOut.concat(
          `{grey-fg}${game.messages[i] || ""}{/grey-fg}\n`
        );
      } else if (i === game.messages.length - 1) {
        // Most recent message is full brightness
        logOut = logOut.concat(`${game.messages[i] || ""}\n`);
      }
      if (game.messages.length > 5) {
        game.messages.shift();
      }
    }
  }

  view.log.setContent(logOut);

  return game;
}

type View = {
  screen: blessed.Widgets.Screen;
  topbar: blessed.Widgets.BoxElement;
  map: blessed.Widgets.BoxElement;
  log: blessed.Widgets.BoxElement;
};

function initView(): View {
  const screen = blessed.screen({
    smartCSR: true, // Optimize for rendering
    title: "GoblinCrawl",
    tags: true,
  });
  screen.key(["C-c"], function () {
    return process.exit(0);
  });

  const topbar = blessed.box({
    parent: screen,
    top: 0,
    left: 0,
    height: 3,
    border: {
      type: "line",
    },
    style: {
      border: {
        fg: "green",
      },
    },
    tags: true,
  });

  const map = blessed.box({
    parent: screen,
    top: 3,
    left: 0,
    height: dungeonHeight,
    border: {
      type: "line",
    },
    style: {
      border: {
        fg: "blue",
      },
    },
    tags: true,
  });

  const log = blessed.box({
    parent: screen,
    top: dungeonHeight + 3,
    left: 0,
    width: "100%",
    height: 7,
    border: {
      type: "line",
    },
    style: {
      border: {
        fg: "green",
      },
    },
    tags: true,
    scrollable: true,
  });
  return {
    topbar: topbar,
    screen: screen,
    map: map,
    log: log,
  };
}

function startScreen(view: View) {
  const introBox = blessed.box({
    parent: view.map,
    style: {
      bg: "green",
    },
    height: "100%",
    align: "center",
    valign: "middle",
  });

  const introText = blessed.box({
    parent: introBox,
    top: "20%", // Position from top
    height: "60%", // Give it most of the space
    style: {
      fg: "black",
      bold: true,
      bg: "green",
    },
    align: "center",
    valign: "middle",
  });

  const startHint = blessed.box({
    parent: introBox,
    top: "80%", // Position below the intro text
    height: "20%", // Take remaining space
    style: {
      fg: "black",
      bg: "green",
      bold: true,
    },
    align: "center",
    valign: "middle",
  });
  // welcome screen
  introText.setContent(`
  ________        ___.    .__   .__         _________                         .__   
 /  _____/   ____ \\_ |__  |  |  |__|  ____  \\_   ___ \\_______ _____  __  _  __|  |  
/   \\  ___  /  _ \\ | __ \\ |  |  |  | /    \\ /    \\  \\/\\_  __ \\\\__  \\ \\ \\/ \\/ /|  |  
\\    \\_\\  \\(  <_> )| \\_\\ \\|  |__|  ||   |  \\\\     \\____|  | \\/ / __ \\_\\     / |  |__
\\______  / \\____/ |___  /|____/|__||___|  / \\______  /|__|   (____  / \\/\\_/  |____/
       \\/             \\/                \\/         \\/             \\/               
                      
       `);

  // welcome screen
  startHint.setContent(`Press any key to start...`);
  return introBox;
}
