import type { ReadyState } from "~/module_bindings/types";
import type { DbConnection } from "~/module_bindings/index";

export const userIsReady = (
  roomId: string,
  userId: string,
  roomsReadyState: Record<string, ReadyState>,
) => {
  return roomsReadyState[roomId]?.readyUserIds.includes(userId);
};

/**
 * Resolve a SpacetimeDB identity hex string to a display name.
 * Falls back to a truncated hex string if no name is set.
 */
export function resolvePlayerName(
  identityHex: string,
  connection: DbConnection | null,
): string {
  if (!connection) return truncateHex(identityHex);
  const user = Array.from(connection.db.user.iter()).find(
    (u) => u.identity.toHexString() === identityHex,
  );
  return user?.name || truncateHex(identityHex);
}

function truncateHex(hex: string): string {
  if (hex.length <= 10) return hex;
  return `${hex.slice(0, 6)}...${hex.slice(-4)}`;
}