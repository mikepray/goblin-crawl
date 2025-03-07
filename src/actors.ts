import chalk from "chalk";
import { dungeonHeight, dungeonWidth } from "./game";
import {
  Actor,
  Coords,
  Creature,
  Game,
  MovementDirection,
  Shout,
} from "./types";
import { CoordsUtil, coordsToKey } from "./utils";

export const moveActor = (
  game: Game,
  actor: Actor,
  moveDelta: Coords
): Game => {
  const previousPosition = { ...actor };

  const nextPosition = CoordsUtil.add(previousPosition, moveDelta);
  const nextPositionKey = coordsToKey(nextPosition);
  const whatsAtNextPosition = game.actors.get(nextPositionKey);

  // interact with adjacent actor (bump)
  if (whatsAtNextPosition !== undefined && game.actors.has(nextPositionKey)) {
    // TODO prevent actors from interacting with themselves
    return interact(game, actor, whatsAtNextPosition!);
  }

  // prevent move on boundary collision
  if (
    nextPosition.x > dungeonWidth - 1 ||
    nextPosition.x < 0 ||
    nextPosition.y > dungeonHeight - 1 ||
    nextPosition.y < 0
  ) {
    return game;
  }
  // prevent move on wall collision
  if (!game.tiles.has(nextPositionKey)) {
    return game;
  }
  actor.x = nextPosition.x;
  actor.y = nextPosition.y;

  game.actors.delete(coordsToKey(previousPosition));
  game.actors.set(coordsToKey(nextPosition), actor);

  // shouting
  if (
    "shoutChance" in actor &&
    "shouts" in actor &&
    Math.floor(Math.random() * 1000) <= (actor.shoutChance as number)
  ) {
    const shout = Math.floor(
      Math.random() * (actor.shouts as Array<Shout>).length
    );
    game.messages.push(chalk.italic.dim(`(${actor.name}) ${(actor.shouts as Array<Shout>)[shout].shout}`));
  }

  game.isScreenDirty = true;
  return game;
};

function interact(game: Game, object: Actor, subject: Actor): Game {
  if ("isHostile" in subject) {
    const subjectCreature = subject as Creature;
    if (subjectCreature.isHostile) {
      // attack
    } else {
      // dialog with player
      if (object.name === "player" && subjectCreature.conversationBranch) {
        const conversationBranch =
          subjectCreature.conversationBranch[
            Math.floor(Math.random() * subjectCreature.conversationBranch.length)
          ];
        game.activeDialog = conversationBranch;
        game.interactingActor = subjectCreature;
        game.dialogMode = "dialog";
        game.isScreenDirty = true;
      } else if (object.name === "player") {
        // creature doesn't speak
        game.messages.push(`${subjectCreature.useDefiniteArticle ? " The " : ""}${subjectCreature.name} isn't interested in discussion...`)
      }
    }
  }
  return game;
}

export const getWanderingMoveDelta = (creature: Creature): Coords => {
  const moveDelta: Coords = { x: 0, y: 0 };

  if (creature.movementType !== "WANDERING") {
    return moveDelta;
  }

  if (!creature.wanderingDirection || Math.random() < 0.2) {
    const randomDirection = Math.floor(Math.random() * 5);
    creature.wanderingDirection = randomDirection as MovementDirection;
  }

  switch (creature.wanderingDirection) {
    case MovementDirection.N:
      moveDelta.y--;
      break;
    case MovementDirection.S:
      moveDelta.y++;
      break;
    case MovementDirection.E:
      moveDelta.x++;
      break;
    case MovementDirection.W:
      moveDelta.x--;
      break;
    case MovementDirection.STATIONARY:
      // No movement
      break;
  }

  return moveDelta;
};
