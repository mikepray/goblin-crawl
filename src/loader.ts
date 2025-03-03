import * as fs from "fs";
import * as yaml from "js-yaml";
import path from "path";
import { Creature, CreatureStatusMap, CreatureStatusType, MovementTypeMap, MovementTypeValue } from "./types";

export function loadCreatures() {
  const isFile = (fileName: fs.PathLike) => {
    return (
      fs.lstatSync(fileName).isFile() &&
      (fileName.toString().endsWith(".yaml") ||
        fileName.toString().endsWith(".yml"))
    );
  };
  // Load Creatures
  let creatures: Creature[] = [];
  const assetsFilePath = path.join(__dirname, "../assets/creatures");
  fs.readdirSync(assetsFilePath)
    .map((fileName) => {
      return path.join(__dirname, "../assets/creatures", fileName);
    })
    .filter(isFile)
    .forEach((file) => {
      creatures = creatures.concat(loadCreaturesFromFile(fs.readFileSync(file, "utf8")));
    });
  return creatures;
}

// Load goblins from YAML file
export function loadCreaturesFromFile(file: string): Creature[] {
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
        movementType: "CANNOT_MOVE" as MovementTypeValue,
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
