import * as fs from "fs";
import * as yaml from "js-yaml";
import path from "path";
import { Creature, CreatureStatusMap, CreatureStatusType, Item, MovementTypeMap, MovementTypeValue } from "./types";

export function loadCreatures() {
  let creatures: Creature[] = [];
  loadAssetDirectory("creatures")
    .forEach((file) => {
      creatures = creatures.concat(loadCreaturesFromFile(fs.readFileSync(file, "utf8")));
    });
  return creatures;
}

export function loadItems() {
  let items: Item[] = [];
  loadAssetDirectory("items")
    .forEach((file) => {
      items = items.concat(loadItemsFromFile(fs.readFileSync(file, "utf8")));
    });
  return items;
}

const isFile = (fileName: fs.PathLike) => {
  return (
    fs.lstatSync(fileName).isFile() &&
    (fileName.toString().endsWith(".yaml") ||
      fileName.toString().endsWith(".yml"))
  );
};

function loadAssetDirectory(directoryName: string): Array<string> {
  // Load Creatures
  const assetsFilePath = path.join(__dirname, `../assets/${directoryName}`);
  return fs.readdirSync(assetsFilePath)
    .map((fileName) => {
      return path.join(__dirname, `../assets/${directoryName}`, fileName);
    })
    .filter(isFile);
}

function loadCreaturesFromFile(file: string): Creature[] {
  try {
    const data = yaml.load(file) as { creatures: Partial<Creature>[] };

    if (
      ("creatures" in data && !data) ||
      !data.creatures ||
      !Array.isArray(data.creatures)
    ) {
      console.error("Invalid yaml data format");
      return [];
    }

    // Convert the partial creatures to full creatures with coordinates
    const creatures: Creature[] = data.creatures.map((creature) => {
      const defaults = {
        x: 0, // These will be set when placing the creature
        y: 0,
        glyph: "g",
        name: "goblin",
        isHostile: false,
        status: "AWAKE" as CreatureStatusType,
        movementType: "WANDERING" as MovementTypeValue,
        branchSpawnRates: [],
      };

      return {
        ...defaults,
        ...creature,
        status: parseCreatureStatus(creature.status),
        movementType: parseMovementType(creature.movementType),
        dialog: creature.dialog || undefined,
      } as Creature;
    });

    return creatures;
  } catch (error) {
    console.error("Error loading creature data:", error);
    return [];
  }
}


function loadItemsFromFile(file: string): Item[] {
  try {
    const data = yaml.load(file) as { items: Partial<Item>[] };

    if (
      ("items" in data && !data) ||
      !data.items ||
      !Array.isArray(data.items)
    ) {
      console.error("Invalid yaml data format");
      return [];
    }

    const items: Item[] = data.items.map((item) => {
      const defaults = {
        branchSpawnRates: [],
        edible: false,
      };

      return {
        ...defaults,
        ...item,
      } as Item;
    });

    return items;
  } catch (error) {
    console.error("Error loading item data:", error);
    return [];
  }
}

// Convert string or number to CreatureStatusType
export function parseCreatureStatus(status: string | undefined): CreatureStatusType {
  if (status === undefined) {
    return "AWAKE";
  }

  // Handle string values
  const statusUpper = status.toUpperCase() as CreatureStatusType;
  if (CreatureStatusMap.has(statusUpper)) {
    return statusUpper;
  }

  // default AWAKE
  return "AWAKE";
}

// Convert string or number to MovementTypeValue
export function parseMovementType(
  movementType: string | undefined
): MovementTypeValue {
  if (movementType === undefined) {
    return "WANDERING";
  }

  // Handle string values
  const movementTypeUpper = movementType.toUpperCase();

  if (MovementTypeMap.has(movementTypeUpper as MovementTypeValue)) {
    return movementTypeUpper as MovementTypeValue;
  }

  // default WANDERING
  return "WANDERING";
}
