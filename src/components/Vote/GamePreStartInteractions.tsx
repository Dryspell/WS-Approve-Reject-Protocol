import { Accessor, createSignal } from "solid-js";
import { SetStoreFunction } from "solid-js/store";
import type { GameRoom } from "~/module_bindings/game_room_type";
import type { ReadyState } from "~/module_bindings/ready_state_type";
import type { Identity } from "~/module_bindings/index";
import { DEFAULT_TOAST_DURATION } from "~/lib/timeout-constants";
import { showToast } from "../ui/toast";
import { Button } from "../ui/button";
import { userIsReady } from "~/lib/game-utils";
import { For, Show } from "solid-js";
import { Badge } from "../ui/badge";
import UserAvatarCard from "../Chat/UserAvatarCard";
import type { DbConnection } from "~/module_bindings/index";
import RoomPresets from "../game/RoomPresets";

export default function GamePreStartInteractions(props: {
  roomId: string;
  rooms: Record<string, GameRoom>;
  user: Accessor<{ name: string; id: string }>;
  identity: Accessor<Identity | undefined>; // SpacetimeDB identity for server communication
  roomsPreStart: Record<string, ReadyState>;
  setRoomsPreStart: SetStoreFunction<Record<string, ReadyState>>;
  conn: Accessor<DbConnection | null>;
  connected: Accessor<boolean>;
}) {
  const room = props.rooms[props.roomId];
  if (!room) return null;
  
  const { memberIds } = room;
  const [showPresets, setShowPresets] = createSignal(false);

  // Get the user's SpacetimeDB identity hex string for server communication
  const getUserIdForServer = (): string | null => {
    const identity = props.identity();
    if (!identity) {
      console.warn("⚠️ No SpacetimeDB identity available");
      return null;
    }
    return identity.toHexString();
  };

  const handleToggleReady = () => {
    const connection = props.conn();
    const user = props.user();
    const identityHex = getUserIdForServer();

    if (!connection || !props.connected()) {
      showToast({
        title: "Error",
        description: "Not connected to SpacetimeDB",
        variant: "error",
        duration: DEFAULT_TOAST_DURATION,
      });
      return;
    }

    if (!identityHex) {
      showToast({
        title: "Error",
        description: "Identity not available yet. Please wait...",
        variant: "error",
        duration: DEFAULT_TOAST_DURATION,
      });
      return;
    }

    try {
      const currentState = props.roomsPreStart[props.roomId];
      // Use SpacetimeDB identity hex string, NOT the local user.id
      const wasReady = currentState?.readyUserIds.includes(identityHex) || false;

      console.log("🎮 Toggle ready:", {
        roomId: room.id,
        roomIdString: props.roomId,
        identityHex,
        localUserId: user.id,
        currentState,
        wasReady,
        memberIds: room.memberIds,
        readyUserIds: currentState?.readyUserIds || [],
        allReadyStates: props.roomsPreStart
      });

      // Call the reducer with SpacetimeDB identity, NOT local user.id
      connection.reducers.toggleReady(room.id, identityHex);

      showToast({
        title: wasReady ? "Unreadied" : "Readied Up",
        description: wasReady
          ? "You are not ready."
          : "You are ready to start the game!",
        duration: DEFAULT_TOAST_DURATION,
      });
    } catch (error) {
      console.error("Failed to toggle ready state:", error);
      showToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to toggle ready state",
        variant: "error",
        duration: DEFAULT_TOAST_DURATION,
      });
    }
  };

  return (
    <div class="space-y-4">
      {/* Room Presets Info */}
      <Button
        variant="outline"
        class="w-full"
        onClick={() => setShowPresets(!showPresets())}
      >
        {showPresets() ? '▲ Hide' : '▼ Show'} Game Mode Info
      </Button>

      <Show when={showPresets()}>
        <RoomPresets
          onSelectPreset={(preset) => {
            showToast({
              title: "Game Mode Selected",
              description: `${preset.name}: $${preset.buyinAmount} buy-in, ${preset.roundDuration / 60} min rounds`,
              duration: DEFAULT_TOAST_DURATION,
            });
            setShowPresets(false);
          }}
        />
      </Show>

      {/* Game Info */}
      <div class="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-lg font-semibold text-blue-900">
              {room.name}
            </div>
            <div class="text-sm text-blue-700">
              {memberIds.length} {memberIds.length === 1 ? "player" : "players"} • ${room.buyinAmount.toFixed(2)} buy-in
            </div>
          </div>
          <div class="text-right">
            <div class="text-sm text-blue-600">Pot</div>
            <div class="text-2xl font-bold text-blue-900">
              ${(room.buyinAmount * memberIds.length).toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Players */}
      <div class="flex flex-row flex-wrap gap-2">
        <For each={memberIds}>
          {memberId => (
            <UserAvatarCard user={{ id: memberId, username: memberId }}>
              <div class="flex justify-end">
                {userIsReady(props.roomId, memberId, props.roomsPreStart) ? (
                  <Badge class="bg-green-700">✓ Ready</Badge>
                ) : (
                  <Badge class="bg-orange-600">Waiting...</Badge>
                )}
              </div>
            </UserAvatarCard>
          )}
        </For>
      </div>

      {/* Ready Button */}
      <div class="flex flex-col gap-2">
        <Button
          data-testid="ready-button"
          variant={userIsReady(props.roomId, getUserIdForServer() || "", props.roomsPreStart) ? "outline" : "default"}
          class="w-full py-6 text-lg font-semibold"
          onClick={handleToggleReady}
          disabled={!props.connected() || !props.identity()}
        >
          {userIsReady(props.roomId, getUserIdForServer() || "", props.roomsPreStart) 
            ? "✓ Ready (click to unready)" 
            : "Ready to Play?"}
        </Button>
        <div class="text-center text-sm text-gray-600">
          {userIsReady(props.roomId, getUserIdForServer() || "", props.roomsPreStart)
            ? "Waiting for other players..."
            : `You'll pay $${room.buyinAmount.toFixed(2)} when the game starts`}
        </div>
      </div>
    </div>
  );
}
