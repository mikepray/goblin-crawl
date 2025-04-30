import {
  Actor,
  Game,
  Weapon
} from "./types";
import {
  d20,
  getSkillMultipliers,
  nDk
} from "./utils";
import { actorAttack, actorPower, actorDodge, actorResist, actorWeaponDamage, actorAttackBonus } from "./combat/utils";

export const meleeActor = (game: Game, actor: Actor, target: Actor): Game => {
  // attack bonus = ln((cunning skill * item cunning bonuses) +
  // (savagery skill * item savagery bonuses)) + weapon attack bonus
  let actorItems = getSkillMultipliers(actor);
  let targetItems = getSkillMultipliers(target);

  let weaponAttackBonus = actorAttackBonus(actor);
  let actorAttackVal = actorAttack(actor, actorItems);

  const actorAttackBonusVal = actorAttackVal + weaponAttackBonus;
  const targetDodgeBonusVal = actorDodge(target, targetItems) + targetItems.bonuses.dodgingBonus;

  const toHitRoll = d20() + actorAttackBonusVal;

  if (toHitRoll > 10 + targetDodgeBonusVal) {
    // attack hits

    // damage bonus =
    // ln((cunning skill * item cunning bonuses) +
    //  (savagery skill * item savagery bonuses) +
    //  (power skill * item power bonus)) +
    //  weapon damage bonus
    // this is compared to the defender's armor and fortitude skill + item bonuses

    // get the wielded weapon damage bonus, or the actor's natural weapon damage bonus
    let weaponDamageBonus = actorWeaponDamage(actor);

    const actorDamageBonus = actorAttackVal + weaponDamageBonus;
    const targetResistBonus = actorResist(target, targetItems) + targetItems.bonuses.armorBonus;

    const toDamageRoll = d20() + actorDamageBonus;
    if (toDamageRoll > 10 + targetResistBonus) {
      // calculate damage:
      // roll n number of k sided dice (e.g., 1d4)
      // add weapon damage bonus
      // add ln(actor's power skill * item power multiplier)

      let weaponDamageDieNum = 0;
      if (actor.slots?.weapon) {
        weaponDamageDieNum = (actor.slots?.weapon as Weapon).damageDieNum ?? 0;
      } else if (actor.naturalWeapon) {
        weaponDamageDieNum = actor.naturalWeapon.damageDieNum;
      }

      let weaponDamageDie = 0;
      if (actor.slots?.weapon) {
        weaponDamageDie = (actor.slots?.weapon as Weapon).damageDie ?? 0;
      } else if (actor.naturalWeapon) {
        weaponDamageDie = actor.naturalWeapon.damageDie;
      }

      const weaponDamage = nDk(weaponDamageDieNum, weaponDamageDie) + weaponDamageBonus + actorPower(actor, actorItems);
      game.messages.push(
        `The ${actor.name}'s attack hits the ${target.name} and does ${weaponDamage} damage (HP left: ${target.hp}) (tohit: ${toHitRoll} > 10 + ${targetDodgeBonusVal}, todam: ${toDamageRoll} > 10 + ${targetResistBonus})`
      );
      target.hp = (target.hp || 0) - weaponDamage;
    } else {
      game.messages.push(
        `The ${actor.name}'s attack hits the ${target.name} but does no damage (${toHitRoll} > 10 + ${targetDodgeBonusVal}, ${toDamageRoll} !> 10 + ${targetResistBonus} `
      );
    }
  } else {
    game.messages.push(
      `The ${actor.name}'s attack misses the ${target.name} (${toHitRoll} !> 10 + ${targetDodgeBonusVal})`
    );
  }

  return game;
};
