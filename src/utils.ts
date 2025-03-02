import { Coords } from "./types";
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { 
  Creature, 
  CreatureStatusType,
  MovementTypeValue,
  CreatureStatusMap,
  MovementTypeMap
} from "./types";

// Helper function to convert coordinates to a string key
export function coordsToKey(coords: Coords): string {
  return `${coords.x},${coords.y}`;
}

// Utility functions for working with coordinates
export const CoordsUtil = {
  add: (a: Coords, b: Coords): Coords => {
    return { x: a.x + b.x, y: a.y + b.y };
  },
  
  equals: (a: Coords, b: Coords): boolean => {
    return a.x === b.x && a.y === b.y;
  }
};

// Convert string or number to CreatureStatusType
function parseCreatureStatus(status: string | undefined): CreatureStatusType {
  if (status === undefined) {
    return 'AWAKE';
  }

  // Handle string values
  const statusUpper = status.toUpperCase() as CreatureStatusType;
  if (CreatureStatusMap.has(statusUpper)) {
    return statusUpper;
  }
  
  // default AWAKE
  return 'AWAKE';
}

// Convert string or number to MovementTypeValue
function parseMovementType(movementType: string | undefined): MovementTypeValue {
  if (movementType === undefined) {
    return 'WANDERING';
  }
  
  // Handle string values
  const movementTypeUpper = movementType.toUpperCase();
  
  if (MovementTypeMap.has(movementTypeUpper as MovementTypeValue)) {
    return movementTypeUpper as MovementTypeValue;
  }
  
  // default WANDERING
  return 'WANDERING';
}

// Load goblins from YAML file
export function loadGoblinsFromYaml(filePath: string): Creature[] {
  try {
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const data = yaml.load(fileContents) as { goblins: Partial<Creature>[] };
    
    if (!data || !data.goblins || !Array.isArray(data.goblins)) {
      console.error('Invalid goblin data format');
      return [];
    }
    
    // Convert the partial creatures to full creatures with coordinates
    const creatures: Creature[] = data.goblins.map(goblin => {
      return {
        x: 0, // These will be set when placing the goblin
        y: 0,
        glyph: goblin.glyph || 'g',
        name: goblin.name || 'goblin',
        isHostile: goblin.isHostile || false,
        status: parseCreatureStatus(goblin.status),
        movementType: parseMovementType(goblin.movementType),
        dialog: goblin.dialog || undefined
      } as Creature;
    });
    
    return creatures;
  } catch (error) {
    console.error('Error loading goblin data:', error);
    return [];
  }
}