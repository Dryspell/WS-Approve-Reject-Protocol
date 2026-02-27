import { Component, createSignal, For, createEffect, Show, Accessor, Setter, batch, onMount, onCleanup } from "solid-js";
import { createLocalStorageSignal } from "~/hooks/createLocalStorageSignal";
import { randAnimal } from "@ngneat/falso";
import { createId } from "@paralleldrive/cuid2";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import VotingInterface from "./VotingInterface";
import GamePreStartInteractions from "./GamePreStartInteractions";
import { useSpacetimeDB } from "~/hooks/useSpacetimeDB";
import { showToast } from "../ui/toast";
import { DEFAULT_TOAST_DURATION } from "~/lib/timeout-constants";
import { createStore } from "solid-js/store";
import type { GameRoom, ReadyState } from "~/module_bindings/types";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { resolvePlayerName } from "~/lib/game-utils";
import { TID } from "~/lib/test-ids";
import GuestNamePrompt from "~/components/GuestNamePrompt";

/**
 * Check if multiuser mode is enabled via URL parameter.
 * When ?multiuser=true, each tab gets a unique user identity using sessionStorage.
 * This is useful for testing with multiple players in different browser tabs.
 */
function isMultiuserMode(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('multiuser') === 'true';
}

/**
 * Create a user signal that uses sessionStorage in multiuser mode (unique per tab)
 * or localStorage in normal mode (shared across tabs for session continuity).
 */
function createUserSignal(): [Accessor<{ name: string; id: string }>, Setter<{ name: string; id: string }>] {
  const defaultUser = { name: randAnimal(), id: createId() };
  
  if (typeof window === 'undefined') {
    // SSR: return a simple signal
    return createSignal(defaultUser);
  }
  
  if (isMultiuserMode()) {
    // Multiuser mode: use sessionStorage for tab-unique identity
    const storageKey = 'multiuser-chat-user';
    const stored = sessionStorage.getItem(storageKey);
    const initialUser = stored ? JSON.parse(stored) : defaultUser;
    
    // Store the new user if not already stored
    if (!stored) {
      sessionStorage.setItem(storageKey, JSON.stringify(initialUser));
    }
    
    const [user, setUser] = createSignal(initialUser);
    
    // Sync changes to sessionStorage
    createEffect(() => {
      sessionStorage.setItem(storageKey, JSON.stringify(user()));
    });
    
    console.log('🧪 Multiuser mode: Using unique session-based user identity', initialUser.id.slice(0, 8));
    return [user, setUser];
  }
  
  // Normal mode: use localStorage for session continuity
  return createLocalStorageSignal("chat-user", defaultUser);
}

