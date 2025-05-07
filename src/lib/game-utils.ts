import { RoundsReadyState } from "~/types/vote";

export const userIsReady = (
  roomId: string,
  userId: string,
  roomsReadyState: Record<string, RoundsReadyState>,
) => {
  return roomsReadyState[roomId]?.readyUsers.includes(userId);
}; 