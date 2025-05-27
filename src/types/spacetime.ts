// Types generated from SpacetimeDB schema
export interface GameRoom {
  id: number;
  name: string;
  member_ids: string[];
  ticket_ids: string[];
  offer_ids: string[];
  start_time: number | null;
  current_round: number;
}

export interface ReadyState {
  room_id: string;
  ready_user_ids: string[];
  round: number;
}

export interface Unit {
  id: number;
  room_id: number;
  owner_id: string;
  unit_type: string;
  position: { x: number; y: number };
  dimensions: { x: number; y: number };
  fill_style: string;
  task_type: string | null;
  target_id: string | null;
  vote_color: string | null;
  vote_guarantee: string | null;
  vote_price: number | null;
  vote_owner: string | null;
}

export interface GameEvent {
  id: string;
  room_id: string;
  event_type: string;
  source_id: string;
  target_id: string;
  value: number;
  timestamp: number;
}

export interface Vote {
  id: number;
  room_id: number;
  round_number: number;
  unit_id: number;
  color: string;
  timestamp: number;
} 