import { Accessor, createSignal } from "solid-js";
import { SetStoreFunction } from "solid-js/store";
import type { GameRoom, ReadyState } from "~/module_bindings/types";
import type { Identity } from "~/module_bindings/index";
import { DEFAULT_TOAST_DURATION } from "~/lib/timeout-constants";
import { showToast } from "../ui/toast";
import { Button } from "../ui/button";
import { userIsReady } from "~/lib/game-utils";
import { For, Show } from "solid-js";
import { Badge } from "../ui/badge";
import type { DbConnection } from "~/module_bindings/index";
import RoomPresets from "../game/RoomPresets";
import { resolvePlayerName } from "~/lib/game-utils";

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
      connection.reducers.toggleReady({ roomId: room.id, userId: identityHex });

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

  const readyCount = () => {
    const state = props.roomsPreStart[props.roomId];
    return state?.readyUserIds?.length || 0;
  };

  return (
    <div class="mx-auto max-w-2xl p-6 space-y-6">
      {/* Room Header Card */}
      <div class="rounded-xl border bg-white p-6 shadow-sm">
        <div class="flex items-start justify-between">
          <div>
            <h2 class="text-xl font-bold text-slate-800">{room.name}</h2>
            <div class="mt-1 flex gap-3 text-sm text-slate-500">
              <span>{memberIds.length} player{memberIds.length !== 1 ? "s" : ""}</span>
              <span>${room.buyinAmount.toFixed(2)} buy-in</span>
              <span>{room.votesPerPlayer || 5} votes each</span>
            </div>
          </div>
          <div class="text-right">
            <div class="text-xs font-medium uppercase text-amber-600">Pot</div>
            <div class="text-3xl font-bold text-amber-700">
              ${(room.buyinAmount * memberIds.length).toFixed(2)}
            </div>
          </div>
        </div>

        {/* Room settings row */}
        <div class="mt-3 flex gap-2">
          <Show when={room.allowRebuy}>
            <Badge variant="outline" class="text-xs">Re-buy allowed</Badge>
          </Show>
          <Show when={room.allowMidgameJoin}>
            <Badge variant="outline" class="text-xs">Mid-game join</Badge>
          </Show>
          <Button
            variant="ghost"
            size="sm"
            class="ml-auto text-xs text-slate-400"
            onClick={() => setShowPresets(!showPresets())}
          >
            {showPresets() ? "Hide presets" : "Game modes"}
          </Button>
        </div>
      </div>

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

      {/* Player Grid */}
      <div>
        <div class="mb-2 flex items-center justify-between">
          <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Players
          </span>
          <span class="text-xs text-slate-400">
            {readyCount()}/{memberIds.length} ready
          </span>
        </div>
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          <For each={memberIds}>
            {(memberId) => {
              const isReady = () => userIsReady(props.roomId, memberId, props.roomsPreStart);
              const isMe = () => memberId === getUserIdForServer();
              const name = () => resolvePlayerName(memberId, props.conn());
              return (
                <div
                  class="flex flex-col items-center gap-1.5 rounded-lg border bg-white p-3 shadow-sm transition-all"
                  classList={{
                    "ring-2 ring-blue-400 ring-offset-1": isMe(),
                    "border-green-200 bg-green-50/50": isReady() && !isMe(),
                  }}
                >
                  <div
                    class="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
                    classList={{
                      "bg-green-500": isReady(),
                      "bg-slate-300": !isReady(),
                    }}
                  >
                    {name()[0].toUpperCase()}
                  </div>
                  <div class="truncate text-xs font-medium text-slate-700 max-w-full">
                    {name()}
                    {isMe() && <span class="text-blue-500"> (you)</span>}
                  </div>
                  <Badge
                    variant={isReady() ? "default" : "secondary"}
                    class="text-[10px] px-1.5 py-0"
                    classList={{
                      "bg-green-600": isReady(),
                    }}
                  >
                    {isReady() ? "Ready" : "Waiting"}
                  </Badge>
                </div>
              );
            }}
          </For>
        </div>
      </div>

      {/* Ready Button */}
      <Button
        data-testid="ready-button"
        variant={userIsReady(props.roomId, getUserIdForServer() || "", props.roomsPreStart) ? "outline" : "default"}
        class="w-full py-5 text-base font-semibold"
        onClick={handleToggleReady}
        disabled={!props.connected() || !props.identity()}
      >
        {userIsReady(props.roomId, getUserIdForServer() || "", props.roomsPreStart) 
          ? "Ready (click to unready)" 
          : "Ready to Play?"}
      </Button>
      <p class="text-center text-xs text-slate-400">
        {userIsReady(props.roomId, getUserIdForServer() || "", props.roomsPreStart)
          ? `Waiting for ${memberIds.length - readyCount()} more player${memberIds.length - readyCount() !== 1 ? "s" : ""}...`
          : `You'll pay $${room.buyinAmount.toFixed(2)} when the game starts`}
      </p>
    </div>
  );
}
