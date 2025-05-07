import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { GameRooms, GameRoomMembers, GameRounds, Tickets, RoundReadyStates } from '../../../drizzle/schema';
import { GameRoom, GameRound, Ticket, TicketColor } from '~/types/vote';
import { createId } from '@paralleldrive/cuid2';
import { eq, gt, and } from 'drizzle-orm';

const sqlite = new Database('sqlite.db');
const db = drizzle(sqlite);

export const dbService = {
  // Room operations
  async createRoom(room: GameRoom) {
    await db.insert(GameRooms).values({
      id: room.id,
      name: room.name,
      startTime: room.startTime,
    });

    // Insert members
    await db.insert(GameRoomMembers).values(
      room.members.map(member => ({
        roomId: room.id,
        userId: member.id,
      }))
    );
  },

  async updateRoom(room: GameRoom) {
    await db.update(GameRooms)
      .set({
        name: room.name,
        startTime: room.startTime,
      })
      .where(eq(GameRooms.id, room.id));

    // Update members
    await db.delete(GameRoomMembers)
      .where(eq(GameRoomMembers.roomId, room.id));
    
    await db.insert(GameRoomMembers).values(
      room.members.map(member => ({
        roomId: room.id,
        userId: member.id,
      }))
    );
  },

  // Round operations
  async saveRound(roomId: string, round: GameRound) {
    await db.insert(GameRounds).values({
      id: createId(),
      roomId,
      number: round.number,
      startTime: round.startTime,
      endTime: round.endTime,
    });
  },

  // Ticket operations
  async saveTickets(roomId: string, tickets: Ticket[]) {
    await db.insert(Tickets).values(
      tickets.map(ticket => ({
        id: ticket.id,
        roomId,
        ownerId: ticket.owner,
        color: ticket.color,
      }))
    );
  },

  async updateTicket(ticket: Ticket) {
    await db.update(Tickets)
      .set({
        color: ticket.color,
        updatedAt: Date.now(),
      })
      .where(eq(Tickets.id, ticket.id));
  },

  // Ready state operations
  async saveReadyState(roomId: string, roundNumber: number, userId: string) {
    await db.insert(RoundReadyStates).values({
      roomId,
      roundNumber,
      userId,
    });
  },

  // Recovery operations
  async getActiveRooms() {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const rooms = await db.select()
      .from(GameRooms)
      .where(gt(GameRooms.startTime, oneDayAgo));

    const activeRooms: GameRoom[] = [];
    
    for (const room of rooms) {
      const members = await db.select()
        .from(GameRoomMembers)
        .where(eq(GameRoomMembers.roomId, room.id));
      
      const rounds = await db.select()
        .from(GameRounds)
        .where(eq(GameRounds.roomId, room.id))
        .orderBy(GameRounds.number);

      const tickets = await db.select()
        .from(Tickets)
        .where(eq(Tickets.roomId, room.id));

      activeRooms.push({
        id: room.id,
        name: room.name,
        members: members.map((m: { userId: string }) => ({ id: m.userId, username: '' })), // Username would need to be fetched from Users table
        tickets: tickets.map((t: { id: string; ownerId: string; color: number }) => ({
          id: t.id,
          owner: t.ownerId,
          color: t.color as TicketColor,
        })),
        offers: [], // Would need to be implemented if needed
        startTime: room.startTime,
        rounds: rounds.map((r: { number: number; startTime: number; endTime: number }) => ({
          number: r.number,
          startTime: r.startTime,
          endTime: r.endTime,
          result: { previousTickets: [], newTickets: [] }, // Would need to be implemented if needed
        })),
      });
    }

    return activeRooms;
  },
}; 