import { Accessor, createSignal, createMemo, createEffect, onCleanup } from "solid-js";
import { SetStoreFunction } from "solid-js/store";
import type { GameRoom, ReadyState } from "~/module_bindings/types";
type Identity = import("spacetimedb").Identity;
import { DEFAULT_TOAST_DURATION } from "~/lib/timeout-constants";
import { showToast } from "../ui/toast";
import { Button } from "../ui/button";
import { userIsReady } from "~/lib/game-utils";
import { For, Show } from "solid-js";
import { Badge } from "../ui/badge";
import type { DbConnection } from "~/module_bindings/index";
import RoomPresets from "../game/RoomPresets";
import { resolvePlayerName } from "~/lib/game-utils";
import { TID } from "~/lib/test-ids";
import LobbyViewport, { type LobbyPlayer } from "../game/LobbyViewport";
import { characterForIndex } from "~/lib/asset-loader";
import MinionManagementPanel from "../game/MinionManagementPanel";
import CharacterCustomizationPanel from "../game/CharacterCustomizationPanel";

export default function GamePreStartInteractions(props: {
  roomId: string;
  rooms: Record<string, GameRoom>;
  user: Accessor<{ name: string; id: string }>;
  identity: Accessor<Identity | undefined>;
  roomsPreStart: Record<string, ReadyState>;
  setRoomsPreStart: SetStoreFunction<Record<string, ReadyState>>;
  conn: Accessor<DbConnection | null>;
  connected: Accessor<boolean>;
}) {
  const room = props.rooms[props.roomId];
  if (!room) return null;

  const { memberIds } = room;
  const [showPresets, setShowPresets] = createSignal(false);
  const [nearBuildingId, setNearBuildingId] = createSignal<string | null>(null);
  const [activeBuildingId, setActiveBuildingId] = createSignal<string | null>(null);

  const getUserIdForServer = (): string | null => {
    const identity = props.identity();
    if (!identity) return null;
    return identity.toHexString();
  };

  const handleToggleReady = () => {
    const connection = props.conn();
    const identityHex = getUserIdForServer();

    if (!connection || !props.connected()) {
      showToast({ title: "Error", description: "Not connected to SpacetimeDB", variant: "error", duration: DEFAULT_TOAST_DURATION });
      return;
    }
    if (!identityHex) {
      showToast({ title: "Error", description: "Identity not available yet. Please wait...", variant: "error", duration: DEFAULT_TOAST_DURATION });
      return;
    }

    try {
      const currentState = props.roomsPreStart[props.roomId];
      const wasReady = currentState?.readyUserIds.includes(identityHex) || false;
      connection.reducers.toggleReady({ roomId: room.id, userId: identityHex });
      showToast({
        title: wasReady ? "Unreadied" : "Readied Up",
        description: wasReady ? "You are not ready." : "You are ready to start the game!",
        duration: DEFAULT_TOAST_DURATION,
      });
    } catch (error) {
      showToast({ title: "Error", description: error instanceof Error ? error.message : "Failed to toggle ready state", variant: "error", duration: DEFAULT_TOAST_DURATION });
    }
  };

  const readyCount = () => {
    const state = props.roomsPreStart[props.roomId];
    return state?.readyUserIds?.length || 0;
  };

  const isReady = () => userIsReady(props.roomId, getUserIdForServer() || "", props.roomsPreStart);

  // Track other players' network positions
  const [playerPositions, setPlayerPositions] = createSignal<
    Array<{ identity: string; x: number; z: number; rotationY: number; isMoving: boolean }>
  >([]);

  // Subscribe to PlayerPosition table updates
  createEffect(() => {
    const connection = props.conn();
    if (!connection) return;

    const roomIdNum = parseInt(props.roomId, 10);
    const refresh = () => {
      const positions = Array.from(connection.db.player_position.iter())
        .filter(p => p.roomId === roomIdNum)
        .map(p => ({
          identity: p.identity.toHexString(),
          x: p.x,
          z: p.z,
          rotationY: p.rotationY,
          isMoving: p.isMoving,
        }));
      setPlayerPositions(positions);
    };

    refresh();
    const onInsert = connection.db.player_position.onInsert(() => refresh());
    const onUpdate = connection.db.player_position.onUpdate(() => refresh());
    const onDelete = connection.db.player_position.onDelete(() => refresh());
  });

  const lobbyPlayers = createMemo<LobbyPlayer[]>(() => {
    const myId = getUserIdForServer();
    const positions = playerPositions();

    return memberIds
      .filter(id => id !== myId)
      .map((id, i) => {
        const netPos = positions.find(p => p.identity === id);
        return {
          id,
          name: resolvePlayerName(id, props.conn()),
          character: characterForIndex(i + 1),
          x: netPos?.x ?? (-6 + (i % 4) * 4),
          z: netPos?.z ?? (-3 + Math.floor(i / 4) * 4),
          isReady: userIsReady(props.roomId, id, props.roomsPreStart),
          isMoving: netPos?.isMoving ?? false,
        };
      });
  });

  const handlePositionUpdate = (x: number, z: number, rotY: number, moving: boolean) => {
    const connection = props.conn();
    if (!connection || !props.connected()) return;
    const roomIdNum = parseInt(props.roomId, 10);
    connection.reducers.updatePlayerPosition({ roomId: roomIdNum, x, z, rotationY: rotY, isMoving: moving });
  };

  const buildingNames: Record<string, string> = {
    armory: "Armory",
    barracks: "Barracks",
    tavern: "Tavern",
  };

  const handleBuildingInteract = (buildingId: string | null) => {
    setNearBuildingId(buildingId);
  };

  // E key to enter/exit buildings
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (e.key.toLowerCase() === "e") {
      if (activeBuildingId()) {
        setActiveBuildingId(null);
      } else if (nearBuildingId()) {
        setActiveBuildingId(nearBuildingId());
      }
    }
    if (e.key === "Escape" && activeBuildingId()) {
      setActiveBuildingId(null);
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("keydown", handleKeyDown);
    onCleanup(() => window.removeEventListener("keydown", handleKeyDown));
  }

  return (
    <div class="absolute inset-0 overflow-hidden bg-[#111827]">
      {/* Full-screen 3D lobby viewport (layer 0) */}
      <div class="absolute inset-0 z-0">
        <LobbyViewport
          playerName={props.user().name}
          otherPlayers={lobbyPlayers()}
          onBuildingInteract={handleBuildingInteract}
          onPositionUpdate={handlePositionUpdate}
        />
      </div>

      {/* Top bar: room info (layer 10) */}
      <div
        class="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-2 bg-black/40 backdrop-blur-md border-b border-white/10"
        data-testid={TID.lobbyHeader}
      >
        <div class="flex items-center gap-3">
          <h2 class="text-lg font-bold text-white">{room.name}</h2>
          <span class="text-xs text-white/50">
            {memberIds.length} player{memberIds.length !== 1 ? "s" : ""}
          </span>
          <span class="text-xs text-white/50">${room.buyinAmount.toFixed(2)} buy-in</span>
          <span class="text-xs text-white/50">{room.votesPerPlayer || 5} votes</span>
          <Show when={room.allowRebuy}>
            <Badge variant="outline" class="text-[10px] border-white/20 text-white/50">Re-buy</Badge>
          </Show>
        </div>
        <div class="flex items-center gap-3">
          <div class="text-right">
            <span class="text-xs text-amber-400 uppercase font-medium">Pot </span>
            <span class="text-lg font-bold text-amber-300">
              ${(room.buyinAmount * memberIds.length).toFixed(2)}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            class="text-xs text-white/50 hover:text-white"
            onClick={() => setShowPresets(!showPresets())}
          >
            {showPresets() ? "Hide" : "Modes"}
          </Button>
        </div>
      </div>

      {/* Presets panel (layer 15) */}
      <Show when={showPresets()}>
        <div class="absolute top-12 right-4 z-15 w-80">
          <div class="rounded-xl border border-white/10 bg-black/70 backdrop-blur-md p-4 shadow-xl">
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
          </div>
        </div>
      </Show>

      {/* WASD hint (layer 10) */}
      <div class="absolute top-14 left-4 z-10 pointer-events-none">
        <div class="bg-black/40 backdrop-blur-sm rounded-lg px-3 py-2 text-white/40 text-xs">
          <div class="font-medium text-white/60 mb-1">Controls</div>
          <div>WASD / Arrow keys to move</div>
          <div>Walk to buildings to interact</div>
        </div>
      </div>

      {/* Building interaction prompt (layer 10) */}
      <Show when={nearBuildingId() && !activeBuildingId()}>
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
          <div class="bg-black/70 backdrop-blur-md px-6 py-3 rounded-xl text-white text-sm border border-white/10 shadow-xl animate-pulse">
            Press <kbd class="px-2 py-0.5 bg-white/20 rounded text-xs font-mono mx-1">E</kbd>
            to enter {buildingNames[nearBuildingId()!] || nearBuildingId()}
          </div>
        </div>
      </Show>

      {/* Bottom center: players + ready button (layer 10) */}
      <div class="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 w-full max-w-lg px-4">
        <div class="rounded-xl border border-white/10 bg-black/50 backdrop-blur-md p-4 shadow-xl">
          {/* Compact player avatars row */}
          <div class="flex items-center gap-2 justify-center mb-3 flex-wrap">
            <For each={memberIds}>
              {(memberId) => {
                const ready = () => userIsReady(props.roomId, memberId, props.roomsPreStart);
                const isMe = () => memberId === getUserIdForServer();
                const name = () => resolvePlayerName(memberId, props.conn());
                return (
                  <div
                    class="relative group"
                    data-testid={TID.playerCard}
                  >
                    <div
                      class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white transition-all"
                      classList={{
                        "bg-green-600": ready(),
                        "bg-slate-600": !ready(),
                        "ring-2 ring-blue-400": isMe(),
                      }}
                    >
                      {name()[0].toUpperCase()}
                    </div>
                    {/* Tooltip */}
                    <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-0.5 bg-black/80 rounded text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      {name()}{isMe() && " (you)"} - {ready() ? "Ready" : "Waiting"}
                    </div>
                  </div>
                );
              }}
            </For>
            <span class="text-xs text-white/40 ml-2">
              {readyCount()}/{memberIds.length} ready
            </span>
          </div>

          {/* Ready button */}
          <Button
            data-testid={TID.readyButton}
            variant={isReady() ? "outline" : "default"}
            class="w-full py-4 text-base font-semibold"
            onClick={handleToggleReady}
            disabled={!props.connected() || !props.identity()}
          >
            {isReady() ? "Ready (click to unready)" : "Ready to Play?"}
          </Button>
          <p class="text-center text-xs text-white/30 mt-1.5">
            {isReady()
              ? `Waiting for ${memberIds.length - readyCount()} more player${memberIds.length - readyCount() !== 1 ? "s" : ""}...`
              : `You'll pay $${room.buyinAmount.toFixed(2)} when the game starts`}
          </p>
        </div>
      </div>

      {/* Minion management panel (layer 20, triggered by barracks) */}
      <Show when={activeBuildingId() === "barracks"}>
        <MinionManagementPanel
          conn={props.conn}
          identity={props.identity}
          roomId={props.roomId}
          votesPerPlayer={room.votesPerPlayer || 5}
          onClose={() => setActiveBuildingId(null)}
        />
      </Show>

      {/* Character customization panel (layer 20, triggered by armory) */}
      <Show when={activeBuildingId() === "armory"}>
        <CharacterCustomizationPanel
          onClose={() => setActiveBuildingId(null)}
        />
      </Show>

      {/* Tavern: simple chat prompt for now */}
      <Show when={activeBuildingId() === "tavern"}>
        <div class="absolute inset-0 z-20 flex items-center justify-center">
          <div class="rounded-xl border border-white/10 bg-black/80 backdrop-blur-md p-6 shadow-xl max-w-sm w-full mx-4">
            <h3 class="text-lg font-bold text-white mb-2">Tavern</h3>
            <p class="text-sm text-white/50 mb-4">
              Chat with other players using the messenger overlay in the bottom-right corner.
            </p>
            <Button variant="outline" class="w-full" onClick={() => setActiveBuildingId(null)}>
              Close <span class="text-white/30 ml-2 text-xs">[Esc]</span>
            </Button>
          </div>
        </div>
      </Show>
    </div>
  );
}
