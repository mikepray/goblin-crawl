import { dungeonHeight, dungeonWidth } from "./game";
import { Actor, Coords, Creature, Game, MovementDirection } from "./types";
import { CoordsUtil, coordsToKey } from "./utils";

export const moveActor = (
  game: Game,
  actor: Actor,
  moveDelta: Coords
): Game => {
  const previousPosition = { ...actor };

  const nextPosition = CoordsUtil.add(previousPosition, moveDelta);
  const nextPositionKey = coordsToKey(nextPosition);
  const whatsAtNextPosition = game.actorsByCoords.get(nextPositionKey);

  if (
    whatsAtNextPosition !== undefined &&
    game.actorsByCoords.has(nextPositionKey)
  ) {
    // TODO prevent actors from interacting with themselves
    return interact(game, actor, whatsAtNextPosition!);
  }

  if (
    // prevent move on boundary collision
    !(
      nextPosition.x > dungeonWidth - 1 ||
      nextPosition.x < 0 ||
      nextPosition.y > dungeonHeight - 1 ||
      nextPosition.y < 0
    )
  ) {
    actor.x = nextPosition.x;
    actor.y = nextPosition.y;

    game.actorsByCoords.delete(coordsToKey(previousPosition));
    game.actorsByCoords.set(coordsToKey(nextPosition), actor);
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
      if (object.name === "player" && subjectCreature.dialog) {
        const dialogNode =
        subjectCreature.dialog[Math.floor(Math.random() * subjectCreature.dialog.length)];
        game.activeDialog = dialogNode;
        game.interactingActor = subjectCreature;
        game.isScreenDirty = true;
      } else {
        // creature doesn't speak
      }
    }
  }
  return game;
}

export const getWanderingMoveDelta = (creature: Creature): Coords => {
  const moveDelta: Coords = { x: 0, y: 0 };
  
  // Only wandering creatures should move randomly
  if (creature.movementType !== 'WANDERING') {
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