const VoteBox: Component = () => {
  const [rooms, setRooms] = createSignal<Record<string, GameRoom>>({});
  const [roomIds, setRoomIds] = createSignal<string[]>([]);
  const [roomsReadyState, setRoomsReadyState] = createStore<Record<string, ReadyState>>({});
  const [currentRoom, setCurrentRoom] = createSignal<string | undefined>(undefined);
  const [newRoomName, setNewRoomName] = createSignal("");
  const [buyinAmount, setBuyinAmount] = createSignal<number>(10);
  const [votesPerPlayer, setVotesPerPlayer] = createSignal<number>(5);
  const [allowRebuy, setAllowRebuy] = createSignal(true);
  const [allowMidgameJoin, setAllowMidgameJoin] = createSignal(false);
  const [showCreateRoom, setShowCreateRoom] = createSignal(false);
  const [subscriptionsSet, setSubscriptionsSet] = createSignal(false);
  const [currentUser, setCurrentUser] = createSignal<any>(null);
  const [user, setUser] = createUserSignal();

  // Initialize SpacetimeDB connection
  const { conn, connected, identity, subscribed, connectionError } = useSpacetimeDB();

  // Syncing timeout warning — shown if still syncing after 8s
  const [syncingTooLong, setSyncingTooLong] = createSignal(false);
  const [showNamePrompt, setShowNamePrompt] = createSignal(false);

  createEffect(() => {
    if (connected() && !subscribed()) {
      const timer = setTimeout(() => setSyncingTooLong(true), 8000);
      onCleanup(() => { clearTimeout(timer); setSyncingTooLong(false); });
    } else {
      setSyncingTooLong(false);
    }
  });

  // Show name prompt when connected but user has no name
  createEffect(() => {
    if (!subscribed() || !currentUser()) return;
    const user = currentUser();
    if (user && (!user.name || !user.name.trim())) {
      setShowNamePrompt(true);
    }
  });

  // Auto-select the first room tab for display when rooms arrive, but do NOT auto-join.
  // The user explicitly joins by clicking the tab.
  createEffect(() => {
    const ids = roomIds();
    if (ids.length > 0 && !currentRoom()) {
      setCurrentRoom(ids[0]);
    }
  });

  // Subscribe to current user data
  createEffect(() => {
    const connection = conn();
    if (!connection || !connected() || !subscribed() || !identity()) return;

    // Load current user
    const identityHex = identity()!.toHexString();
    const userFromDb = connection.db.user.identity.find(identity()!);
    if (userFromDb) {
      setCurrentUser(userFromDb);
    }

    // Subscribe to user updates
    connection.db.user.onUpdate((ctx, oldUser, newUser) => {
      if (newUser.identity.toHexString() === identityHex) {
        setCurrentUser(newUser);
      }
    });
  });

  // Wait for connection to be established, then load data and subscribe
  createEffect(() => {
    const connection = conn();

    // Only proceed if we have connection, it's connected, AND subscriptions are applied
    if (!connection || !connected() || !subscribed()) {
      console.log("Waiting for connection... connected:", connected(), "conn:", !!connection, "subscribed:", subscribed());
      return;
    }

    // Only set up subscriptions once
    if (subscriptionsSet()) {
      console.log("Subscriptions already set up, skipping...");
      return;
    }

    console.log("✅ SpacetimeDB connection ready for VoteBox!");
    console.log("Connected:", connected());
    console.log("Identity:", identity()?.toHexString());

    // Batch the initial data load so all signals update atomically,
    // preventing intermediate renders that could remount child components.
    const initialRooms = Array.from(connection.db.game_room.iter());
    console.log("🎮 Initial game rooms loaded:", initialRooms.length, initialRooms);
    const initialReadyStates = Array.from(connection.db.ready_state.iter());
    console.log("✅ Initial ready states loaded:", initialReadyStates.length);

    batch(() => {
      const roomsObj: Record<string, GameRoom> = {};
      initialRooms.forEach(room => {
        roomsObj[room.id] = room;
      });
      setRooms(roomsObj);
      setRoomIds(Object.keys(roomsObj));

      const readyStatesObj: Record<string, ReadyState> = {};
      initialReadyStates.forEach(state => {
        readyStatesObj[state.roomId] = state;
      });
      setRoomsReadyState(readyStatesObj);
    });

    connection.db.game_room.onInsert((ctx, room) => {
      console.log("🎉 New game room inserted:", room);
      batch(() => {
        setRooms(prev => ({ ...prev, [room.id]: room }));
        setRoomIds(prev => prev.includes(String(room.id)) ? prev : [...prev, String(room.id)]);
      });
    });

    // Listen for game room updates (only update room data, not IDs)
    connection.db.game_room.onUpdate((ctx, oldRoom, newRoom) => {
      setRooms(prev => ({
        ...prev,
        [newRoom.id]: newRoom
      }));
    });

    connection.db.game_room.onDelete((ctx, room) => {
      console.log("🗑️ Game room deleted:", room.id);
      batch(() => {
        setRooms(prev => {
          const next = { ...prev };
          delete next[room.id];
          return next;
        });
        setRoomIds(prev => prev.filter(id => id !== String(room.id)));
        if (currentRoom() === String(room.id)) {
          setCurrentRoom("");
        }
      });
    });

    // Listen for ready state insertions
    connection.db.ready_state.onInsert((ctx, readyState) => {
      console.log("✅ New ready state inserted:", {
        roomId: readyState.roomId,
        readyUserIds: readyState.readyUserIds,
        round: readyState.round
      });
      setRoomsReadyState(readyState.roomId, readyState);
    });

    // Listen for ready state updates
    connection.db.ready_state.onUpdate((ctx, oldState, newState) => {
      console.log("🔄 Ready state updated:", {
        roomId: newState.roomId,
        oldReadyUserIds: oldState.readyUserIds,
        newReadyUserIds: newState.readyUserIds,
        round: newState.round
      });
      setRoomsReadyState(newState.roomId, newState);
    });

    // Mark subscriptions as set up
    setSubscriptionsSet(true);
    console.log("✅ All VoteBox subscriptions set up!");
  });

  const handleCreateRoom = async () => {
    const connection = conn();
    const roomName = newRoomName() || `Game Room ${Object.keys(rooms()).length + 1}`;

    if (!connection || !connected()) {
      showToast({
        title: "Error",
        description: "Not connected to SpacetimeDB",
        variant: "error",
        duration: DEFAULT_TOAST_DURATION,
      });
      return;
    }

    if (!roomName.trim()) {
      showToast({
        title: "Error",
        description: "Room name cannot be empty",
        variant: "error",
        duration: DEFAULT_TOAST_DURATION,
      });
      return;
    }

    const nameExists = Object.values(rooms()).some(
      (r) => r.name.trim().toLowerCase() === roomName.trim().toLowerCase() && r.gameStatus === "lobby"
    );
    if (nameExists) {
      showToast({
        title: "Name taken",
        description: `A room named "${roomName}" is already open. Choose a different name or join it.`,
        variant: "error",
        duration: DEFAULT_TOAST_DURATION,
      });
      return;
    }

    try {
      console.log("Calling createRoom with name:", roomName);
      
      const roomId = createId();
      const creatorId = identity()?.toHexString() || "anonymous";
      
      await connection.reducers.createRoom({
        roomId,
        name: roomName,
        creatorId,
        buyinAmount: buyinAmount(),
        votesPerPlayer: votesPerPlayer(),
        minPlayers: 0,
        maxPlayers: 0,
        allowRebuy: allowRebuy(),
        allowMidgameJoin: allowMidgameJoin(),
      });
      
      setNewRoomName("");
      setBuyinAmount(10);
      setVotesPerPlayer(5);
      setAllowRebuy(true);
      setAllowMidgameJoin(false);
      setShowCreateRoom(false);
      
      showToast({
        title: "Room Created",
        description: `"${roomName}" will appear in the list shortly`,
        duration: DEFAULT_TOAST_DURATION,
      });
      
      console.log("createRoom succeeded");
    } catch (error) {
      console.error("Failed to create room:", error);
      showToast({
        title: "Error Creating Room",
        description: error instanceof Error ? error.message : "Failed to create room",
        variant: "error",
        duration: DEFAULT_TOAST_DURATION,
      });
    }
  };

  const handleJoinRoom = (roomId: string) => {
    // Always set the current room in UI first (so tab navigation works)
    setCurrentRoom(roomId);
    
    const connection = conn();
    const userIdentity = identity()?.toHexString();

    if (!connection || !connected()) {
      console.log("⚠️ Cannot join room - not connected yet");
      return;
    }

    if (!userIdentity) {
      console.log("⚠️ Cannot join room - identity not available yet");
      return;
    }

    try {
      // Get the room to check if we're already a member
      const room = rooms()[roomId];
      const roomIdNum = room?.id;
      
      if (room && roomIdNum !== undefined) {
        const isAlreadyMember = room.memberIds.includes(userIdentity);
        
        if (!isAlreadyMember) {
          console.log("🚀 Joining room:", { roomId: roomIdNum, userIdentity });
          connection.reducers.joinRoom({ roomId: roomIdNum, userId: userIdentity });
        }
      }
    } catch (error) {
      console.error("Failed to join room:", error);
      showToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to join room",
        variant: "error",
        duration: DEFAULT_TOAST_DURATION,
      });
    }
  };

  return (
    <div class="flex h-screen flex-col bg-[#1a1a2e]">
        {/* Top Bar */}
        <div class="flex items-center justify-between border-b border-white/10 bg-black/40 backdrop-blur-md px-4 py-2">
          <div class="flex items-center gap-3">
            <h1 class="text-lg font-bold text-white">Vote Exchange</h1>
            <Show
              when={connected() && subscribed()}
              fallback={
                <Show
                  when={connected()}
                  fallback={
                    <Badge variant="destructive" data-testid={TID.connectionStatus} class="text-xs">
                      Disconnected
                    </Badge>
                  }
                >
                  <Badge variant="secondary" data-testid={TID.connectionStatus} class="text-xs flex items-center gap-1">
                    <span class="inline-block h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Connecting…
                  </Badge>
                </Show>
              }
            >
              <Badge variant="default" data-testid={TID.connectionStatus} class="text-xs">
                Connected
              </Badge>
              <span class="text-xs text-white/40" data-testid={TID.identityDisplay}>
                {currentUser()?.name || resolvePlayerName(identity()?.toHexString() || "", conn())}
              </span>
            </Show>
          </div>
          <Button
            size="sm"
            onClick={() => setShowCreateRoom(true)}
            disabled={!connected()}
            data-testid={TID.createRoomBtn}
          >
            + New Room
          </Button>
        </div>

        {/* Create Room Panel */}
        <Show when={showCreateRoom()}>
          <div class="border-b border-white/10 bg-black/30 backdrop-blur-md p-4">
            <div class="mx-auto max-w-3xl space-y-3">
              <div class="grid grid-cols-3 gap-3">
                <div>
                  <label class="mb-1 block text-xs font-medium text-white/60">Room Name</label>
                  <input
                    type="text"
                    value={newRoomName()}
                    onInput={e => setNewRoomName(e.currentTarget.value)}
                    onKeyDown={e => { if (e.key === "Enter" && newRoomName().trim() && connected()) handleCreateRoom(); }}
                    placeholder="My Game Room"
                    disabled={!connected()}
                    data-testid={TID.roomNameInput}
                    class="w-full rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white placeholder-white/30 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label class="mb-1 block text-xs font-medium text-white/60">Buy-in ($)</label>
                  <input
                    type="number" min="0.01" step="1"
                    value={buyinAmount()}
                    onInput={e => setBuyinAmount(parseFloat(e.currentTarget.value) || 10)}
                    disabled={!connected()}
                    data-testid={TID.buyinAmountInput}
                    class="w-full rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white shadow-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label class="mb-1 block text-xs font-medium text-white/60">Votes / Player</label>
                  <input
                    type="number" min="1" max="20" step="1"
                    value={votesPerPlayer()}
                    onInput={e => setVotesPerPlayer(parseInt(e.currentTarget.value) || 5)}
                    disabled={!connected()}
                    data-testid={TID.votesPerPlayerInput}
                    class="w-full rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white shadow-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50"
                  />
                </div>
              </div>
              <div class="flex items-center justify-between">
                <div class="flex gap-4">
                  <label class="flex items-center gap-1.5 text-xs text-white/60 cursor-pointer">
                    <input type="checkbox" checked={allowRebuy()} onChange={e => setAllowRebuy(e.currentTarget.checked)} data-testid={TID.allowRebuyCheckbox} class="rounded" />
                    Allow Re-buy
                  </label>
                  <label class="flex items-center gap-1.5 text-xs text-white/60 cursor-pointer">
                    <input type="checkbox" checked={allowMidgameJoin()} onChange={e => setAllowMidgameJoin(e.currentTarget.checked)} data-testid={TID.allowMidgameJoinCheckbox} class="rounded" />
                    Mid-game Join
                  </label>
                </div>
                <div class="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setShowCreateRoom(false)} data-testid={TID.cancelCreateRoomBtn} class="border-white/20 text-white/70 hover:bg-white/10">Cancel</Button>
                  <Button
                    size="sm"
                    onClick={handleCreateRoom}
                    disabled={!connected() || !newRoomName().trim() || buyinAmount() <= 0}
                    data-testid={TID.submitCreateRoomBtn}
                  >
                    Create (${buyinAmount().toFixed(0)} | {votesPerPlayer()}v)
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Show>

        {/* Schema mismatch / connection error banner */}
        <Show when={connectionError() === "schema-mismatch"}>
          <div class="mx-4 mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-semibold text-amber-300">Server updated — please refresh</p>
                <p class="text-xs text-amber-400/70">The game client is out of sync with the server.</p>
              </div>
              <button
                class="rounded-md bg-amber-500/80 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-400"
                onClick={() => window.location.reload()}
              >
                Refresh
              </button>
            </div>
          </div>
        </Show>

        {/* Slow sync warning */}
        <Show when={syncingTooLong() && !connectionError()}>
          <div class="mx-4 mt-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-2.5 text-xs text-yellow-300">
            Taking longer than usual — check that SpacetimeDB is running at{" "}
            <span class="font-mono">{import.meta.env.VITE_SPACETIME_HOST || "http://127.0.0.1:3000"}</span>
          </div>
        </Show>

        <Show when={!connected()}>
          <div class="m-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
            <h2 class="mb-1 text-sm font-semibold text-red-300">Not Connected</h2>
            <p class="text-xs text-red-400/80">
              Ensure SpacetimeDB is running at {import.meta.env.VITE_SPACETIME_HOST || "ws://localhost:3000"}
            </p>
          </div>
        </Show>

        {/* Guest name prompt for users without a name */}
        <Show when={showNamePrompt()}>
          <GuestNamePrompt
            onComplete={() => setShowNamePrompt(false)}
            onCancel={() => setShowNamePrompt(false)}
          />
        </Show>

        {/* Room Tabs + Content */}
        <div class="flex flex-1 flex-col overflow-hidden">
          <Show when={roomIds().length > 0}>
            <div class="border-b border-white/10 bg-black/20 px-4">
              <Tabs value={currentRoom()} onChange={handleJoinRoom}>
                <TabsList class="h-9">
                  <For each={roomIds()}>
                    {(roomId) => {
                      const room = () => rooms()[roomId];
                      return (
                        <TabsTrigger
                          value={roomId}
                          class="text-xs px-3"
                          disabled={room()?.gameStatus === "active" && roomId !== currentRoom()}
                          title={room()?.gameStatus === "active" && roomId !== currentRoom() ? "Game in progress — cannot switch rooms" : undefined}
                        >
                          {room()?.name}
                          <Badge variant="secondary" class="ml-1.5 px-1 py-0 text-[10px]">
                            {room()?.memberIds?.length ?? 0}
                          </Badge>
                          <Show when={
                            room()?.maxPlayers &&
                            (room()?.memberIds?.length ?? 0) >= (room()?.maxPlayers ?? Infinity)
                          }>
                            <Badge class="ml-1 px-1 py-0 text-[10px] bg-red-500/80 text-white border-0">Full</Badge>
                          </Show>
                        </TabsTrigger>
                      );
                    }}
                  </For>
                </TabsList>
              </Tabs>
            </div>
          </Show>

          <div class="flex-1 min-h-0 overflow-hidden relative" data-testid={TID.contentArea}>
            {/* Empty state: no room selected or room doesn't exist */}
            <Show when={!currentRoom() || !rooms()[currentRoom()!]}>
              <div class="flex h-64 items-center justify-center">
                <div class="text-center">
                  <Show when={roomIds().length > 0} fallback={
                    <>
                      <p class="text-lg font-medium text-white/40">No rooms yet</p>
                      <p class="text-sm text-white/30">Create a room to get started</p>
                    </>
                  }>
                    <p class="text-lg font-medium text-white/40">Select a room to join</p>
                    <p class="text-sm text-white/30">Click a room tab above, or create a new one</p>
                  </Show>
                </div>
              </div>
            </Show>

            {/*
              Pre-game lobby: rendered OUTSIDE <For> to prevent the <For>+<Show>
              reactive chain from destroying the Three.js WebGL context.
              Uses CSS display to hide instead of unmounting when not applicable.
            */}
            <div
              style={{
                display: currentRoom() && rooms()[currentRoom()!] && !rooms()[currentRoom()!]?.startTime ? "" : "none",
                position: "absolute",
                inset: "0",
              }}
            >
              <Show when={currentRoom()}>
                <GamePreStartInteractions
                  roomId={currentRoom()!}
                  rooms={rooms()}
                  user={user}
                  identity={identity}
                  roomsPreStart={roomsReadyState}
                  setRoomsPreStart={setRoomsReadyState}
                  conn={conn}
                  connected={connected}
                />
              </Show>
            </div>

            {/* In-game: only rendered when game has started */}
            <Show when={currentRoom() && rooms()[currentRoom()!]?.startTime && currentUser()}>
              <VotingInterface
                room={rooms()[currentRoom()!]!}
                currentUser={currentUser()!}
              />
            </Show>

            <Show when={currentRoom() && rooms()[currentRoom()!]?.startTime && !currentUser()}>
              <div class="flex h-full items-center justify-center">
                <p class="text-sm text-white/40">Loading user data...</p>
              </div>
            </Show>
          </div>
        </div>
      </div>
  );
};

export default VoteBox;
