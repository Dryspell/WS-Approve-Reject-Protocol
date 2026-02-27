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
  // Reactive accessor so member count and room info update without remount
  const room = () => props.rooms[props.roomId];
  const memberIds = () => room()?.memberIds ?? [];

  const [nearBuildingId, setNearBuildingId] = createSignal<string | null>(null);
  const [activeBuildingId, setActiveBuildingId] = createSignal<string | null>(null);
  const [countdown, setCountdown] = createSignal<number | null>(null);
  const [showControls, setShowControls] = createSignal(true);

  // Auto-dismiss controls hint after 8 seconds
  setTimeout(() => setShowControls(false), 8000);

  const getUserIdForServer = (): string | null => {
    const identity = props.identity();
    if (!identity) return null;
    return identity.toHexString();
  };

  const handleToggleReady = () => {
    const connection = props.conn();
    const identityHex = getUserIdForServer();
    const currentRoom = room();

    if (!connection || !props.connected()) {
      showToast({ title: "Error", description: "Not connected to SpacetimeDB", variant: "error", duration: DEFAULT_TOAST_DURATION });
      return;
    }
    if (!identityHex) {
      showToast({ title: "Error", description: "Identity not available yet. Please wait...", variant: "error", duration: DEFAULT_TOAST_DURATION });
      return;
    }
    if (!currentRoom) return;

    try {
      const currentState = props.roomsPreStart[props.roomId];
      const wasReady = currentState?.readyUserIds.includes(identityHex) || false;
      connection.reducers.toggleReady({ roomId: currentRoom.id, userId: identityHex });
      showToast({
        title: wasReady ? "Unreadied" : "Readied Up",
        description: wasReady ? "You are not ready." : "You are ready to start the game!",
        duration: DEFAULT_TOAST_DURATION,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const isInsufficient = msg.toLowerCase().includes("insufficient") || msg.toLowerCase().includes("funds") || msg.toLowerCase().includes("balance");
      showToast({
        title: isInsufficient ? "Insufficient Funds" : "Error",
        description: isInsufficient
          ? `You need at least $${currentRoom.buyinAmount.toFixed(2)} to ready up. Top up your wallet first.`
          : msg,
        variant: "error",
        duration: DEFAULT_TOAST_DURATION,
      });
    }
  };

  const readyCount = () => {
    const state = props.roomsPreStart[props.roomId];
    return state?.readyUserIds?.length || 0;
  };

  const isReady = () => userIsReady(props.roomId, getUserIdForServer() || "", props.roomsPreStart);

  // Countdown when all players are ready — only fires when local player is a member
  createEffect(() => {
    const members = memberIds();
    const ready = readyCount();
    const localId = getUserIdForServer();
    const isLocalMember = localId ? members.includes(localId) : false;

    if (isLocalMember && members.length > 0 && ready === members.length && countdown() === null) {
      setCountdown(3);
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            // All players are ready — call startGame (backend guards against double-starts)
            const connection = props.conn();
            const currentRoom = room();
            if (connection && currentRoom) {
              try {
                connection.reducers.startGame({ roomId: currentRoom.id });
              } catch (_e) {
                // Already started or not permitted — ignore
              }
            }
            return null;
          }
          return prev - 1;
        });
      }, 1000);
      onCleanup(() => clearInterval(interval));
    }
    if (ready < members.length) {
      setCountdown(null);
    }
  });

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
    connection.db.player_position.onInsert(() => refresh());
    connection.db.player_position.onUpdate(() => refresh());
    connection.db.player_position.onDelete(() => refresh());
  });

  const lobbyPlayers = createMemo<LobbyPlayer[]>(() => {
    const myId = getUserIdForServer();
    const positions = playerPositions();

    return memberIds()
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

  // Throttled position update — max 10hz, only when moved >0.1 units
  let _lastPosUpdate = 0;
  let _lastPosX = 0;
  let _lastPosZ = 0;

  const handlePositionUpdate = (x: number, z: number, rotY: number, moving: boolean) => {
    const now = Date.now();
    if (now - _lastPosUpdate < 100) return;
    if (Math.abs(x - _lastPosX) < 0.1 && Math.abs(z - _lastPosZ) < 0.1 && !moving) return;
    _lastPosX = x;
    _lastPosZ = z;
    _lastPosUpdate = now;
    const connection = props.conn();
    if (!connection || !props.connected()) return;
    const roomIdNum = parseInt(props.roomId, 10);
    try {
      connection.reducers.updatePlayerPosition({ roomId: roomIdNum, x, z, rotationY: rotY, isMoving: moving });
    } catch {
      // fire-and-forget
    }
  };

  const buildingNames: Record<string, string> = {
    armory: "Armory",
    barracks: "Barracks",
    tavern: "Tavern",
  };

  const handleBuildingInteract = (buildingId: string | null) => {
    setNearBuildingId(buildingId);
  };

  const openChatOverlay = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("open-chat-overlay"));
    }
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
    <Show when={room()} fallback={null}>
      {(currentRoom) => (
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
              <h2 class="text-lg font-bold text-white">{currentRoom().name}</h2>
              <span class="text-xs text-white/50">
                {memberIds().length} player{memberIds().length !== 1 ? "s" : ""}
              </span>
              <span class="text-xs text-white/50">${currentRoom().buyinAmount.toFixed(2)} buy-in</span>
              <span class="text-xs text-white/50">{currentRoom().votesPerPlayer || 5} votes</span>
              <Show when={currentRoom().allowRebuy}>
                <Badge variant="outline" class="text-[10px] border-white/20 text-white/50" title="Re-buy enabled — eliminated players can pay the buy-in again to re-enter">Re-buy ✦</Badge>
              </Show>
            </div>
            <div class="flex items-center gap-3">
              <div class="text-right">
                <span class="text-xs text-amber-400 uppercase font-medium">Pot </span>
                <span class="text-lg font-bold text-amber-300">
                  ${(currentRoom().buyinAmount * memberIds().length).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* WASD hint (layer 10) — auto-dismisses, re-show with ? button */}
          <Show when={showControls()}>
            <div class="absolute top-14 left-4 z-10 pointer-events-none animate-in fade-in duration-300">
              <div class="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2 text-white/40 text-xs">
                <div class="font-medium text-white/60 mb-1">Controls</div>
                <div>WASD / Arrow keys to move</div>
                <div>Walk to buildings to interact</div>
              </div>
            </div>
          </Show>
          <Show when={!showControls()}>
            <button
              class="absolute top-14 left-4 z-10 flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 text-xs text-white/30 hover:bg-black/60 hover:text-white/60 transition-colors"
              title="Show controls"
              onClick={() => setShowControls(true)}
            >
              <span>?</span>
              <span>Controls</span>
            </button>
          </Show>

          {/* Building interaction prompt (layer 10) */}
          <Show when={nearBuildingId() && !activeBuildingId()}>
            <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
              <div class="bg-black/70 backdrop-blur-md px-6 py-3 rounded-xl text-white text-sm border border-white/10 shadow-xl animate-pulse">
                Press <kbd class="px-2 py-0.5 bg-white/20 rounded text-xs font-mono mx-1">E</kbd>
                to enter {buildingNames[nearBuildingId()!] || nearBuildingId()}
              </div>
            </div>
          </Show>

          {/* Countdown overlay */}
          <Show when={countdown() !== null}>
            <div class="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
              <div class="text-9xl font-black text-white drop-shadow-2xl animate-pulse">
                {countdown()}
              </div>
            </div>
          </Show>

          {/* Bottom center: players + ready button (layer 10) */}
          <div class="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 w-full max-w-lg px-4">
            <div class="rounded-xl border border-white/10 bg-black/50 backdrop-blur-md p-4 shadow-xl">
              {/* Compact player avatars row */}
              <div class="flex items-center gap-2 justify-center mb-3 flex-wrap">
                <For each={memberIds()}>
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
                  {readyCount()}/{memberIds().length} ready
                </span>
              </div>

              {/* Show Join or Ready button depending on membership */}
              <Show
                when={getUserIdForServer() && memberIds().includes(getUserIdForServer()!)}
                fallback={
                  <div class="space-y-2">
                    <Button
                      class="w-full py-4 text-base font-semibold"
                      onClick={() => {
                        const connection = props.conn();
                        const userId = getUserIdForServer();
                        const currentRoom = room();
                        if (!connection || !userId || !currentRoom) return;
                        try {
                          connection.reducers.joinRoom({ roomId: currentRoom.id, userId });
                        } catch (err) {
                          showToast({ title: "Could not join", description: String(err), variant: "error", duration: DEFAULT_TOAST_DURATION });
                        }
                      }}
                      disabled={!props.connected() || !props.identity()}
                    >
                      Join Room
                    </Button>
                    <p class="text-center text-xs text-white/30">
                      ${currentRoom().buyinAmount.toFixed(2)} buy-in when the game starts
                    </p>
                  </div>
                }
              >
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
                    ? `Waiting for ${memberIds().length - readyCount()} more player${memberIds().length - readyCount() !== 1 ? "s" : ""}...`
                    : `You'll pay $${currentRoom().buyinAmount.toFixed(2)} when the game starts`}
                </p>

                {/* Leave lobby button */}
                <button
                  class="w-full mt-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/40 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 transition-all"
                  onClick={() => {
                    const connection = props.conn();
                    const currentRoom = room();
                    if (!connection || !currentRoom) return;
                    try {
                      connection.reducers.leaveRoom({ roomId: currentRoom.id });
                    } catch (err) {
                      showToast({ title: "Could not leave", description: String(err), variant: "error", duration: DEFAULT_TOAST_DURATION });
                    }
                  }}
                >
                  Leave Lobby
                </button>
              </Show>
            </div>
          </div>

          {/* Minion management panel (layer 20, triggered by barracks) */}
          <Show when={activeBuildingId() === "barracks"}>
            <MinionManagementPanel
              conn={props.conn}
              identity={props.identity}
              roomId={props.roomId}
              votesPerPlayer={currentRoom().votesPerPlayer || 5}
              onClose={() => setActiveBuildingId(null)}
            />
          </Show>

          {/* Character customization panel (layer 20, triggered by armory) */}
          <Show when={activeBuildingId() === "armory"}>
            <CharacterCustomizationPanel
              onClose={() => setActiveBuildingId(null)}
            />
          </Show>

          {/* Tavern: opens the social chat overlay */}
          <Show when={activeBuildingId() === "tavern"}>
            <div class="absolute inset-0 z-20 flex items-center justify-center">
              <div class="rounded-xl border border-white/10 bg-black/80 backdrop-blur-md p-6 shadow-xl max-w-sm w-full mx-4">
                <h3 class="text-lg font-bold text-white mb-1">Tavern</h3>
                <p class="text-sm text-white/50 mb-4">
                  A place for alliances, rumors, and betrayals.
                </p>
                <Button
                  class="w-full mb-2"
                  onClick={() => {
                    openChatOverlay();
                    setActiveBuildingId(null);
                  }}
                >
                  💬 Open Chat &amp; Contacts
                </Button>
                <Button variant="outline" class="w-full" onClick={() => setActiveBuildingId(null)}>
                  Close <span class="text-white/30 ml-2 text-xs">[Esc]</span>
                </Button>
              </div>
            </div>
          </Show>
        </div>
      )}
    </Show>
  );
}
