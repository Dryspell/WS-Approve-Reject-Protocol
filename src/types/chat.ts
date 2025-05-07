export type Message = {
  id?: string;
  senderId: string;
  roomId: string;
  timestamp: number;
  message: string;
  roundNumber?: number;
};

export type ChatPermission = 'read' | 'write' | 'admin';

export type ChatRoom = {
  roomId: string;
  roomName: string;
  messages: Message[];
  permissions: ChatPermission[];
}; 