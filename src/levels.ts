import { dungeonWidth, dungeonHeight } from "./game";
import { Game, BranchLevel, Coords, Feature, Actor, Upstairs, Downstairs, Player } from "./types";
import { coordsToKey, branchLevelToKey, getRandomValidTile } from "./utils";

export function buildRoomsAndHallways(
  game: Game,
  branch: BranchLevel
): Map<string, Coords> {
  // a level consists of an unordered Map of (coordKey => coords) which represents the empty tiles
  let tiles = new Map<string, Coords>();
  let midpoints = new Array();

  const numRooms = Math.floor(Math.random() * 3) + 5;
  for (let i = 0; i < numRooms; i++) {
    let room = buildRoom();
    midpoints.push(room.midpoint);
    tiles = new Map([...tiles, ...room.tiles]);
  }

  // draw hallways between midpoints
  for (let i = 0; i < midpoints.length; i++) {
    for (let j = 0; j < midpoints.length; j++) {
      if (i === j) continue;
      let midpoint1 = midpoints[i];
      let midpoint2 = midpoints[j];

      // find the midpoint with the least x coord, start iterating from there to the next midpoint adding tiles
      // then iterate from that midpoint's Y to the next midpoint's Y
      let midpointWithLeastX =
        midpoint1.x < midpoint2.x ? midpoint1 : midpoint2;
      let leastX = midpoint1.x < midpoint2.x ? midpoint1.x : midpoint2.x;
      let greatestX = midpoint1.x < midpoint2.x ? midpoint2.x : midpoint1.x;
      let leastY = midpoint1.y < midpoint2.y ? midpoint1.y : midpoint2.y;
      let greatestY = midpoint1.y < midpoint2.y ? midpoint2.y : midpoint1.y;

      for (let k = 1; leastX + k <= greatestX; k++) {
        tiles.set(coordsToKey({ x: leastX + k, y: midpointWithLeastX.y }), {
          x: leastX + k,
          y: midpointWithLeastX.y,
        });
      }

      for (let k = 1; leastY + k <= greatestY; k++) {
        tiles.set(coordsToKey({ x: greatestX, y: leastY + k }), {
          x: greatestX,
          y: leastY + k,
        });
      }
    }
  }

  return tiles;
}

export function buildRoom() {
  let tiles = new Map<string, Coords>();

  let w = Math.floor(Math.random() * 7) + 6;
  let h = Math.floor(Math.random() * 7) + 6;

  // randomly generate origin point of room (top left)
  let originX = Math.floor(Math.random() * (dungeonWidth - w));
  let originY = Math.floor(Math.random() * (dungeonHeight - h));

  // add room to tile set
  for (let i = 0; i < h; i++) {
    for (let j = 0; j < w; j++) {
      tiles.set(coordsToKey({ x: originX + j, y: originY + i }), {
        x: originX + j,
        y: originY + i,
      });
    }
  }

  let midpoint = {
    x: Math.floor(originX + w / 2),
    y: Math.floor(originY + h / 2),
  };

  // place them by adding their coords to the set
  return { tiles: tiles, midpoint: midpoint };
}

export function saveLevel(game: Game) {
  // save the current state
  if (game.currentBranchLevel.branchName === "D" && game.currentBranchLevel.level !== 0) {
    let currentLevel = game.levels.get(branchLevelToKey(game.currentBranchLevel));
    if (currentLevel) {
      // copy map
      currentLevel.actors = new Map(game.actors);
      currentLevel.tiles = new Map(game.tiles);
      currentLevel.features = new Map(game.features);
      currentLevel.seenTiles = new Map(game.seenTiles);
    } else {
      game.debugOutput.push("error - could not save current level");
    }
  }
  return game;
}

export function loadLevel(game: Game, nextBranchLevel: BranchLevel) {
  // TODO iterate game loop n times since the player visited, max 20

  // load the level
  let nextLevel = game.levels.get(branchLevelToKey(nextBranchLevel));

  if (nextLevel) {
    game.tiles = new Map(nextLevel.tiles);
    game.actors = new Map(nextLevel.actors);
    game.features = new Map(nextLevel.features);
    game.currentBranchLevel = nextBranchLevel;
    game.seenTiles = new Map(nextLevel.seenTiles);
  } else {
    game.debugOutput.push("error - could not load next level");
  }
  return game;
}

