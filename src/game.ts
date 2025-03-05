import { getWanderingMoveDelta, moveActor } from "./actors";
import { loadCreatures } from "./loadCreatures";
import {
  Player,
  Actor,
  Coords,
  Game,
  InputKey,
  Creature,
  Branch,
  Upstairs,
  Downstairs,
  Feature,
} from "./types";
import { coordsToKey, getRandomValidTile } from "./utils";

export const dungeonWidth = 48;
export const dungeonHeight = 24;

function initGame(): Game {
  let game = {
    actors: new Map<string, Actor>(),
    tiles: new Map<string, Coords>(),
    features: new Map<string, Feature>(),
    player: { x: 0, y: 0 } as Player,
    gameOver: false,
    isScreenDirty: true,
    dialogPointer: 0,
    currentBranch: { branchName: "D", level: 1 },
    creatures: loadCreatures(),
    debugOutput: new Array<string>(0),
  };

  return descendLevel(game);
}

function buildRoomsAndHallways(
  game: Game,
  branch: Branch
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

function buildRoom() {
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

function descendLevel(game: Game) {
  game.features = new Map<string, Feature>();
  game.actors = new Map<string, Actor>();
  game.tiles = buildRoomsAndHallways(game, game.currentBranch);
  let playerTile;
  if (game.currentBranch.branchName === "D" && game.currentBranch.level === 1) {
    // if the player is on the first level, don't show the upstairs and place the player randomly
    playerTile = getRandomValidTile(game.tiles, game.actors);
  } else {
    // set the upstairs tile
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
      (rate) => rate.branchName === game.currentBranch.branchName
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
        rate.branchName === game.currentBranch.branchName && rate.level === game.currentBranch.level
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
  return game;
}

function printScreen(game: Game): Game {
  if (game.isScreenDirty) {
    console.clear();
    let out = "GoblinCrawl \n";
    if (game.activeDialog) {
      // active dialog
      out = out.concat(
        `\n${game.interactingActor?.name} says: \n\n> ${game.activeDialog.dialog}\n\n`
      );
      if (game.activeDialog.creatureResponses) {
        for (let i = 0; i < game.activeDialog.creatureResponses?.length; i++) {
          out = out.concat(
            `${i + 1}: ${
              game.activeDialog.creatureResponses[i].playerResponse
            }\n`
          );
        }
        out = out.concat(
          "\nPress Number keys to answer or Escape to exit dialog..."
        );
      } else {
        out = out.concat("\n\nPress any key to exit dialog...");
      }
    } else {
      // dungeon screen
      for (let y = 0; y < dungeonHeight; y++) {
        for (let x = 0; x < dungeonWidth; x++) {
          // display order:
          // actors, features, tiles
          const actor = game.actors.get(coordsToKey({ x: x, y: y }));
          const feature = game.features.get(coordsToKey({ x: x, y: y }));
          if (actor) {
            out = out.concat(actor.glyph);
          } else if (feature) {
            out = out.concat(feature.glyph);
          } else if (game.tiles.has(coordsToKey({ x: x, y: y }))) {
            out = out.concat(".");
          } else out = out.concat("#");
        }
        out = out.concat("\n");
      }
    }

    for (let i = 0; i < game.debugOutput.length; i++) {
      out = out.concat(`${game.debugOutput.shift() || ""}\n`);
    }

    console.log(out);
    game.isScreenDirty = false;
  }
  return game;
}

function movePlayer(game: Game) {
  const nextInput = inputBuffer.shift();
  if (!game.activeDialog) {
    let playerMove: Coords = { x: 0, y: 0 };
    if (nextInput) {

      if (nextInput === ">") {
        // descend level
        game.currentBranch = {branchName: "D", level: game.currentBranch.level + 1};
        return descendLevel(game);
      }

      if (nextInput === InputKey.UP) {
        playerMove.y--;
      } else if (nextInput === InputKey.DOWN) {
        playerMove.y++;
      } else if (nextInput === InputKey.LEFT) {
        playerMove.x--;
      } else if (nextInput === InputKey.RIGHT) {
        playerMove.x++;
      } else if (nextInput === InputKey.PERIOD) {
        // do nothing
      }

      // move player first
      game = moveActor(game, game.player, playerMove);

      // copy list to prevent concurrent modification
      const previousActorList = new Map(game.actors);

      previousActorList.forEach((actor) => {
        let moveDelta = { x: 0, y: 0 };
        if (actor.name !== "player") {
          if ("movementType" in actor) {
            const creature = actor as Creature;
            if (creature.movementType === "WANDERING")
              moveDelta = getWanderingMoveDelta(creature);
          }
        }

        game = moveActor(game, actor, moveDelta);
      });
    }
  } else {
    // active dialog
    if (
      nextInput === InputKey.ESCAPE ||
      (nextInput !== undefined &&
        game.activeDialog.creatureResponses === undefined)
    ) {
      game.activeDialog = undefined;
      game.interactingActor = undefined;
      game.isScreenDirty = true;
      return game;
    }
    if (game.activeDialog.creatureResponses && nextInput !== undefined) {
      if (
        parseInt(nextInput) - 1 >= 0 &&
        parseInt(nextInput) - 1 < game.activeDialog.creatureResponses.length
      ) {
        game.activeDialog =
          game.activeDialog.creatureResponses[parseInt(nextInput) - 1];
        game.isScreenDirty = true;
      }
    }
  }
  return game;
}

function gameLoop(game: Game) {
  printScreen(game);
  game = movePlayer(game);
  if (!game.gameOver) {
    setTimeout(() => {
      gameLoop(game);
    }, 10);
  } else {
    console.log(`You lose!`);
  }
}

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

gameLoop(initGame());
