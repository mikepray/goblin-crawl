import { getWanderingMoveDelta, moveActor } from "./actors";
import { loadCreatures } from "./loader";
import {
  Player,
  Actor,
  Coords,
  Game,
  InputKey,
  Creature,
  Branch,
} from "./types";
import { coordsToKey } from "./utils";
import * as path from "path";

export const dungeonWidth = 48;
export const dungeonHeight = 24;

function initGame(): Game {
  // init screen
  let screen = Array(dungeonHeight)
    .fill(new Array(dungeonWidth))
    .map(() => Array(dungeonWidth).fill("."));

  let placedActors = new Map<string, Actor>();
  const x = Math.floor(Math.random() * dungeonWidth);
  const y = Math.floor(Math.random() * dungeonHeight);
  const player = { glyph: "@", name: "player", x: x, y: y };
  placedActors.set(coordsToKey({ x, y }), player as Player);

  // Load creatures from YAML file
  const creatures = loadCreatures();

  let game = {
    screen: screen,
    actorsByCoords: placedActors,
    player: player,
    gameOver: false,
    isScreenDirty: true,
    dialogPointer: 0,
    currentBranch: { branchName: "D", level: 1 },
    creatures: creatures,
  };

  return descendLevel(game, { branchName: "D", level: 1 });
}

function descendLevel(game: Game, branch: Branch) {
  let possibleLevelCreatures = game.creatures.filter((creature) => {
    return creature.branchSpawnRates?.some(
      (rate) => rate.branchName === branch.branchName
    );
  });

  // Place creatures randomly on the map
  for (const creature of possibleLevelCreatures) {
    // determine if the creature should spawn
    const branchSpawnRate = creature.branchSpawnRates?.find(
      rate => rate.branchName === branch.branchName
    );
    
    if (branchSpawnRate && Math.random() * 100 <= branchSpawnRate.spawnChance) {
      let placed = false;
      let attempts = 0;

      while (!placed && attempts < 100) {
        attempts++;
        let creatureCoords: Coords = {
          x: Math.floor(Math.random() * dungeonWidth),
          y: Math.floor(Math.random() * dungeonHeight),
        };

        // keep iterating if there's a collision in placement
        if (!game.actorsByCoords.has(coordsToKey(creatureCoords))) {
          creature.x = creatureCoords.x;
          creature.y = creatureCoords.y;
          game.actorsByCoords.set(coordsToKey(creatureCoords), creature);
          placed = true;
        }
      }

      
    }
  }
  return game;
}

function printScreen(game: Game) {
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
        out = out.concat("...\n\nPress any key to exit dialog...");
      }
    } else {
      // dungeon screen
      for (let y = 0; y < game.screen.length; y++) {
        for (let x = 0; x < game.screen[y].length; x++) {
          const actor = game.actorsByCoords.get(coordsToKey({ x: x, y: y }));
          if (actor) {
            out = out.concat(actor.glyph);
          } else {
            out = out.concat(game.screen[y][x]);
          }
        }
        out = out.concat("\n");
      }
    }
    console.log(out);
    game.isScreenDirty = false;
  }
}

function movePlayer(game: Game) {
  const nextInput = inputBuffer.shift();
  if (!game.activeDialog) {
    let playerMove: Coords = { x: 0, y: 0 };
    if (nextInput) {
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
      const previousActorList = new Map(game.actorsByCoords);

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
