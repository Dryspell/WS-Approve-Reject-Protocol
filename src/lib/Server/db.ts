import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { GameRooms, GameRoomMembers, GameRounds, Tickets, RoundReadyStates, ChatMessages, ChatPermissions } from '../../../drizzle/schema';
import { GameRoom, GameRound, Ticket, TicketColor } from '~/types/vote';
import { createId } from '@paralleldrive/cuid2';
import { eq, gt, and, desc } from 'drizzle-orm';
import { Message } from '~/types/chat';

const sqlite = new Database('sqlite.db');
const db = drizzle(sqlite);

export const dbService = {
  // Room operations
  async createRoom(room: GameRoom) {
    await db.insert(GameRooms).values({
      id: room.id,
      name: room.name,
      startTime: room.startTime,
      createdAt: Date.now(),
    });

    // Insert members
    await db.insert(GameRoomMembers).values(
      room.members.map((member) => ({
        roomId: room.id,
        userId: member.id,
        joinedAt: Date.now(),
      }))
    );

    // Set default chat permissions for all members
    await db.insert(ChatPermissions).values(
      room.members.map(member => ({
        roomId: room.id,
        userId: member.id,
        permission: 'write',
      }))
    );
  },

  async updateRoom(room: GameRoom) {
    await db.update(GameRooms).set(room).where(eq(GameRooms.id, room.id));
  },

  // Round operations
  async saveRound(roomId: string, round: GameRound) {
    await db.insert(GameRounds).values({
      id: createId(), // Generate new ID for the round
      roomId,
      roundNumber: round.number, // Use number instead of roundNumber
      startTime: round.startTime,
      endTime: round.endTime,
    });
  },

  async getRound(roomId: string, roundNumber: number) {
    return db
      .select()
      .from(GameRounds)
      .where(
        and(
          eq(GameRounds.roomId, roomId),
          eq(GameRounds.roundNumber, roundNumber)
        )
      )
      .get();
  },

  // Ticket operations
  async saveTicket(roomId: string, ticket: Ticket) {
    await db.insert(Tickets).values({
      id: ticket.id,
      roomId,
      owner: ticket.owner,
      color: ticket.color,
      createdAt: Date.now(),
    });
  },

  async updateTicket(roomId: string, ticket: Ticket) {
    await db
      .update(Tickets)
      .set(ticket)
      .where(and(eq(Tickets.id, ticket.id), eq(Tickets.roomId, roomId)));
  },

  async getTickets(roomId: string) {
    return db
      .select()
      .from(Tickets)
      .where(eq(Tickets.roomId, roomId))
      .all();
  },

  // Ready state operations
  async saveReadyState(roomId: string, userId: string, roundNumber: number) {
    await db.insert(RoundReadyStates).values({
      roomId,
      userId,
      roundNumber,
      readyAt: Date.now(),
    });
  },

  async getReadyStates(roomId: string, roundNumber: number) {
    return db
      .select()
      .from(RoundReadyStates)
      .where(
        and(
          eq(RoundReadyStates.roomId, roomId),
          eq(RoundReadyStates.roundNumber, roundNumber)
        )
      )
      .all();
  },

  // Room queries
  async getRoom(roomId: string) {
    return db.select().from(GameRooms).where(eq(GameRooms.id, roomId)).get();
  },

  async getActiveRooms() {
    return db
      .select()
      .from(GameRooms)
      .where(gt(GameRooms.startTime, 0))
      .all();
  },

  // Chat operations
  async saveMessage(message: Message) {
    await db.insert(ChatMessages).values({
      id: message.id,
      roomId: message.roomId,
      senderId: message.senderId,
      message: message.message,
      timestamp: message.timestamp,
      roundNumber: message.roundNumber,
    });
  },

  async getMessages(roomId: string, limit: number = 50) {
    return db
      .select()
      .from(ChatMessages)
      .where(eq(ChatMessages.roomId, roomId))
      .orderBy(ChatMessages.timestamp)
      .limit(limit)
      .all();
  },

  async getUserPermissions(roomId: string, userId: string) {
    const permissions = await db.select()
      .from(ChatPermissions)
      .where(
        and(
          eq(ChatPermissions.roomId, roomId),
          eq(ChatPermissions.userId, userId)
        )
      );
    return permissions.map(p => p.permission);
  },

  // Recovery operations
  async getActiveRoomsWithDetails() {
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
        .orderBy(GameRounds.roundNumber);

      const tickets = await db.select()
        .from(Tickets)
        .where(eq(Tickets.roomId, room.id));

      activeRooms.push({
        id: room.id,
        name: room.name,
        members: members.map((m: { userId: string }) => ({ id: m.userId, username: '' })), // Username would need to be fetched from Users table
        tickets: tickets.map((t: { id: string; owner: string; color: number | null }) => ({
          id: t.id,
          owner: t.owner,
          color: t.color as TicketColor,
        })),
        offers: [], // Would need to be implemented if needed
        startTime: room.startTime,
        rounds: rounds.map((r: { roundNumber: number; startTime: number; endTime: number | null }) => ({
          number: r.roundNumber,
          startTime: r.startTime,
          endTime: r.endTime ?? 0,
          result: { previousTickets: [], newTickets: [] }, // Would need to be implemented if needed
        })),
      });
    }

    return activeRooms;
  },
}; 