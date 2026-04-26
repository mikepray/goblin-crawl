import { DungeonBranch, KoboldCave } from "./types";
import { nDk } from "./utils";
import { getKoboldPhrase, getKoboldTitle, getKoboldWord } from "./words";

export const dungeon: DungeonBranch = {
  name: "Dungeon",
  difficulty: 1,
  description:
    "A sprawling system of caverns, mines, and tunnels. Full of things to eat and or eat you",
  maxLevel: 3,
};

const apostates: DungeonBranch = {
  maxLevel: 3,
  name: "Apostate Refuge",
  difficulty: 1,
  description:
    "The refuge of goblins who have fallen from the grace of Meggled",
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

export const allBranches = [dungeon, getRandomKoboldCave(2), apostates];
