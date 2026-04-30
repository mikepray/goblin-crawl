import { allBranches } from "./branches";
import { dungeonHeight, dungeonWidth } from "./game";
import { buildRoomsAndHallways } from "./layouts/roomsAndHallways";
import {
  Actor,
  BranchLevel,
  Coords,
  CoordsMap,
  Creature,
  Downstairs,
  Feature,
  Game,
  Item,
  SpawnInfo,
  Upstairs,
} from "./types";
import {
  branchLevelToKey,
  coordsToKey,
  getRandomInt,
  getRandomValidTile,
} from "./utils";

export function spawnLevel(game: Game, nextBranchLevel: BranchLevel) {
  // clear current level's features, actors, etc
  game.features = new Map<string, Feature>();
  game.actors = new Map<string, Actor>();
  game.seenTiles = new Map<string, Coords>();
  game.items = new Map<string, Array<Item>>();
  //nextBranchLevel.branch.layoutConfigs[getRandomArbitrary(0, nextBranchLevel.branch.layoutConfigs?.length - 1)]
  game.tiles = buildRoomsAndHallways();
  game.messages = new Array<string>();

  let playerTile;
  // place stairs
  if (nextBranchLevel.level === 1) {
    if (nextBranchLevel.branch.name === "Dungeon") {
      // if the player is on the first level of the Dungeon, don't show the upstairs and place the player randomly
      playerTile = getRandomValidTile(game.tiles, game.actors);
    } else {
      // if the player is on the first level of a given branch, show the upstairs tile to the parent branch
      let upstairsTile = getRandomValidTile(game.tiles);
      const upstairs = {
        ...upstairsTile,
        glyph: "<",
        name: "Upstairs",
        description: `Stairs returning to the ${nextBranchLevel.branch.parentBranch?.name}. Press < to ascend`,
      } as Upstairs;
      // set the player to that tile as if they had just come from upstairs
      game.features.set(coordsToKey(upstairsTile), upstairs);
      playerTile = upstairsTile;

      game.messages.push(`Welcome to the ${nextBranchLevel.branch.name}!`);
    }
  } else {
    // otherwise set the upstairs tile
    let upstairsTile = getRandomValidTile(game.tiles);
    const upstairs = {
      ...upstairsTile,
      glyph: "<",
      name: "Upstairs",
      description: "Stairs going up one level. Press < to ascend",
    } as Upstairs;
    // set the player to that tile as if they had just come from upstairs
    game.features.set(coordsToKey(upstairsTile), upstairs);
    playerTile = upstairsTile;

    game.messages.push("You climb down the stairs");
  }

  // if it's the last level in the branch, spawn all child branch staircases
  if (
    (nextBranchLevel.branch.name !== game.currentBranchLevel.branch.name &&
      nextBranchLevel.level === nextBranchLevel.branch.maxLevel) ||
    (nextBranchLevel.branch.name === game.currentBranchLevel.branch.name &&
      nextBranchLevel.level === game.currentBranchLevel.branch.maxLevel)
  ) {
    // find every branch with a parent branch name equal to the current branch name
    const childBranches = allBranches.filter(
      (b) => b.parentBranch?.name === nextBranchLevel.branch.name,
    );

    if (childBranches && childBranches.length > 0) {
      for (const branch of childBranches) {
        let downstairsTile = getRandomValidTile(game.tiles, game.actors);
        const downstairs = {
          ...downstairsTile,
          glyph: ">",
          name: `Stairs to the ${branch.name}`,
          toBranchName: branch.name,
          color: branch.glyphColor,
          description: `${branch.description}`,
        } as Downstairs;
        game.features.set(coordsToKey(downstairsTile), downstairs);
      }
    }
  } else {
    // set the next level downstairs tile
    let downstairsTile = getRandomValidTile(game.tiles, game.actors);
    const downstairs = {
      ...downstairsTile,
      glyph: ">",
      name: "Downstairs",
      description: `Stairs to the next level of the ${nextBranchLevel.branch.name}. Press > to descend`,
    } as Downstairs;
    game.features.set(coordsToKey(downstairsTile), downstairs);
  }

  // place player
  game.player.x = playerTile.x;
  game.player.y = playerTile.y;
  game.actors.set(coordsToKey(playerTile), game.player);

  // spawn features, deconflict with already placed actors
  let features = spawnThings(
    game.allFeatures,
    nextBranchLevel,
    game.tiles,
    new Map([...game.actors, ...game.features]), // union of actors and features
  );
  for (let i = 0; i < features.length; i++) {
    game.features.set(features[i].coords, features[i].thing);
  }

  // spawn creatures, deconflict with already placed actors
  let creatures = spawnThings(
    game.allCreatures,
    nextBranchLevel,
    game.tiles,
    game.actors,
  );

  for (let i = 0; i < creatures.length; i++) {
    game.actors.set(creatures[i].coords, creatures[i].thing);
  }

  // spawn items, deconflict with already placed items
  let items = spawnThings(
    game.allItems,
    nextBranchLevel,
    game.tiles,
    undefined,
  );

  // add flattened items to tile stack of items
  for (const item of items) {
    let itemStack = game.items.get(item.coords);
    if (!itemStack) {
      itemStack = new Array<Item>();
    }
    itemStack.push(item.thing as Item);
    game.items.set(item.coords, itemStack);
  }

  game.isScreenDirty = true;
  game.levels.set(branchLevelToKey(nextBranchLevel), {
    ...nextBranchLevel,
    parentLevel: { ...game.currentBranchLevel },
    tiles: { ...game.tiles },
    actors: { ...game.actors },
    features: { ...game.features },
    seenTiles: { ...game.seenTiles },
    items: { ...game.items },
  });
  game.currentBranchLevel = nextBranchLevel;
  return game;
}

