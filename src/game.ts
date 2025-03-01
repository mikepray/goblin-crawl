import { Player, Actor, Coords, Game, InputKey } from "./types";

// Helper function to convert coordinates to a string key
function coordsToKey(coords: Coords): string {
  return `${coords.x},${coords.y}`;
}

function initGame(): Game {
  // init screen
  let screen = Array(24)
    .fill(new Array(24))
    .map(() => Array(24).fill("."));

  // randomly place the player 4 spaces away from the sides
  let placedActors = new Map<string, Actor>();
  const x = Math.floor(Math.random() * 16) + 4;
  const y = Math.floor(Math.random() * 16) + 4;
  const player = { glyph: "@", name: "player", x: x, y: y };
  placedActors.set(coordsToKey({ x, y }), player);

  // put eight goblins in the board randomly
  for (let i = 0; i < 8; i++) {
    while (true) {
      let goblinCoords: Coords = {
        x: Math.floor(Math.random() * 24),
        y: Math.floor(Math.random() * 24),
      };

      // keep iterating if there's a collision in placement
      if (!placedActors.has(coordsToKey(goblinCoords))) {
        placedActors.set(
          coordsToKey(goblinCoords),
          { glyph: "g", name: "Goblin", ...goblinCoords }
        );
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
  };
}

function printScreen(game: Game) {
  if (game.isScreenDirty) {
    console.clear();
    let out = "Roguelike \n";

    for (let i = 0; i < game.screen.length; i++) {
      for (let j = 0; j < game.screen[i].length; j++) {
        const actor = game.actorsByCoords.get(coordsToKey({ x: j, y: i }));
        if (actor) {
          out = out.concat(actor.glyph);
        } else {
          out = out.concat(game.screen[j][i]);
        }
      }
      out = out.concat("\n");
    }
    console.log(out);
    game.isScreenDirty = false;
  }
}

function movePlayer(game: Game) {
  const nextInput = inputBuffer.shift();
  const prevPlayerCoords: Coords = { ...game.player };
  if (nextInput) {
    if (nextInput === InputKey.UP) {
      game.player.y--;
    } else if (nextInput === InputKey.DOWN) {
      game.player.y++;
    } else if (nextInput === InputKey.LEFT) {
      game.player.x--;
    } else if (nextInput === InputKey.RIGHT) {
      game.player.x++;
    }
    const nextPlayerCoords = game.actorsByCoords.get(coordsToKey(prevPlayerCoords));

    game.actorsByCoords.delete(coordsToKey(prevPlayerCoords));
    game.actorsByCoords.set(coordsToKey({ x: nextPlayerCoords!.x, y: nextPlayerCoords!.y }), nextPlayerCoords!);
    game.isScreenDirty = true;
    // boundary collision
    if (
      game.player.x > 23 ||
      game.player.x < 0 ||
      game.player.y > 23 ||
      game.player.y < 0
    ) {
      game.gameOver = true;
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
