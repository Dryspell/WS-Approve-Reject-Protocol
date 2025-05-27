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

export interface UnitTaskQueue {
  id: number;
  unitId: number;
  taskType: string;
  targetId: string;
  status: string;
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