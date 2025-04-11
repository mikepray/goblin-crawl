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

export const meleeActor = (game: Game, actor: Actor, target: Actor): Game => {
  // attack bonus = ln((cunning skill * item cunning bonuses) +
  // (savagery skill * item savagery bonuses)) + weapon attack bonus
  let actorItems = getSkillMultipliers(actor);
  let targetItems = getSkillMultipliers(target);

  let weaponAttackBonus = 0;
  if (actor.slots?.weapon) {
    weaponAttackBonus = (actor.slots?.weapon as Weapon).attackBonus ?? 0;
  } else if (actor.naturalWeapon) {
    weaponAttackBonus = actor.naturalWeapon.attackBonus;
  }

  const actorAttackBonus =
    Math.floor(
      Math.log(
        actor.cunning * actorItems.multipliers.cunning +
          actor.savagery * actorItems.multipliers.savagery
      )
    ) + weaponAttackBonus;

  const targetDodgeBonus =
    Math.floor(Math.log(target.dodging * targetItems.multipliers.dodging)) +
    targetItems.bonuses.dodgingBonus;
  const toHitRoll = d20() + actorAttackBonus;
  if (toHitRoll > 10 + targetDodgeBonus) {
    // attack hits

    // damage bonus =
    // ln((cunning skill * item cunning bonuses) +
    //  (savagery skill * item savagery bonuses) +
    //  (power skill * item power bonus)) +
    //  weapon damage bonus
    // this is compared to the defender's armor and fortitude skill + item bonuses

    // get the wielded weapon damage bonus, or the actor's natural weapon damage bonus
    let weaponDamageBonus = 0;
    if (actor.slots?.weapon) {
      weaponDamageBonus = (actor.slots?.weapon as Weapon).damageBonus ?? 0;
    } else if (actor.naturalWeapon) {
      weaponDamageBonus = actor.naturalWeapon.damageBonus;
    }

    const actorDamageBonus =
      Math.floor(
        Math.log(
          actor.cunning * actorItems.multipliers.cunning +
            actor.savagery * actorItems.multipliers.savagery
        )
      ) + weaponDamageBonus;

    const targetResistBonus =
      Math.floor(
        Math.log(
          target.fortitude * targetItems.multipliers.fortitude +
            target.armor * targetItems.multipliers.armor
        )
      ) + targetItems.bonuses.armorBonus;

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

      const weaponDamage =
        nDk(weaponDamageDieNum, weaponDamageDie) +
        weaponDamageBonus +
        Math.floor(Math.log(actor.power * actorItems.multipliers.power));
      game.messages.push(
        `The ${actor.name}'s attack hits the ${target.name} and does ${weaponDamage} damage (HP left: ${target.hp}) (tohit: ${toHitRoll} > 10 + ${targetDodgeBonus}, todam: ${toDamageRoll} > 10 + ${targetResistBonus})`
      );
      target.hp = (target.hp || 0) - weaponDamage;
    } else {
      game.messages.push(
        `The ${actor.name}'s attack hits the ${target.name} but does no damage (${toHitRoll} > 10 + ${targetDodgeBonus}, ${toDamageRoll} !> 10 + ${targetResistBonus} `
      );
    }
  } else {
    game.messages.push(
      `The ${actor.name}'s attack misses the ${target.name} (${toHitRoll} !> 10 + ${targetDodgeBonus})`
    );
  }

  return game;
};
