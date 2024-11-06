import { SetStoreFunction } from "solid-js/store";
import {
  _canFight,
  _hasCombatData,
  _hasIdentificationData,
  AttackEvent,
  CombatEvent,
  GameChatMessage,
  Unit,
  StaminaRecoverEvent,
} from "./types";

export const generateCombatEvent = (attacker: _canFight, defender: _canFight) => {
  if (attacker.stamina <= 0) {
    return {
      type: "rest" as const,
      attackerId: attacker.id,
      staminaRecover: Math.round((Math.random() * attacker.maxStamina) / 4) + 1,
    } as StaminaRecoverEvent;
  }

  const attackerDidCriticalHit = Math.random() < attacker.critChance / 100;
  const attackerDamageRoll = attackerDidCriticalHit
    ? attacker.critMultiplier * attacker.attack
    : Math.round(Math.random() * attacker.attack);

  const attackerAccuracyRoll = Math.round(Math.random() * 100);
  const attackerIsAccurate = attackerAccuracyRoll > 100 - attacker.accuracy;

  const defenderEvasionRoll = Math.round(Math.random() * 100);
  const defenderEvadesAttack = defenderEvasionRoll > 100 - defender.evasion;

  const defenderBlockRoll = Math.round(Math.random() * 100);
  const defenderDidBlock = defenderBlockRoll > 100 - defender.blockChance;

  const gameEvent: AttackEvent = {
    type: "attack" as const,
    attackerId: attacker.id,
    defenderId: defender.id,
    attackerDamageRoll,
    attackerAccuracyRoll,
    attackerIsAccurate,
    attackerDidCriticalHit,
    defenderEvasionRoll,
    defenderEvadesAttack,
    defenderBlockRoll,
    defenderDidBlock,
    timestamp: Date.now(),
  };
  return gameEvent;
};

export function processCombatEvents(
  combatEvents: CombatEvent[],
  units: _canFight[],
  setGameChat: SetStoreFunction<GameChatMessage[]>,
  gameChat: GameChatMessage[],
  setGameObjects: SetStoreFunction<{ readonly units: Unit[] }>,
) {
  combatEvents.reduce((acc, event) => {
    switch (event.type) {
      case "rest": {
        const activeUnit = units.find(p => p.id === event.attackerId);
        if (!activeUnit) {
          throw new Error("No player found");
        }
        setGameChat(gameChat.length, {
          sender: activeUnit.id,
          message: `${activeUnit.name} rests and recovers ${event.staminaRecover} stamina!`,
          timestamp: Date.now(),
        });
        setGameObjects(
          "units",
          unit => unit.id === activeUnit.id,
          "stamina",
          stamina => Math.min(stamina + event.staminaRecover, activeUnit.maxStamina),
        );
        return acc;
      }

      case "attack": {
        const {
          attackerId,
          defenderId,
          attackerDamageRoll,
          attackerAccuracyRoll,
          attackerIsAccurate,
          attackerDidCriticalHit,
          defenderEvasionRoll,
          defenderEvadesAttack,
          defenderBlockRoll,
          defenderDidBlock,
        } = event;
        const attacker = units.find(p => p.id === attackerId);
        const defender = units.find(p => p.id === defenderId);
        if (!attacker) {
          throw new Error("No attacker found");
        }
        if (!defender) {
          throw new Error("No defender found");
        }

        if (attackerDamageRoll === 0) {
          setGameChat(gameChat.length, {
            sender: attacker.id,
            message: `${attacker.name} falters with a glancing blow that does nothing.`,
            timestamp: Date.now(),
          });
          return acc;
        }

        if (attackerDidCriticalHit) {
          setGameChat(gameChat.length, {
            sender: attacker.id,
            message: `${attacker.name} charges up a Critical-Hit for ${attackerDamageRoll} damage!`,
            timestamp: Date.now(),
          });
        } else if (attackerDamageRoll > 0.8 * attacker.attack) {
          setGameChat(gameChat.length, {
            sender: attacker.id,
            message: `${attacker.name} develops a strong hit for ${attackerDamageRoll} damage!`,
            timestamp: Date.now(),
          });
        } else {
          setGameChat(gameChat.length, {
            sender: attacker.id,
            message: `${attacker.name} aims a hit for ${attackerDamageRoll} damage!`,
            timestamp: Date.now(),
          });
        }

        if (!attackerIsAccurate) {
          setGameChat(gameChat.length, {
            sender: attacker.id,
            message: `${attacker.name} misses the attack (${attackerAccuracyRoll})!`,
            timestamp: Date.now(),
          });
          return acc;
        }
        if (defenderEvadesAttack) {
          setGameChat(gameChat.length, {
            sender: attacker.id,
            message: `${defender.name} dodged the attack (${defenderEvasionRoll})!`,
            timestamp: Date.now(),
          });
          return acc;
        }

        if (defenderDidBlock) {
          setGameChat(gameChat.length, {
            sender: attacker.id,
            message: `${defender.name} blocked the attack (${defenderBlockRoll})!`,
            timestamp: Date.now(),
          });
          return acc;
        }

        setGameObjects(
          "units",
          unit => unit.id === defenderId,
          "hp",
          hp => hp - attackerDamageRoll,
        );
        setGameObjects(
          "units",
          unit => unit.id === attackerId,
          "stamina",
          stamina => stamina - 5,
        );
      }
    }
  }, undefined);
}
