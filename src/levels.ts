import { spawnLevel } from "./spawn";
import { BranchLevel, Game } from "./types";
import { branchLevelToKey, coordsToKey } from "./utils";

export function saveLevel(game: Game) {
  // save the current state
  let currentLevel = game.levels.get(branchLevelToKey(game.currentBranchLevel));
  if (currentLevel) {
    // copy map
    currentLevel.actors = new Map(game.actors);
    currentLevel.tiles = new Map(game.tiles);
    currentLevel.features = new Map(game.features);
    currentLevel.seenTiles = new Map(game.seenTiles);
    currentLevel.items = new Map(game.items);
  } else {
    game.messages.push("error - could not save current level");
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
    game.items = new Map(nextLevel.items);
  } else {
    game.messages.push("error - could not load next level");
  }
  return game;
}

export function teleportPlayer(game: Game, spawnAtFeature: string) {
  // find feature to spawn player at (downstairs, upstairs, portal, etc)
  let featureToSpawnAt = Array.from(game.features.values()).find(
    (feature) => feature.name === spawnAtFeature,
  );
  if (featureToSpawnAt) {
    // move the player to the spawn tile
    game.actors.delete(coordsToKey({ ...game.player }));
    game.player.x = featureToSpawnAt.x;
    game.player.y = featureToSpawnAt.y;
    game.actors.set(coordsToKey({ ...game.player }), game.player);
  } else {
    game.messages.push(
      `error - could not find feature ${spawnAtFeature} to spawn player`,
    );
  }
  return game;
}

export function ascend(game: Game, nextBranchLevel: BranchLevel) {
  const formerBranch = game.currentBranchLevel.branch.name;
  game = saveLevel(game);
  game = loadLevel(game, nextBranchLevel);
  if (nextBranchLevel.branch.name !== formerBranch) {
    game = teleportPlayer(game, `Stairs to the ${formerBranch}`);
  } else {
    game = teleportPlayer(game, "Downstairs");
  }
  game.messages = new Array<string>();
  game.messages.push("You climb up the stairs");
  game.isScreenDirty = true;
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
  // otherwise spawn a new level
  return spawnLevel(game, nextBranchLevel);
}
