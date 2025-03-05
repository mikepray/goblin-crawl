export type Game = {
  isScreenDirty: boolean;
  turnCount: number;
  player: Player;
  gameOver: boolean;
  activeDialog?: CreatureDialogNode;
  interactingActor?: Actor;
  dialogPointer: number;
  currentBranchLevel: BranchLevel;
  creatures: Array<Creature>;
  debugOutput: Array<string>;
  levels: Map<string, Level>;

  // these objects are updated per level
  tiles: CoordsMap;
  actors: Map<string, Actor>;
  features: Map<string, Feature>;
};

// a moveable, occluding game actor
export type Actor = Coords & {
  glyph: string;
  name: string;
  description?: string;
};

export type Player = Actor & {
  glyph: "@";
  name: "player";
  description: "It's you";
};

// an unmoving, non-occluding game feature (staircase, trap)
export type Feature = Actor & {};

export type Coords = {
  x: number;
  y: number;
};

export type CoordsMap = Map<string, Coords>;

export type Level = BranchLevel & {
  parentLevel: BranchLevel;
  tiles: CoordsMap;
  actors: Map<string, Actor>;
  features: Map<string, Feature>;
};

// Define status and movement types as string literals for type safety
export type CreatureStatusType = "AWAKE" | "ASLEEP" | "DEAD";
export type MovementTypeValue =
  | "CANNOT_MOVE"
  | "GUARDING"
  | "WANDERING"
  | "FLEEING";

// Maps to store status and movement type data
export const CreatureStatusMap = new Map<CreatureStatusType, any>([
  ["AWAKE", { id: 0, description: "Creature is awake and active" }],
  [
    "ASLEEP",
    {
      id: 1,
      description: "Creature is sleeping and will not move unless disturbed",
    },
  ],
  ["DEAD", { id: 2, description: "Creature is dead" }],
]);

export const MovementTypeMap = new Map<MovementTypeValue, any>([
  ["CANNOT_MOVE", { id: 0, description: "Creature cannot move" }],
  ["GUARDING", { id: 1, description: "Creature guards a specific area" }],
  ["WANDERING", { id: 2, description: "Creature wanders randomly" }],
  ["FLEEING", { id: 3, description: "Creature flees from threats" }],
]);

export type Creature = Actor & {
  isHostile: boolean;
  status: CreatureStatusType;
  dialog?: Array<CreatureDialogNode>;
  movementType: MovementTypeValue;
  wanderingDirection?: MovementDirection;
  branchSpawnRates?: Array<BranchSpawnRate>;
};

export type BranchSpawnRate = BranchLevel & {
  // 0 - 100, where 100 means it will spawn 100% of the time in allowed spawn boundaries
  spawnChance: number;
  maxSpawnNum: number;
};

export enum MovementDirection {
  STATIONARY,
  N,
  S,
  E,
  W,
}

export type Upstairs = Feature & {
  glyph: "<";
  name: "Upstairs";
  description: "Stairs going up to the next level";
};

export type Downstairs = Feature & {
  glyph: ">";
  name: "Downstairs";
  description: "Stairs going down to the next level";
};

export type BranchLevel = { branchName: string; level: number };

export type CreatureDialogNode = {
  playerResponse?: string;
  dialog: string;
  creatureResponses?: Array<CreatureDialogNode>;
};

export enum InputKey {
  UP = "\u001b[A",
  DOWN = "\u001b[B",
  RIGHT = "\u001b[C",
  LEFT = "\u001b[D",
  ESCAPE = "\u001b",
  PERIOD = ".",
}

/* A vault is a hardcoded predefined dungeon layout */
export type Vault = {
  getVault: () => Set<Coords>;
};

/* A level generator procedurally creates levels */
export type LevelGenerator = {
  generate: () => Set<Coords>;
};
