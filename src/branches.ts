import { DungeonBranch, KoboldCave, RoomsAndHallwaysConfig } from "./types";
import { nDk } from "./utils";
import { getKoboldTitle } from "./words";

export const dungeon: DungeonBranch = {
  name: "Dungeon",
  description:
    "A sprawling system of caverns, mines, and tunnels. Full of things eat or will eat you",
  maxLevel: 3,
};

const trashHeap: DungeonBranch = {
  maxLevel: 3,
  name: "Trash Heap",
  description:
    "A filthy crevice filled with the accumulated garbage of surface-dwellers and dungeon dwellers alike",
  parentBranch: dungeon,
  glyphColor: "{#B4D902-fg}",
};

const apostates: DungeonBranch = {
  maxLevel: 3,
  name: "Apostate Refuge",
  description:
    "The refuge of goblins who have fallen from the grace of Meggled",
  parentBranch: dungeon,
};

const uhlbreenMines: DungeonBranch = {
  maxLevel: nDk(2, 8) + 5,
  name: "Uhlbreen Mines",
  description:
    "A vast and dangerous complex of mines maintained by the underground dwarves known as the Uhlbreen",
  parentBranch: apostates,
};

const tekLab: DungeonBranch = {
  maxLevel: 1,
  name: "TekLab",
  glyphColor: "{#27DAF5-fg}",
  description: "Tekktor's Lab",
  parentBranch: dungeon,
};

const prismOfYorlaxoph: DungeonBranch = {
  maxLevel: 10,
  name: "Prism of Yorlaxoph",
  description: "The prism dimension holding the Ninefold Lichking Yorlaxoph",
  glyphColor: "{#610C1A",
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
  };
  return randomKoboldCave;
}

export const allBranches = [
  dungeon,
  getRandomKoboldCave(2),
  apostates,
  uhlbreenMines,
  tekLab,
  trashHeap,
];

export const defaultRoomsAndHallways: RoomsAndHallwaysConfig = {
  minRooms: 5,
  maxRooms: 8,
  minWidth: 50,
  maxWidth: 50,
  minHeight: 24,
  maxHeight: 24,
  minRoomWidth: 6,
  maxRoomWidth: 15,
  minRoomHeight: 6,
  maxRoomHeight: 15,
};
