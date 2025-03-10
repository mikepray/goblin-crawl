
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
  const subjectCreature = whatsAtNextPosition as Creature;
  // interact with adjacent actor (bump)
  if (
    whatsAtNextPosition !== undefined &&
    game.actors.has(nextPositionKey) &&
    "isHostile" in whatsAtNextPosition
  ) {
    if (subjectCreature.name === "player") {
      // attack player
      game.messages.push(
        "the creature tries to attack you, but the programmer hasn't coded that yet!"
      );
      return game;
    }
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
  // prevent move into other actors
  if (game.actors.has(nextPositionKey)) {
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
    game.messages.push(
     `{grey-fg}${(actor.shouts as Array<Shout>)[shout].shout}{/}`
    );
  }

  game.isScreenDirty = true;
  return game;
};

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
