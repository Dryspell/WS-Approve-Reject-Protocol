import { findPathToClosestTarget } from "~/lib/canvas/pathfinding/utils";

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
  dims: [width: number, height: number];
  velocity?: [dx: number, dy: number];
  fillStyle?: CanvasRenderingContext2D["fillStyle"];
  lineWidth?: number;
  strokeStyle?: CanvasRenderingContext2D["strokeStyle"];
};

export type _hasMovementData = { movementData?: ReturnType<typeof findPathToClosestTarget> };

export type _hasPos = {
  pos: [x: number, y: number];
};

export type Unit = _hasCombatData &
  _hasIdentificationData &
  _hasPos &
  _hasRenderData &
  _hasMovementData;

type Enemy = {
  type: "enemy";
  color: string;
  pos: [x: number, y: number];
  dims: [width: number, height: number];
  hp: number;
  maxHp: number;
};

type GameObject = Unit | Enemy;

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
      player: Unit;
    }
  | CombatEvent;
