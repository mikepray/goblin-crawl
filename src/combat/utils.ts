import {
  Actor,
  SkillMultipliers,
  Weapon,
} from "../types";


export const actorAttack = (actor: Actor, skillMulti: SkillMultipliers): number => {
  let attackVal = actor.cunning * skillMulti.multipliers.cunning + actor.savagery * skillMulti.multipliers.savagery

  if (attackVal === 0) {
    return attackVal;
  } else {
    return Math.floor(Math.log(attackVal));
  }
}

export const actorResist = (actor: Actor, skillMulti: SkillMultipliers): number => {
  let resistVal = actor.fortitude * skillMulti.multipliers.fortitude + actor.armor * skillMulti.multipliers.armor;

  if (resistVal === 0) {
    return resistVal;
  } else {
    return Math.floor(Math.log(resistVal));
  }
}

export const actorDodge = (actor: Actor, skillMulti: SkillMultipliers): number => {
  let dodgeVal = actor.dodging * skillMulti.multipliers.dodging;

  if (dodgeVal === 0) {
    return dodgeVal;
  } else {
    return Math.floor(Math.log(dodgeVal));
  }
}

export const actorWeaponDamage = (actor: Actor): number => {
  let weaponDamageBonus = 0;
  if (actor.slots?.weapon) {
    weaponDamageBonus = (actor.slots?.weapon as Weapon).damageBonus ?? 0;
  } else if (actor.naturalWeapon) {
    weaponDamageBonus = actor.naturalWeapon.damageBonus;
  }
  return weaponDamageBonus;
}

export const actorAttackBonus = (actor: Actor): number => {
  let weaponAttackBonus = 0;
  if (actor.slots?.weapon) {
    weaponAttackBonus = (actor.slots?.weapon as Weapon).attackBonus ?? 0;
  } else if (actor.naturalWeapon) {
    weaponAttackBonus = actor.naturalWeapon.attackBonus;
  }

  return weaponAttackBonus;
}

export const actorPower = (actor: Actor, skillMulti: SkillMultipliers): number => {
  let powerVal = actor.power * skillMulti.multipliers.power

  if (powerVal === 0) {
    return powerVal;
  } else {
    return Math.floor(Math.log(powerVal));
  }
}
