export type Actor = Coords & {
  glyph: string,
  name: string,
}

export type Player = Actor & {

};

export type Creature = Actor & {
  isHostile: boolean,
  status: CreatureStatus,
  dialog?: Array<CreatureDialogNode>;
}

export type Coords = { 
  x: number;
  y: number;
}

export type Game = {
  screen: Array<Array<string>>;
  isScreenDirty: boolean,
  actorsByCoords: Map<string, Actor>;
  player: Player;
  gameOver: boolean;
};

export type Level = {

}

export type CreatureDialogNode = {
  children: Array<CreatureDialogNode>; 
  dialog: string,
  playerResponse: string,
}

export enum CreatureStatus {
  AWAKE,
  ASLEEP,
  DEAD,
}

export enum InputKey {
  UP = "\u001b[A",
  DOWN = "\u001b[B",
  RIGHT = "\u001b[C",
  LEFT = "\u001b[D",
}