import type { Identity } from "@clockworklabs/spacetimedb-sdk";
import type { Unit, GameEvent } from "~/module_bindings";

export interface UnitTaskQueue {
  id: number;
  unit_id: number;
  task_type: string;
  target_id: string;
  status: string;
  created_at: number;
  started_at: number | null;
  completed_at: number | null;
}

export interface SpacetimeDBGameClient {
  // User methods
  set_name(name: string): Promise<void>;
  send_message(text: string): Promise<void>;

  // Room methods
  create_room(roomId: string, name: string, creatorId: string): Promise<void>;
  join_room(roomId: number, userId: string): Promise<void>;
  toggle_ready(roomId: number, userId: string): Promise<void>;
  start_game(roomId: number): Promise<void>;

  // Unit methods
  move_unit(unitId: number, position: { x: number; y: number }): Promise<void>;
  set_unit_task(unitId: number, taskType: string, targetId: string): Promise<void>;
  gather_resource(unitId: number, resourceId: string): Promise<void>;
  upgrade_unit(unitId: number, upgradeType: string): Promise<void>;

  // Vote methods
  set_unit_vote_color(unitId: number, color: string): Promise<void>;
  trade_unit_vote(unitId: number, buyerId: string, price: number): Promise<void>;
  process_round_votes(roomId: number, roundNumber: number): Promise<void>;

  // Task Queue Methods
  queue_unit_task(unitId: number, taskType: string, targetId: string): Promise<void>;
  cancel_unit_task(taskId: number): Promise<void>;
  
  // Subscribe to updates
  subscribe(
    tableName: "unit" | "unit_task_queue" | "game_event" | "message" | "game_room" | "ready_state",
    filter: string,
    callback: (data: Unit | UnitTaskQueue | GameEvent | any) => void
  ): void;
} 