export type Actor = Coords & {
  glyph: string;
  name: string;
}

export type Player = Actor & {

};

export type Creature = Actor & {
  isHostile: boolean;
  status: CreatureStatus;
  dialog?: Array<CreatureDialogNode>;
  movementType: MovementType;
  wanderingDirection?: MovementDirection;
}

export enum MovementDirection {
  STATIONARY,
  N,
  S,
  E,
  W,
}

export enum MovementType {
  CANNOT_MOVE,
  GUARDING,
  WANDERING,
  FLEEING
}

export type Coords = { 
  x: number;
  y: number;
}


export type Game = {
  screen: Array<Array<string>>;
  isScreenDirty: boolean;
  actorsByCoords: Map<string, Actor>;
  player: Player;
  gameOver: boolean;
  activeDialog?: CreatureDialogNode;
  interactingActor?: Actor;
  dialogPointer: number;
};

export type Level = {

}

export type CreatureDialogNode = {
  creatureResponses?: Array<CreatureDialogNode>; 
  dialog: string;
  playerResponse?: string;
}
/*

  { dialog: "how can i help you?",
    creatureResponses: [
      {
        creatureResponses: "what do you have for sale?",
        dialog: "Here are my wares",
        creatureResponses: [
          {
            playerResponse: "(buy a wooden knife for 40gp)",
          },
          {
            playerResponse: "(buy a skrunt egg for 30gp)",
          }
        ]
      },
      {
        playerResponse: "nevermind",
        dialog: "goodbye"
      }
    ],


*/

export enum CreatureStatus {
  AWAKE,
  ASLEEP,
  DEAD,
}

export enum InputKey {
  UP = "\u001b[A",
  DOWN = "\u001b[B",
  RIGHT = "\u001b[C",
  LEFT = "\u001b[D",
  ESCAPE = "\u001b",
  PERIOD = ".",
  
}