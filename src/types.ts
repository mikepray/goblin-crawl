export type Actor = Coords & {
  glyph: string;
  name: string;
  description?: string;
}

export type Player = Actor & {

};

// Define status and movement types as string literals for type safety
export type CreatureStatusType = 'AWAKE' | 'ASLEEP' | 'DEAD';
export type MovementTypeValue = 'CANNOT_MOVE' | 'GUARDING' | 'WANDERING' | 'FLEEING';

// Maps to store status and movement type data
export const CreatureStatusMap = new Map<CreatureStatusType, any>([
  ['AWAKE', { id: 0, description: 'Creature is awake and active' }],
  ['ASLEEP', { id: 1, description: 'Creature is sleeping and will not move unless disturbed' }],
  ['DEAD', { id: 2, description: 'Creature is dead' }]
]);

export const MovementTypeMap = new Map<MovementTypeValue, any>([
  ['CANNOT_MOVE', { id: 0, description: 'Creature cannot move' }],
  ['GUARDING', { id: 1, description: 'Creature guards a specific area' }],
  ['WANDERING', { id: 2, description: 'Creature wanders randomly' }],
  ['FLEEING', { id: 3, description: 'Creature flees from threats' }]
]);

export type Creature = Actor & {
  isHostile: boolean;
  status: CreatureStatusType;
  dialog?: Array<CreatureDialogNode>;
  movementType: MovementTypeValue;
  wanderingDirection?: MovementDirection;
  branchSpawnRates?: Array<BranchSpawnRate>;
}

export type BranchSpawnRate = Branch & {
  // 0 - 100, where 100 means it will spawn 100% of the time in allowed spawn boundaries
  spawnChance: number;
  maxSpawnNum: number;
}

export enum MovementDirection {
  STATIONARY,
  N,
  S,
  E,
  W,
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
  currentBranch: Branch;
  creatures: Array<Creature>;
}

export type Branch = 
  { branchName: string; level: number };


export type Level = {

}

export type CreatureDialogNode = {
  playerResponse?: string;
  dialog: string;
  creatureResponses?: Array<CreatureDialogNode>; 
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

export enum InputKey {
  UP = "\u001b[A",
  DOWN = "\u001b[B",
  RIGHT = "\u001b[C",
  LEFT = "\u001b[D",
  ESCAPE = "\u001b",
  PERIOD = ".",
  
}