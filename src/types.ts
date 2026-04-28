export type Game = {
  isScreenDirty: boolean;
  turnCount: number;
  player: Player;
  gameOver: boolean;
  activeDialog?: ConversationBranch;
  storyScreen?: LevelUpScreen;
  interactingActor?: Actor;
  dialogPointer: number;
  allFeatures: Array<Feature>;
  allCreatures: Array<Creature>;
  allItems: Array<Item>;
  messages: Array<string>;
  oldMessages: Array<string>;
  levels: Map<string, Level>;
  dialogMode: "inventory" | "game" | "dialog" | "levelUp";
  // these objects are updated per level
  items: Map<string, Array<Item>>;
  tiles: CoordsMap;
  actors: Map<string, Actor>;
  features: Map<string, Feature>;
  seenTiles: CoordsMap;
  visibleActors: Array<Actor>;
  currentBranchLevel: BranchLevel;
  allBranches: Array<DungeonBranch>;
  altarsConquered: number;
  gameTurns: number;
  restTurns?: number;
};

export type DungeonBranch = {
  maxLevel: number;
  name: string;
  description: string;
  staircase?: Feature;
  parentBranch?: DungeonBranch;
  glyphColor?: string;
  difficulty: number;
  numRooms?: number;
};

export type KoboldCave = DungeonBranch & {
  koboldName: string;
};

export type LevelUpScreen = {};

// a moveable, occluding game actor
export type Actor = Coords &
  Skills & {
    level: number;
    hitDie: number;
    glyph: string;
    color?: string;
    name: string;
    description?: string;
    inventory?: Array<Item>;
    maxHp: number;
    currentHp: number;
    hpRegen?: number; // hp regenerate per turn
    slots?: {
      weapon?: Weapon | Item;
      shield?: Item;
      head?: Item;
      neck?: Item;
      body?: Item;
      feet?: Item;
      hands?: Item;
    };
    naturalWeapon?: Weapon; // only trust your fists
  };

// when applied to an actor, these are the base stats
// when applied to an item, they are multipliers
export type Skills = {
  cunning: number;
  savagery: number;
  fortitude: number;
  power: number;
  armor: number;
  dodging: number;
};

export type Item = Feature &
  Skills & {
    edible: boolean;
    slot?: "weapon" | "shield" | "head" | "neck" | "body" | "feet" | "hands";
    armorBonus?: number;
    dodgingBonus?: number;
    eatActionType?: "heal";
    eatAction?: string;
  };

export type Bonuses = {
  armorBonus: number;
  dodgingBonus: number;
};

export type SkillMultipliers = {
  multipliers: Skills;
  bonuses: Bonuses;
};

export type Weapon = Item & {
  attackBonus: number;
  damageBonus: number;
  damageDieNum: number;
  damageDie: number;
};

export type Player = Actor & {
  glyph: "@";
  name: "player";
  description: "It's you";
  XP: number;
};

// an unmoving, non-occluding game feature (staircase, trap)
export type Feature = Actor & Spawnable;

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

export type Creature = Actor &
  Spawnable & {
    isHostile: boolean;
    status: CreatureStatusType;
    conversationBranches?: Array<ConversationBranch>;
    movementType: MovementTypeValue;
    wanderingDirection?: MovementDirection;
    shouts?: Array<string>;
    shoutChance?: number; // 0 to 100 chance of shouting
    shoutGenerator?: "kobold"; // use a hardcoded generator
    useDefiniteArticle: boolean; // if the game will put "The" in front of the creature's name
    wasSwappedByPlayer: boolean; // if the player just swapped with this creature. prevents the creature from moving for one turn
  };

// creatures shout randomly, requires no interaction with the player
export type Shout = {
  shout: string;
};

export type Spawnable = {
  spawnInfo: Array<SpawnInfo>;
};

export type SpawnInfo = {
  branchName: string;
  minLevel?: number; // if undefined, can spawn at first level
  maxLevel?: number; // if undefined, can spawn at last level
  determinedSpawnLevel?: number;
  spawnRate: number; // percent chance to spawn in any given level
  distribution: "early" | "mid" | "late" | "even" | "determined";
  // early branch distribution will more heavily weight spawn rates
  // for earlier levels in the branch. similar with mid and late
  // even distribution is even across all levels in the branch
  // determined will only spawn the thing at a specific branchLevel
  // as specified in determinedSpawnLevel
  mustSpawn: boolean; // if the thing must spawn somewhere
  unique: boolean; // if true, only one can ever be spawned.
  spawnedNum: number; // number of times the thing has spawned
  // frequency that this can spawn. the spawn system rolls against the spawn rates
  // this number of times
  frequency: number; // default is 1 (see utils)
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
  name: string;
  toBranchName?: string;
};

export type BranchLevel = {
  branch: DungeonBranch;
  level: number;
};

export type ConversationBranch = {
  playerResponse?: string;
  creatureSpeaks?: string;
  conversationBranches?: Array<ConversationBranch>;
  actions?: Array<Action>;
  // Reference to the string of another node's creatureSpeaks dialog, for going back to other dialog nodes
  gotoBranch?: string;
  actionFailedBranch?: ConversationBranch;
};

export type Action = {
  givePlayerItems?: Array<string>;
  takePlayerItems?: Array<string>;
  updatePlayer?: Partial<Player>;
  updateCreature?: Partial<Creature>;
};

export enum InputKey {
  UP = "\u001b[A",
  DOWN = "\u001b[B",
  RIGHT = "\u001b[C",
  LEFT = "\u001b[D",
  ESCAPE = "\u001b",
  TAB = "\x09",
}

// Define status and movement types as string literals for type safety
export type CreatureStatusType = "AWAKE" | "ASLEEP" | "DEAD";
export type MovementTypeValue =
  | "CANNOT_MOVE"
  | "GUARDING"
  | "WANDERING"
  | "followingLeader"
  | "followingPlayer"
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
  ["followingLeader", { id: 4, description: "Creature follows a leader" }],
  ["followingPlayer", { id: 5, description: "Creature follows the player" }],
]);
