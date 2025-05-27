import type { ReadyState } from "~/module_bindings";

export const userIsReady = (
  roomId: string,
  userId: string,
  roomsReadyState: Record<string, ReadyState>,
) => {
  return roomsReadyState[roomId]?.readyUserIds.includes(userId);
}; 