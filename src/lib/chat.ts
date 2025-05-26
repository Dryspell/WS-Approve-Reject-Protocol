import { createId } from "@paralleldrive/cuid2";
import { Message } from "~/types/chat";
import { User } from "~/types/user";

// SpacetimeDB client types
type SpacetimeDBMessage = {
  id: string;
  room_id: string;
  sender_id: string;
  message: string;
  timestamp: number;
  round_number?: number;
};

type SpacetimeDBRoom = {
  id: string;
  name: string;
  created_at: number;
};

type SpacetimeDBPermission = {
  room_id: string;
  user_id: string;
  permission: string;
};

class ChatService {
  private spacetimedb: any; // Replace with actual SpacetimeDB client type
  private messageCallbacks: ((message: Message) => void)[] = [];
  private roomCallbacks: ((room: SpacetimeDBRoom) => void)[] = [];

  constructor(spacetimedbClient: any) {
    this.spacetimedb = spacetimedbClient;
    this.setupSubscriptions();
  }

  private setupSubscriptions() {
    // Subscribe to new messages
    this.spacetimedb.subscribe("ChatMessage", (message: SpacetimeDBMessage) => {
      const chatMessage: Message = {
        id: message.id,
        senderId: message.sender_id,
        roomId: message.room_id,
        timestamp: message.timestamp,
        message: message.message,
        roundNumber: message.round_number,
      };
      this.messageCallbacks.forEach(callback => callback(chatMessage));
    });

    // Subscribe to room updates
    this.spacetimedb.subscribe("ChatRoom", (room: SpacetimeDBRoom) => {
      this.roomCallbacks.forEach(callback => callback(room));
    });
  }

  async createRoom(name: string): Promise<string> {
    try {
      const roomId = await this.spacetimedb.call("create_room", name);
      return roomId;
    } catch (error) {
      console.error("Failed to create room:", error);
      throw error;
    }
  }

  async sendMessage(roomId: string, message: string, roundNumber?: number): Promise<string> {
    try {
      const messageId = await this.spacetimedb.call("send_message", roomId, message, roundNumber);
      return messageId;
    } catch (error) {
      console.error("Failed to send message:", error);
      throw error;
    }
  }

  async getMessages(roomId: string, limit?: number): Promise<Message[]> {
    try {
      const messages = await this.spacetimedb.query("get_messages", roomId, limit);
      return messages.map((msg: SpacetimeDBMessage) => ({
        id: msg.id,
        senderId: msg.sender_id,
        roomId: msg.room_id,
        timestamp: msg.timestamp,
        message: msg.message,
        roundNumber: msg.round_number,
      }));
    } catch (error) {
      console.error("Failed to get messages:", error);
      throw error;
    }
  }

  async getRoom(roomId: string): Promise<SpacetimeDBRoom | null> {
    try {
      return await this.spacetimedb.query("get_room", roomId);
    } catch (error) {
      console.error("Failed to get room:", error);
      throw error;
    }
  }

  async setPermission(roomId: string, userId: string, permission: string): Promise<void> {
    try {
      await this.spacetimedb.call("set_permission", roomId, userId, permission);
    } catch (error) {
      console.error("Failed to set permission:", error);
      throw error;
    }
  }

  onMessage(callback: (message: Message) => void) {
    this.messageCallbacks.push(callback);
    return () => {
      this.messageCallbacks = this.messageCallbacks.filter(cb => cb !== callback);
    };
  }

  onRoomUpdate(callback: (room: SpacetimeDBRoom) => void) {
    this.roomCallbacks.push(callback);
    return () => {
      this.roomCallbacks = this.roomCallbacks.filter(cb => cb !== callback);
    };
  }
}

export const createChatService = (spacetimedbClient: any) => {
  return new ChatService(spacetimedbClient);
}; 