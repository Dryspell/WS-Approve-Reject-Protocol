import type { Identity } from "@clockworklabs/spacetimedb-sdk";

export interface Vector2 {
  x: number;
  y: number;
}

export interface User {
  identity: Identity;
  name: string | null;
  online: boolean;
}

export interface Message {
  sender: Identity;
  sent: number;
  text: string;
}

export interface GameRoom {
  id: number;
  name: string;
  memberIds: string[];
  ticketIds: string[];
  offerIds: string[];
  startTime: number | null;
  currentRound: number;
}

export interface Unit {
  id: number;
  roomId: number;
  ownerId: string;
  unitType: string; // "minion" | "target" | "structure" | "storage"
  position: Vector2;
  dimensions: Vector2;
  fillStyle: string;
  taskType: string | null; // "gather" | "craft" | "upgrade" | "transfer"
  targetId: string | null;
  voteColor: string | null; // "red" | "blue"
  voteGuarantee: string | null; // "red" | "blue" | null
  votePrice: number | null;
  voteOwner: string | null;
  storageCapacity: number | null;
  isStorage: boolean;
}

export interface GameEvent {
  id: string;
  roomId: string;
  eventType: string; // "combat" | "resource" | "craft" | "upgrade"
  sourceId: string;
  targetId: string;
  value: number;
  timestamp: number;
}

export interface ReadyState {
  roomId: string;
  readyUserIds: string[];
  round: number;
}

export interface Resource {
  id: string;
  roomId: number;
  resourceType: string; // "wood" | "stone" | "metal_ore" | "coal" | "gems" | "fiber" | "hide" | "sand" | "food"
  position: Vector2;
  amount: number;
  maxAmount: number;
  regenerationRate: number;
  regenerationTimer: number;
  depletionThreshold: number;
}

export interface UnitStats {
  unitId: number;
  health: number;
  maxHealth: number;
  attack: number;
  defense: number;
  speed: number;
  gatherRate: number;
  craftRate: number;
}

export interface UnitInventory {
  unitId: number;
  // Primary Resources
  wood: number;
  stone: number;
  metal_ore: number;
  coal: number;
  gems: number;
  fiber: number;
  hide: number;
  sand: number;
  food: number;
  // Secondary Resources
  wooden_pole: number;
  lumber: number;
  cut_stone: number;
  metal_ingot: number;
  cloth: number;
  rope: number;
  leather: number;
  glass: number;
  maxCapacity: number;
}

export interface UnitTaskQueue {
  id: number;
  unitId: number;
  taskType: string; // "move" | "gather" | "craft" | "upgrade"
  targetId: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
}

export interface Vote {
  id: number;
  roomId: number;
  roundNumber: number;
  unitId: number;
  color: string; // "red" | "blue"
  timestamp: number;
}

export interface ChatRoom {
  id: string;
  name: string;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  sender: Identity;
  text: string;
  timestamp: number;
  roundNumber: number | null;
}

export interface ChatPermission {
  roomId: string;
  userId: Identity;
  permission: string; // "read" | "write"
}

export interface SpacetimeDBGameClient {
  subscribe(
    table: "unit" | "unit_task_queue" | "game_event" | "message" | "game_room" | "ready_state" | "resource" | "unit_inventory" | "unit_stats" | "vote" | "chat_room" | "chat_message" | "chat_permission",
    filter: string,
    callback: (data: any) => void
  ): void;
  queue_unit_task(unitId: number, taskType: string, targetId: string): Promise<void>;
  cancel_unit_task(taskId: number): Promise<void>;
  create_game_event(roomId: string, eventType: string, sourceId: string, targetId: string, value: number): Promise<void>;
  create_storage_building(roomId: number, position: Vector2, capacity: number): Promise<void>;
  transfer_resources(sourceId: number, targetId: number, resourceType: string, amount: number): Promise<void>;
  set_unit_vote_color(unitId: number, color: string): Promise<void>;
  trade_unit_vote(unitId: number, buyerId: string, price: number): Promise<void>;
  process_round_votes(roomId: number, roundNumber: number): Promise<void>;
  create_chat_room(name: string): Promise<void>;
  send_chat_message(roomId: string, text: string, roundNumber?: number): Promise<void>;
  set_chat_permission(roomId: string, userId: Identity, permission: string): Promise<void>;
} 