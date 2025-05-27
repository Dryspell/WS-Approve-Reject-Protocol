import { createSpacetimeDBClient } from "./spacetimedb";
import type { GameRoom, Unit, GameEvent, ReadyState } from "../spacetime/game.sd";

export interface GameState {
  room: GameRoom | null;
  units: Unit[];
  events: GameEvent[];
  readyState: ReadyState | null;
}

export class GameService {
  private client = createSpacetimeDBClient({
    host: import.meta.env.VITE_SPACETIME_HOST || "http://localhost:3000",
    database: import.meta.env.VITE_SPACETIME_DATABASE || "game",
  });

  private state: GameState = {
    room: null,
    units: [],
    events: [],
    readyState: null,
  };

  private subscribers: ((state: GameState) => void)[] = [];

  constructor() {
    this.setupSubscriptions();
  }

  private setupSubscriptions() {
    // Subscribe to room updates
    this.client.subscribe("GameRoom", (room: GameRoom) => {
      this.state.room = room;
      this.notifySubscribers();
    });

    // Subscribe to unit updates
    this.client.subscribe("Unit", (unit: Unit) => {
      const index = this.state.units.findIndex(u => u.id === unit.id);
      if (index === -1) {
        this.state.units.push(unit);
      } else {
        this.state.units[index] = unit;
      }
      this.notifySubscribers();
    });

    // Subscribe to game events
    this.client.subscribe("GameEvent", (event: GameEvent) => {
      this.state.events.push(event);
      this.notifySubscribers();
    });

    // Subscribe to ready state updates
    this.client.subscribe("ReadyState", (readyState: ReadyState) => {
      this.state.readyState = readyState;
      this.notifySubscribers();
    });
  }

  private notifySubscribers() {
    for (const subscriber of this.subscribers) {
      subscriber({ ...this.state });
    }
  }

  subscribe(callback: (state: GameState) => void) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  async createRoom(roomId: string, name: string, creatorId: string) {
    await this.client.call("createRoom", [roomId, name, creatorId]);
  }

  async joinRoom(roomId: string, userId: string) {
    await this.client.call("joinRoom", [roomId, userId]);
  }

  async toggleReady(roomId: string, userId: string) {
    await this.client.call("toggleReady", [roomId, userId]);
  }

  async moveUnit(unitId: string, targetPosition: [number, number]) {
    await this.client.call("moveUnit", [unitId, targetPosition]);
  }

  async setUnitTask(unitId: string, taskType: "gather" | "craft" | "upgrade", targetId: string) {
    await this.client.call("setUnitTask", [unitId, taskType, targetId]);
  }

  async createGameEvent(
    roomId: string,
    type: "combat" | "resource" | "craft" | "upgrade",
    sourceId: string,
    targetId: string,
    value: number
  ) {
    await this.client.call("createGameEvent", [roomId, type, sourceId, targetId, value]);
  }

  async getRoom(roomId: string): Promise<GameRoom | null> {
    const results = await this.client.query("GameRoom", { id: roomId });
    return results[0] || null;
  }

  async getUnits(roomId: string): Promise<Unit[]> {
    return this.client.query("Unit", { roomId });
  }

  async getEvents(roomId: string): Promise<GameEvent[]> {
    return this.client.query("GameEvent", { roomId });
  }

  async getReadyState(roomId: string): Promise<ReadyState | null> {
    const results = await this.client.query("ReadyState", { roomId });
    return results[0] || null;
  }

  async setUnitVoteColor(unitId: number, color: string): Promise<void> {
    await this.client.call("set_unit_vote_color", unitId, color);
  }

  async tradeUnitVote(unitId: number, buyerId: string, price: number): Promise<void> {
    await this.client.call("trade_unit_vote", unitId, buyerId, price);
  }

  async processRoundVotes(roomId: number, roundNumber: number): Promise<void> {
    await this.client.call("process_round_votes", roomId, roundNumber);
  }
}

// Create a singleton instance
export const gameService = new GameService(); 