function chanceToSpawn(thing: SpawnInfo, branchLevel: BranchLevel) {
  const maxLevel = branchLevel.branch.maxLevel;
  const t = getRandomInt(0, 100);
  let spawnRateWeight = 0;
  if (thing.distribution === "early") {
    // reduce spawn chance by the bigger level numbers
    spawnRateWeight = 0.03 * (maxLevel - branchLevel.level);
  } else if (thing.distribution === "late") {
    spawnRateWeight = 0.03 * branchLevel.level;
  } else if (thing.distribution === "mid") {
    if (branchLevel.level < maxLevel / 2) {
      spawnRateWeight = 0.03 * (maxLevel / 2 - branchLevel.level);
    } else {
      spawnRateWeight = 0.03 * branchLevel.level - (maxLevel - maxLevel / 2);
    }
  }

  // determined spawn level logic handled elsewhere
  return t < thing.spawnRate - thing.spawnRate * spawnRateWeight;
}

function canThingSpawn(spawnArray: Array<SpawnInfo>, branchLevel: BranchLevel) {
  const thing = spawnArray.find(
    (s) => s.branchName === branchLevel.branch.name,
  );
  if (!thing) {
    return false;
  }
  const atDeterminedSpawn =
    thing.distribution === "determined" &&
    branchLevel.level === thing.determinedSpawnLevel &&
    branchLevel.branch === branchLevel.branch;

  // if the thing is between the min/max levels, or if those levels are undefined
  const inSpawnableLevels =
    (thing.minLevel === undefined || branchLevel.level >= thing.minLevel) &&
    (thing.maxLevel === undefined || branchLevel.level <= thing.maxLevel);

  const isUniquelySpawnedAlready = thing.unique && thing.spawnedNum > 0;

  return (
    thing.branchName === branchLevel.branch.name &&
    (atDeterminedSpawn || inSpawnableLevels) &&
    !isUniquelySpawnedAlready
  );
}

function spawnThings(
  spawnableThings: Array<Creature | Item | Feature>, // the list of possible things that can be spawned
  branchLevel: BranchLevel, // the branch level to spawn into
  tiles: CoordsMap, // the valid set of tiles in the current level
  deconflictWith: Map<string, Actor> | undefined, // things to deconflict with
) {
  const spawnedThings = new Array<{
    coords: string;
    thing: Creature | Item | Feature;
  }>();
  const thingsToSpawn = new Array<Creature | Item | Feature>();

  for (const thing of spawnableThings) {
    if (canThingSpawn(thing.spawnInfo, branchLevel)) {
      // if it hasn't spawned yet at the final level, spawn it
      // if it's at the determined spawn level (ignore chance)
      const spawnInfo = thing.spawnInfo.find(
        (s) => s.branchName === branchLevel.branch.name,
      );
      if (!spawnInfo) {
        continue;
      }
      const mustFinallySpawn =
        spawnInfo.mustSpawn &&
        spawnInfo.spawnedNum < 1 &&
        branchLevel.level === spawnInfo.maxLevel;
      const determinedToSpawn =
        spawnInfo.distribution === "determined" &&
        spawnInfo.determinedSpawnLevel === branchLevel.level &&
        spawnInfo.spawnedNum < 1;

      if (mustFinallySpawn || determinedToSpawn) {
        spawnInfo.spawnedNum++;
        thingsToSpawn.push(thing);
      } else {
        for (let j = 0; j < spawnInfo.frequency; j++) {
          if (chanceToSpawn(spawnInfo, branchLevel)) {
            spawnInfo.spawnedNum++;
            thingsToSpawn.push(thing);
          }
        }
      }
    }
  }

  for (const thing of thingsToSpawn) {
    let spawnedThingCoords = getRandomValidTile(tiles, deconflictWith);
    thing.x = spawnedThingCoords.x;
    thing.y = spawnedThingCoords.y;
    spawnedThings.push({
      coords: coordsToKey(spawnedThingCoords),
      thing: { ...thing },
    });
  }

  return spawnedThings;
}
