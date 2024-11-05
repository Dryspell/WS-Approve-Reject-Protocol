export type _hasIdentificationData = {
  id: string;
  name: string;
  type: "player" | "minion" | "enemy";
};

export type _hasCombatData = {
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  stamina: number;
  maxStamina: number;
  attack: number;
  defense: number;
  speed: number;
  accuracy: number;
  blockChance: number;
  evasion: number;
  critChance: number;
  critMultiplier: number;
};

export type _canFight = _hasCombatData & _hasIdentificationData;

export type _hasRenderData = {
  color: string;
  pos: [x: number, y: number];
  dims: [width: number, height: number];
  velocity: [dx: number, dy: number];
};

export type Player = _hasIdentificationData & _hasRenderData & _hasCombatData;

type Enemy = {
  type: "enemy";
  color: string;
  pos: [x: number, y: number];
  dims: [width: number, height: number];
  hp: number;
  maxHp: number;
};

type GameObject = Player | Enemy;

export type GameChatMessage = {
  sender: string;
  message: string;
  timestamp: number;
};

export type StaminaRecoverEvent = {
  type: "rest";
  attackerId: string;
  staminaRecover: number;
};

export type AttackEvent = {
  type: "attack";
  attackerId: string;
  defenderId: string;
  attackerDamageRoll: number;
  attackerAccuracyRoll: number;
  attackerIsAccurate: boolean;
  attackerDidCriticalHit: boolean;
  defenderEvasionRoll: number;
  defenderEvadesAttack: boolean;
  defenderBlockRoll: number;
  defenderDidBlock: boolean;
  timestamp: number;
};

export type CombatEvent = AttackEvent | StaminaRecoverEvent;

export type GameEvent =
  | {
      type: "player-joined" | "player-left";
      player: Player;
    }
  | CombatEvent;
