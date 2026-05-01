import blessed from "blessed";
import { allBranches, dungeon } from "./branches";

import { descend } from "./levels";
import { loadCreatures, loadFeatures, loadItems } from "./loader";
import { Actor, Coords, Feature, Game, Item, Level, Player } from "./types";
import { dungeonHeight, dungeonWidth, mapHeight } from "./printScreen";

export const defaultGame: Game = {
  turnCount: 0,
  actors: new Map<string, Actor>(),
  tiles: new Map<string, Coords>(),
  features: new Map<string, Feature>(),
  gameTurns: 0,
  player: {
    x: 0,
    y: 0,
    maxHp: 10,
    currentHp: 7,
    level: 1,
    XP: 0,
    hitDie: 3,
    glyph: "@",
    color: "{white-fg}{bold}",
    name: "player",
    description: "It's you",
    armor: 1,
    dodging: 3,
    cunning: 3,
    savagery: 3,
    fortitude: 1,
    power: 1,
    hpRegen: 1,
    hpRegenEveryNTurns: 15,
    naturalWeapon: {
      name: "fists",
      attackBonus: 1,
      damageBonus: 0,
      damageDieNum: 1,
      damageDie: 3,
    },
  } as Player,
  seeAllTiles: false,
  gameOver: false,
  isScreenDirty: true,
  dialogPointer: 0,
  allFeatures: [],
  allCreatures: [],
  allItems: [],
  messages: [],
  oldMessages: new Array<string>(),
  levels: new Map<string, Level>(),
  items: new Map<string, Array<Item>>(),
  seenTiles: new Map<string, Coords>(),
  dialogMode: "game",
  visibleActors: new Array<Actor>(),
  currentBranchLevel: {
    branch: dungeon,
    level: 0,
  },
  allBranches: allBranches,
  altarsConquered: 0,
  xOffset: 0,
  yOffset: 0,
};

export function initGame(): Game {
  let game = defaultGame;
  game.allItems = loadItems();
  game.allFeatures = loadFeatures();
  game.allCreatures = loadCreatures();
  game.messages = new Array<string>();
  const egg = game.allItems.find((item) => item.name === "egg");
  game.player.inventory = new Array<Item>();
  if (egg) {
    game.player.inventory?.push(egg);
  }
  game.player.slots = {
    body: game.allItems.find((item) => item.name === "rags"),
  };
  return descend(game, {
    branch: game.currentBranchLevel.branch,
    level: game.currentBranchLevel.level + 1,
  });
}

export type View = {
  screen: blessed.Widgets.Screen;
  topbar: blessed.Widgets.BoxElement;
  gameContainer: blessed.Widgets.BoxElement;
  map: blessed.Widgets.BoxElement;
  statusContainer: blessed.Widgets.BoxElement;
  statusRight: blessed.Widgets.BoxElement;
  statusLeft: blessed.Widgets.BoxElement;
  log: blessed.Widgets.BoxElement;
  layoutViewr: blessed.Widgets.BoxElement;
};

export function initView(): View {
  const screen = blessed.screen({
    // terminal: "xterm",
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

  const mainGameContainer = blessed.box({
    parent: screen,
    top: 3,
    left: 0,
    height: mapHeight,
    tags: true,
  });

  const map = blessed.box({
    parent: mainGameContainer,
    top: 0,
    left: 0,
    height: mapHeight,
    width: 70,
    border: {
      type: "line",
    },
    style: {
      border: {
        fg: "blue",
      },
      bg: "black",
      fg: "white",
    },
    tags: true,
  });

  const statusContainer = blessed.box({
    parent: mainGameContainer,
    top: 0,
    left: 70,
    height: mapHeight,
    border: {
      type: "line",
    },
    style: {
      border: {
        fg: "blue",
      },
      bg: "black",
      fg: "white",
    },
    tags: true,
  });

  const statusLeft = blessed.box({
    parent: statusContainer,
    top: 0,
    left: 0,
    height: mapHeight - 2,
    tags: true,
  });

  const statusRight = blessed.box({
    parent: statusContainer,
    top: 0,
    left: 30,
    height: mapHeight - 2,

    tags: true,
  });

  const log = blessed.box({
    parent: screen,
    top: mapHeight + 3,
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

  const layoutViewer = blessed.box({
    parent: screen,
    top: 0,
    left: 0,
    height: dungeonHeight + 2,
    width: dungeonWidth + 2,
    border: {
      type: "line",
    },
    style: {
      border: {
        fg: "blue",
      },
      bg: "black",
      fg: "white",
    },
    tags: true,
  });
  return {
    topbar: topbar,
    screen: screen,
    gameContainer: mainGameContainer,
    map: map,
    statusContainer: statusContainer,
    statusLeft: statusLeft,
    statusRight: statusRight,
    log: log,
    layoutViewr: layoutViewer,
  };
}

export function startScreen(view: View) {
  const green3 = "#00af00";
  const introBox = blessed.box({
    parent: view.gameContainer,
    style: {
      fg: "#000005",
      bg: "#3bd457",
      bold: true,
    },
    height: "95%",
    align: "center",
    valign: "middle",
  });

  const introText = blessed.box({
    parent: introBox,
    top: "20%", // Position from top
    height: "60%", // Give it most of the space
    style: {
      fg: "#000005",
      bg: "#3bd457",
      bold: true,
    },
    align: "center",
    valign: "middle",
  });

  const startHint = blessed.box({
    parent: introBox,
    top: "80%", // Position below the intro text
    height: "20%", // Take remaining space
    style: {
      fg: "#000005",
      bg: "#3bd457",
      bold: true,
    },
    align: "center",
    valign: "middle",
  });
  // welcome screen
  // prettier-ignore
  introText.setContent(`
 ________        ___.    .__   .__         _________                         .__
 /  _____/   ____ \\_ |__  |  |  |__|  ____  \\_   ___ \\_______ _____  __  _  __|  |
/   \\  ___  /  _ \\ | __ \\ |  |  |  | /    \\ /    \\  \\/\\_  __ \\\\__  \\ \\ \\/ \\/ /|  |
  \\    \\_\\  \\(  <_> )| \\_\\ \\|  |__|  ||   |  \\\\     \\____|  | \\/ / __ \\_\\     / |  |__
   \\________/ \\____/ |___  /|____/|__||___|  / \\______  /|__|   (____  / \\/\\_/  |____/
          \\/                \\/         \\/             \\/
   `);

  // welcome screen
  startHint.setContent(`Press any key to start...`);
  return introBox;
}
