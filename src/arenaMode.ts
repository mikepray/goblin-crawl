import { loadItems, loadFeatures, loadCreatures } from "./loader";
import { Game, Coords, Actor, Feature, Player, Level, Item } from "./types";
import { coordsToKey } from "./utils";

// Create a predefined arena layout for testing
export function initArenaMode(): Game {
  let items = loadItems();
  let features = loadFeatures();
  let messages = new Array<string>();
  let tiles = new Map<string, Coords>();
  let actors = new Map<string, Actor>();

  // create the arena
  for (let x = 2; x <= 30; x++) {
    for (let y = 2; y < 20; y++) {
      if (x !== 16) {
        tiles.set(coordsToKey({x, y}), {x, y});
      } else 
      if (y < 5 || y > 16) {
        tiles.set(coordsToKey({x, y}), {x, y});
      }
    }
  }

  // Add some test creatures
  const creatures = loadCreatures();
  // const goblin = creatures.find(c => c.name === "goblin");
  // if (goblin) {
  //   const testGoblin = {...goblin, x: 5, y: 5};
  //   actors.set(coordsToKey({x: 5, y: 5}), testGoblin);
  // }
  const kobold = creatures.find(c => c.name === "kobold");
  if (kobold) {
    actors.set(coordsToKey({x:18, y: 10}), {...kobold, x: 18, y: 10});
    actors.set(coordsToKey({x:19, y: 10}), {...kobold, x: 19, y: 10});
    actors.set(coordsToKey({x:20, y: 10}), {...kobold, x: 20, y: 10});
  }

  let game: Game = {
    turnCount: 0,
    actors: actors,
    tiles: tiles,
    features: new Map<string, Feature>(),
    player: {
      x: 2,
      y: 2,
      inventory: [items.find((item) => item.name === "skrunt egg")],
      glyph: "@",
      name: "player",
      description: "It's you",
    } as Player,
    gameOver: false,
    isScreenDirty: true,
    dialogPointer: 0,
    currentBranchLevel: { branchName: "Arena", level: 1 },
    allFeatures: features,
    allCreatures: creatures,
    allItems: items,
    messages: ["Arena Mode"],
    levels: new Map<string, Level>(),
    items: new Map<string, Array<Item>>(),
    seenTiles: new Map<string, Coords>(),
    dialogMode: "game",
  };

  // Add player to actors
  actors.set(coordsToKey({x: 2, y: 2}), game.player);

  // clear current level's features, actors, etc
  game.seenTiles = new Map<string, Coords>();
  return game;
}
