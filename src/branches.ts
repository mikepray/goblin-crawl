import { DungeonBranch } from "./types";

export const dungeon: DungeonBranch = {
  name: "Dungeon",
  description:
    "A sprawling system of caverns, mines, and tunnels. Full of things to eat, and which want to eat you",
  maxLevel: 3,
};

const koboldCave: DungeonBranch = {
  maxLevel: 4,
  name: "Kobold Cave",
  description:
    "The Kobold Cave is home to scurrilous and treacherous kobolds. They are the sworm enemy of goblins!",
  parentBranch: dungeon,
};

const apostates: DungeonBranch = {
  maxLevel: 3,
  name: "Apostate Refuge",
  description:
    "The refuge of goblins who have fallen from the grace of Meggled",
  parentBranch: dungeon,
};

export const allBranches = [dungeon, koboldCave, apostates];
