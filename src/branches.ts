import { DungeonBranch, KoboldCave } from "./types";
import { nDk } from "./utils";
import { getKoboldTitle } from "./words";

export const dungeon: DungeonBranch = {
  name: "Dungeon",
  difficulty: 1,
  description:
    "A sprawling system of caverns, mines, and tunnels. Full of things to eat and or eat you",
  maxLevel: 3,
};

const trashHeap: DungeonBranch = {
  maxLevel: 3,
  name: "Trash Heap",
  difficulty: 1,
  description:
    "A filthy crevice filled with the accumulated garbage of surface-dwellers",
  parentBranch: dungeon,
};

const apostates: DungeonBranch = {
  maxLevel: 3,
  name: "Apostate Refuge",
  difficulty: 1,
  description:
    "The refuge of goblins who have fallen from the grace of Meggled",
  parentBranch: dungeon,
};

const uhlbreenMines: DungeonBranch = {
  maxLevel: nDk(2, 8) + 5,
  name: "Uhlbreen Mines",
  difficulty: 4,
  description:
    "A vast and dangerous complex of mines maintained by the underground dwarves known as the Uhlbreen",
  parentBranch: apostates,
};

const tekLabs: DungeonBranch = {
  maxLevel: 3,
  name: "TekLabs",
  difficulty: 1,
  description: "Home of the Tek Doctor",
  parentBranch: dungeon,
};

export function getRandomKoboldCave(difficulty: number) {
  const title = getKoboldTitle();
  const randomKoboldCave: KoboldCave = {
    maxLevel: nDk(0 + difficulty, 3 + difficulty),
    name: "Kobold Cave",
    description: `The Cave of ${title}`,
    koboldName: title,
    glyphColor: "{#a440d6-fg}",
    parentBranch: dungeon,
    difficulty: difficulty,
  };
  return randomKoboldCave;
}

export const allBranches = [
  dungeon,
  getRandomKoboldCave(2),
  apostates,
  uhlbreenMines,
  tekLabs,
  trashHeap,
];
