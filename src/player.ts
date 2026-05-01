import { Game } from "./types";

export function levelUp(game: Game) {
  if (game.dialogMode !== "game") return;
  if (game.player.XP / 1000 >= game.player.level) {
    game.dialogMode = "levelUp";
  }
}
