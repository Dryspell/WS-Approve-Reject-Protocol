import type { Identity } from "@clockworklabs/spacetimedb-sdk";

export interface Unit {
  id: number;
  roomId: number;
  ownerId: string;
  unitType: string;
  position: { x: number; y: number };
  dimensions: { x: number; y: number };
  fillStyle: string;
  taskType: string | null;
  targetId: string | null;
  voteColor: string | null;
  voteGuarantee: string | null;
  votePrice: number | null;
  voteOwner: string | null;
  storageCapacity: number | null;
  isStorage: boolean;
}

export interface UnitInventory {
  unitId: number;
  wood: number;
  stone: number;
  gold: number;
  maxCapacity: number;
}

export interface Resource {
  id: string;
  roomId: number;
  resourceType: string;
  position: { x: number; y: number };
  amount: number;
  maxAmount: number;
  regenerationRate: number;
  regenerationTimer: number;
  depletionThreshold: number;
}

export interface UnitTaskQueue {
  id: number;
  unitId: number;
  taskType: string;
  targetId: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
}

export interface GameEvent {
  id: string;
  roomId: string;
  eventType: string;
  sourceId: string;
  targetId: string;
  value: number;
  timestamp: number;
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

export interface SpacetimeDBGameClient {
  subscribe(
    table: "unit" | "unit_task_queue" | "game_event" | "message" | "game_room" | "ready_state" | "resource" | "unit_inventory",
    filter: string,
    callback: (data: any) => void
  ): void;
  queue_unit_task(unitId: number, taskType: string, targetId: string): Promise<void>;
  cancel_unit_task(taskId: number): Promise<void>;
  create_game_event(roomId: string, eventType: string, sourceId: string, targetId: string, value: number): Promise<void>;
  create_storage_building(roomId: number, position: { x: number; y: number }, capacity: number): Promise<void>;
  transfer_resources(sourceId: number, targetId: number, resourceType: string, amount: number): Promise<void>;
} 