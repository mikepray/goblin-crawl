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
        tiles.set(coordsToKey({ x, y }), { x, y });
      } else if (y < 5 || y > 16) {
        tiles.set(coordsToKey({ x, y }), { x, y });
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
  // const kobold = creatures.find((c) => c.name === "kobold");
  // if (kobold) {
  //   actors.set(coordsToKey({ x: 18, y: 10 }), { ...kobold, x: 18, y: 10 });
  //   // actors.set(coordsToKey({x:19, y: 10}), {...kobold, x: 19, y: 10});
  //   // actors.set(coordsToKey({x:20, y: 10}), {...kobold, x: 20, y: 10});
  // }

  const rat = creatures.find((c) => c.name === "rat");
  if (rat) {
    actors.set(coordsToKey({ x: 18, y: 10 }), { ...rat, x: 18, y: 10 });
    actors.set(coordsToKey({ x: 19, y: 10 }), { ...rat, x: 19, y: 10 });
    actors.set(coordsToKey({ x: 20, y: 10 }), { ...rat, x: 20, y: 10 });
    actors.set(coordsToKey({ x: 21, y: 10 }), { ...rat, x: 21, y: 10 });
    actors.set(coordsToKey({ x: 22, y: 10 }), { ...rat, x: 22, y: 10 });
    actors.set(coordsToKey({ x: 23, y: 10 }), { ...rat, x: 23, y: 10 });
    actors.set(coordsToKey({ x: 24, y: 10 }), { ...rat, x: 24, y: 10 });
    actors.set(coordsToKey({ x: 25, y: 10 }), { ...rat, x: 25, y: 10 });
    actors.set(coordsToKey({ x: 26, y: 10 }), { ...rat, x: 26, y: 10 });
    actors.set(coordsToKey({ x: 27, y: 10 }), { ...rat, x: 27, y: 10 });
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
      armor: 1,
      hitDie: 3,
      XP: 900,
      dodging: 3,
      cunning: 3,
      savagery: 3,
      fortitude: 1,
      power: 1,
      maxHp: 100,
      currentHp: 100,
      level: 1,
      slots: {},
      naturalWeapon: {
        name: "fists",
        attackBonus: 1,
        damageBonus: 0,
        damageDieNum: 1,
        damageDie: 3,
      },
    } as Player,
    gameOver: false,
    isScreenDirty: true,
    dialogPointer: 0,
    currentBranchLevel: { branchName: "Arena", level: 1 },
    allFeatures: features,
    allCreatures: creatures,
    allItems: items,
    messages: [],
    oldMessages: [],
    levels: new Map<string, Level>(),
    items: new Map<string, Array<Item>>(),
    seenTiles: new Map<string, Coords>(),
    visibleActors: new Array<Actor>(),
    dialogMode: "game",
  };

  const khopesh = items.find((i) => i.name === "khopesh");
  if (khopesh && game.player.slots) {
    game.player.slots.weapon = khopesh;
  }

  // Add player to actors
  actors.set(coordsToKey({ x: 2, y: 2 }), game.player);

  // clear current level's features, actors, etc
  game.seenTiles = new Map<string, Coords>();

  return game;
}