export function teleportPlayer(game: Game, spawnAtFeature: string) {
  // find feature to spawn player at (downstairs, upstairs, portal, etc)
  let featureToSpawnAt = Array.from(game.features.values()).find(
    (feature) => feature.name === spawnAtFeature
  );
  if (featureToSpawnAt) {
    // move the player to the spawn tile
    game.actors.delete(coordsToKey({ ...game.player }));
    game.player.x = featureToSpawnAt.x;
    game.player.y = featureToSpawnAt.y;
    game.actors.set(coordsToKey({ ...game.player }), game.player);
  } else {
    game.debugOutput.push(
      `error - could not find feature ${spawnAtFeature} to spawn player`
    );
  }
  return game;
}

export function ascend(game: Game, nextBranchLevel: BranchLevel) {
  game = saveLevel(game);
  game = loadLevel(game, nextBranchLevel);
  game = teleportPlayer(game, "Downstairs");
  game.isScreenDirty = true
  return game;
}

export function descend(game: Game, nextBranchLevel: BranchLevel) {
  game = saveLevel(game);

  // see if the next level exists
  if (game.levels.has(branchLevelToKey(nextBranchLevel))) {
    game = loadLevel(game, nextBranchLevel);
    game = teleportPlayer(game, "Upstairs");
    game.isScreenDirty = true;
    return game;
  }

  game.features = new Map<string, Feature>();
  game.actors = new Map<string, Actor>();
  game.seenTiles = new Map<string, Coords>();
  game.tiles = buildRoomsAndHallways(game, nextBranchLevel);
  let playerTile;
  if (nextBranchLevel.branchName === "D" && nextBranchLevel.level === 1) {
    // if the player is on the first level, don't show the upstairs and place the player randomly
    playerTile = getRandomValidTile(game.tiles, game.actors);
  } else {
    // otherwise set the upstairs tile
    let upstairsTile = getRandomValidTile(game.tiles);
    const upstairs = {
      ...upstairsTile,
      glyph: "<",
      name: "Upstairs",
    } as Upstairs;
    // set the player to that tile as if they had just come from upstairs
    game.features.set(coordsToKey(upstairsTile), upstairs);
    playerTile = upstairsTile;
  }
  // set the downstairs tile
  let downstairsTile = getRandomValidTile(game.tiles, game.actors);
  const downstairs = {
    ...downstairsTile,
    glyph: ">",
    name: "Downstairs",
  } as Downstairs;

  game.features.set(coordsToKey(downstairsTile), downstairs);
  const player = { ...playerTile, glyph: "@", name: "player" } as Player;
  game.actors.set(coordsToKey(playerTile), player);
  game.player = player;

  let possibleLevelCreatures = game.creatures.filter((creature) => {
    return creature.branchSpawnRates?.some(
      (rate) => rate.branchName === nextBranchLevel.branchName
    );
  });

  let spawnedActorNums = new Map<string, number>();
  let attemptedSpawnedActorNums = new Map<string, number>();
  // Place creatures randomly on the map
  for (let i = 0; i < possibleLevelCreatures.length; i++) {
    let creature = possibleLevelCreatures[i];
    // determine if the creature should spawn
    const branchSpawnRate = creature.branchSpawnRates?.find(
      (rate) =>
        rate.branchName === nextBranchLevel.branchName &&
        rate.level === nextBranchLevel.level
    );

    // if there's not more than the max allowable spawned already
    // use a frequency map of spawned creatures by their creature name
    let spawnedCreature = (spawnedActorNums.get(creature.name) || 0) + 1;
    if (spawnedCreature > (branchSpawnRate?.maxSpawnNum || 1)) {
      continue;
    }
    spawnedActorNums.set(creature.name, spawnedCreature);

    // try to spawn as many times as maxSpawnNum (even if it doesn't spawn)
    let attemptedSpawnedCreature =
      (attemptedSpawnedActorNums.get(creature.name) || 0) + 1;
    if (attemptedSpawnedCreature > (branchSpawnRate?.maxSpawnNum || 1)) {
      continue;
    }
    attemptedSpawnedActorNums.set(creature.name, attemptedSpawnedCreature);
    // spawn this creature again until it hits the max spawn rate
    i--;
    // and if the RNG says it should spawn
    if (branchSpawnRate && Math.random() * 100 <= branchSpawnRate.spawnChance) {
      let creatureCoords = getRandomValidTile(game.tiles, game.actors);
      creature.x = creatureCoords.x;
      creature.y = creatureCoords.y;
      game.actors.set(coordsToKey(creatureCoords), { ...creature });
    }
  }
  game.isScreenDirty = true;
  game.levels.set(branchLevelToKey(nextBranchLevel), {
    ...nextBranchLevel,
    parentLevel: { ...game.currentBranchLevel },
    tiles: { ...game.tiles },
    actors: { ...game.actors },
    features: { ...game.features },
    seenTiles: {...game.seenTiles},
  });
  game.currentBranchLevel = nextBranchLevel;
  return game;
}