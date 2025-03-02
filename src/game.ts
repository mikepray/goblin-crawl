import { getWanderingMoveDelta, moveActor } from "./actors";
import {
  Player,
  Actor,
  Coords,
  Game,
  InputKey,
  Creature,
  CreatureStatus,
  CreatureDialogNode,
  MovementType,
} from "./types";
import { coordsToKey, CoordsUtil } from "./utils";

export const dungeonWidth = 48;
export const dungeonHeight = 24;

function initGame(): Game {
  // init screen
  let screen = Array(dungeonHeight)
    .fill(new Array(dungeonWidth))
    .map(() => Array(dungeonWidth).fill("."));

  // randomly place the player 4 spaces away from the sides
  let placedActors = new Map<string, Actor>();
  const x = Math.floor(Math.random() * dungeonWidth - 8) + 4;
  const y = Math.floor(Math.random() * dungeonHeight - 8) + 4;
  const player = { glyph: "@", name: "player", x: x, y: y };
  placedActors.set(coordsToKey({ x, y }), player as Player);

  let dialog = new Array<CreatureDialogNode>();

  dialog.push({
    dialog: "zig?",
    creatureResponses: [
      {
        dialog: "zug!",
        playerResponse: "zug",
        creatureResponses: [
          {
            playerResponse: "Excuse me sir do you have some grey poupon",
            dialog: "No!",
          },
        ],
      },
      { dialog: "wug!", playerResponse: "wug" },
    ],
  });

  // put eight goblins in the board randomly
  for (let i = 0; i < 8; i++) {
    while (true) {
      let goblinCoords: Coords = {
        x: Math.floor(Math.random() * dungeonWidth),
        y: Math.floor(Math.random() * dungeonHeight),
      };

      // keep iterating if there's a collision in placement
      if (!placedActors.has(coordsToKey(goblinCoords))) {
        placedActors.set(coordsToKey(goblinCoords), {
          glyph: "g",
          name: "Goblin",
          ...goblinCoords,
          isHostile: false,
          status: CreatureStatus.AWAKE,
          dialog: dialog,
          movementType: MovementType.WANDERING,
        } as Creature);
        break; // Exit the while loop after successfully placing a goblin
      }
    }
  }
  return {
    screen: screen,
    actorsByCoords: placedActors,
    player: player,
    gameOver: false,
    isScreenDirty: true,
    dialogPointer: 0,
  };
}

function printScreen(game: Game) {
  if (game.isScreenDirty) {
    console.clear();
    let out = "GoblinCrawl \n";
    if (game.activeDialog) {
      // active dialog
      out = out.concat(
        `${game.interactingActor?.name} says: \n\n${game.activeDialog.dialog}\n\nYour answer:\n`
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
        out = out.concat("...\nPress any key to exit dialog...");
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

      // copy list to prevent concurrent modification
      const previousActorList = new Map(game.actorsByCoords);

      previousActorList.forEach(actor => {
        let moveDelta = {x: 0, y: 0};
        if (actor.name === "player") {
          moveDelta = playerMove;
        } else {
          if ("movementType" in actor) {
            const creature = actor as Creature;
            if (creature.movementType === MovementType.WANDERING) 
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
