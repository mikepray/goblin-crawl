export type Game = {
  isScreenDirty: boolean;
  turnCount: number;
  player: Player;
  gameOver: boolean;
  activeDialog?: CreatureDialogNode;
  interactingActor?: Actor;
  dialogPointer: number;
  currentBranchLevel: BranchLevel;
  allFeatures: Array<Feature>;
  allCreatures: Array<Creature>;
  allItems: Array<Item>;
  messages: Array<string>;
  levels: Map<string, Level>;
  dialogMode: "inventory" | "game" | "dialog";

  // these objects are updated per level
  items: Map<string, Array<Item>>;
  tiles: CoordsMap;
  actors: Map<string, Actor>;
  features: Map<string, Feature>;
  seenTiles: CoordsMap;
};

// a moveable, occluding game actor
export type Actor = Coords & {
  glyph: string;
  color?: string;
  name: string;
  description?: string;
  inventory?: Array<Item>;
};
export type Item = Feature & {
  edible: boolean;
}
export type Player = Actor & {
  glyph: "@";
  name: "player";
  description: "It's you";
};

// an unmoving, non-occluding game feature (staircase, trap)
export type Feature = Actor & {
  branchSpawnRates?: Array<BranchSpawnRate>;
};

export type Coords = {
  x: number;
  y: number;
};

export type CoordsMap = Map<string, Coords>;

export type Level = BranchLevel & {
  parentLevel: BranchLevel;
  tiles: CoordsMap;
  seenTiles: CoordsMap;
  actors: Map<string, Actor>;
  features: Map<string, Feature>;
  items: Map<string, Array<Item>>;
};

export type Action = {
  actionType: Array<"givePlayerItems" | "takePlayerItems" | "updatePlayer" | "updateCreature">;
  givePlayerItems?: Array<Item>;
  takePlayerItems?: Array<Item>;
  updatePlayer?: Partial<Player>;
  updateCreature?: Partial<Creature>;
}

export type Creature = Actor & {
  isHostile: boolean;
  status: CreatureStatusType;
  dialog?: Array<CreatureDialogNode>;
  movementType: MovementTypeValue;
  wanderingDirection?: MovementDirection;
  branchSpawnRates?: Array<BranchSpawnRate>;
  shouts?: Array<string>;
  shoutChance?: number; // 0 to 100 chance of shouting 
};

// creatures shout randomly, requires no interaction with the player
export type Shout = {
  shout: string;
}

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
};

export type Downstairs = Feature & {
  glyph: ">";
  name: "Downstairs";
};

export type BranchLevel = { branchName: string; level: number };

export type CreatureDialogNode = {
  playerResponse?: string;
  dialog: string;
  creatureResponses?: Array<CreatureDialogNode>;
  actions?: Array<Action>;
};

export enum InputKey {
  UP = "\u001b[A",
  DOWN = "\u001b[B",
  RIGHT = "\u001b[C",
  LEFT = "\u001b[D",
  ESCAPE = "\u001b",
}

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