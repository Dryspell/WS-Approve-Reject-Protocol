import { Component, createSignal, For, createEffect, Show } from "solid-js";
import { createLocalStorageSignal } from "~/hooks/createLocalStorageSignal";
import { randAnimal } from "@ngneat/falso";
import { createId } from "@paralleldrive/cuid2";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Resizable, ResizableHandle, ResizablePanel } from "../ui/resizable";
import UserAvatarCard from "../Chat/UserAvatarCard";
import VotingInterface from "./VotingInterface";
import GamePreStartInteractions from "./GamePreStartInteractions";
import { useSpacetimeDB } from "~/hooks/useSpacetimeDB";
import { showToast } from "../ui/toast";
import { DEFAULT_TOAST_DURATION } from "~/lib/timeout-constants";
import { createStore } from "solid-js/store";
import type { GameRoom } from "~/module_bindings/game_room_type";
import type { ReadyState } from "~/module_bindings/ready_state_type";
import { Badge } from "../ui/badge";

const VoteBox: Component = () => {
  const [rooms, setRooms] = createSignal<Record<string, GameRoom>>({});
  const [roomsReadyState, setRoomsReadyState] = createStore<Record<string, ReadyState>>({});
  const [currentRoom, setCurrentRoom] = createSignal<string | undefined>(undefined);
  const [newRoomName, setNewRoomName] = createSignal("");
  const [buyinAmount, setBuyinAmount] = createSignal<number>(10); // Default $10 buy-in
  const [showCreateRoom, setShowCreateRoom] = createSignal(false);
  const [subscriptionsSet, setSubscriptionsSet] = createSignal(false);
  const [currentUser, setCurrentUser] = createSignal<any>(null);
  const [user, setUser] = createLocalStorageSignal("chat-user", {
    name: randAnimal(),
    id: createId(),
  });

  // Initialize SpacetimeDB connection
  const { conn, connected, identity } = useSpacetimeDB();

  // Subscribe to current user data
  createEffect(() => {
    const connection = conn();
    if (!connection || !connected() || !identity()) return;

    // Load current user
    const identityHex = identity()!.toHexString();
    const userFromDb = connection.db.user.identity().find(identity()!);
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

    // Only proceed if we have both connection and it's connected
    if (!connection || !connected()) {
      console.log("Waiting for connection... connected:", connected(), "conn:", !!connection);
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

    // Initial load of game rooms from cache
    const initialRooms = Array.from(connection.db.gameRoom.iter());
    console.log("🎮 Initial game rooms loaded:", initialRooms.length, initialRooms);
    const roomsObj: Record<string, GameRoom> = {};
    initialRooms.forEach(room => {
      roomsObj[room.id] = room;
    });
    setRooms(roomsObj);

    // Initial load of ready states
    const initialReadyStates = Array.from(connection.db.readyState.iter());
    console.log("✅ Initial ready states loaded:", initialReadyStates.length);
    const readyStatesObj: Record<string, ReadyState> = {};
    initialReadyStates.forEach(state => {
      readyStatesObj[state.roomId] = state;
    });
    setRoomsReadyState(readyStatesObj);

    // Listen for new game rooms being inserted
    connection.db.gameRoom.onInsert((ctx, room) => {
      console.log("🎉 New game room inserted:", room);
      setRooms(prev => ({
        ...prev,
        [room.id]: room
      }));
    });

    // Listen for game room updates
    connection.db.gameRoom.onUpdate((ctx, oldRoom, newRoom) => {
      console.log("🔄 Game room updated:", newRoom);
      setRooms(prev => ({
        ...prev,
        [newRoom.id]: newRoom
      }));
    });

    // Listen for ready state insertions
    connection.db.readyState.onInsert((ctx, readyState) => {
      console.log("✅ New ready state inserted:", readyState);
      setRoomsReadyState({
        [readyState.roomId]: readyState
      });
    });

    // Listen for ready state updates
    connection.db.readyState.onUpdate((ctx, oldState, newState) => {
      console.log("🔄 Ready state updated:", newState);
      setRoomsReadyState({
        [newState.roomId]: newState
      });
    });

    // Mark subscriptions as set up
    setSubscriptionsSet(true);
    console.log("✅ All VoteBox subscriptions set up!");
  });

  const handleCreateRoom = () => {
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

    try {
      console.log("Calling createRoom with name:", roomName);
      
      // Generate a unique room ID
      const roomId = createId();
      const creatorId = identity()?.toHexString() || "anonymous";
      
      // Call the reducer - it's fire-and-forget, the onInsert callback will update the list
      connection.reducers.createRoom(roomId, roomName, creatorId, buyinAmount());
      
      // Clear input and hide form immediately
      setNewRoomName("");
      setBuyinAmount(10); // Reset to default
      setShowCreateRoom(false);
      
      // Show feedback - the room will appear in the list when created
      showToast({
        title: "Room Created",
        description: `"${roomName}" will appear in the list shortly`,
        duration: DEFAULT_TOAST_DURATION,
      });
      
      console.log("createRoom called, waiting for room to appear in list");
    } catch (error) {
      console.error("Failed to create room:", error);
      showToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create room",
        variant: "error",
        duration: DEFAULT_TOAST_DURATION,
      });
    }
  };

  const handleJoinRoom = (roomId: string) => {
    const connection = conn();

    if (!connection || !connected()) {
      showToast({
        title: "Error",
        description: "Not connected to SpacetimeDB",
        variant: "error",
        duration: DEFAULT_TOAST_DURATION,
      });
      return;
    }

    try {
      // Just set the current room - the user should already have access
      setCurrentRoom(roomId);
      
      showToast({
        title: "Joined Room",
        description: "Successfully joined the room",
        duration: DEFAULT_TOAST_DURATION,
      });
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
    <div class="flex h-full flex-col gap-4">
      {/* Connection Status Indicator */}
      <div class="border-b bg-background p-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Show
              when={connected()}
              fallback={
                <>
                  <Badge variant="destructive">
                    <span class="mr-1">●</span> Disconnected
                  </Badge>
                  <span class="text-sm text-muted-foreground">Connecting to SpacetimeDB...</span>
                </>
              }
            >
              <Badge variant="default">
                <span class="mr-1">●</span> Connected
              </Badge>
              <span class="text-sm text-muted-foreground">
                Identity: {identity()?.toHexString().slice(0, 12)}...
              </span>
            </Show>
          </div>
          <div class="text-xs text-muted-foreground">
            {Object.keys(rooms()).length} room{Object.keys(rooms()).length !== 1 ? "s" : ""} available
          </div>
        </div>
      </div>

      <div class="flex items-center justify-between px-4">
        <h2 class="text-xl font-bold">Game Rooms</h2>
        <button
          onClick={() => setShowCreateRoom(true)}
          disabled={!connected()}
          class="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Create Room
        </button>
      </div>

      {showCreateRoom() && (
        <div class="space-y-3 rounded-lg border bg-gray-50 p-4 mx-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">
                Room Name
              </label>
              <input
                type="text"
                value={newRoomName()}
                onInput={e => setNewRoomName(e.currentTarget.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && newRoomName().trim() && connected()) {
                    handleCreateRoom();
                  }
                }}
                placeholder="My Game Room"
                disabled={!connected()}
                class="w-full rounded border p-2 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">
                Buy-in Amount ($)
              </label>
              <input
                type="number"
                min="0.01"
                step="1"
                value={buyinAmount()}
                onInput={e => setBuyinAmount(parseFloat(e.currentTarget.value) || 10)}
                placeholder="10"
                disabled={!connected()}
                class="w-full rounded border p-2 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>
          <div class="rounded border border-blue-200 bg-blue-50 p-2 text-xs text-blue-700">
            💡 <strong>Buy-in:</strong> Each player pays this amount to join. Winner(s) take the pot!
          </div>
          <div class="flex gap-2">
            <button
              onClick={handleCreateRoom}
              disabled={!connected() || !newRoomName().trim() || buyinAmount() <= 0}
              class="flex-1 rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Room (${buyinAmount().toFixed(2)} buy-in)
            </button>
            <button
              onClick={() => setShowCreateRoom(false)}
              class="rounded bg-gray-500 px-4 py-2 text-white hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <Show when={!connected()}>
        <div class="mx-4 rounded-lg border border-destructive bg-destructive/10 p-4">
          <h2 class="mb-2 text-lg font-semibold text-destructive">
            Not Connected to SpacetimeDB
          </h2>
          <p class="mb-3 text-sm">
            The application cannot connect to SpacetimeDB. Please ensure:
          </p>
          <ul class="ml-6 list-disc space-y-1 text-sm text-muted-foreground">
            <li>SpacetimeDB is running (check terminal for errors)</li>
            <li>The correct host is configured in your .env file</li>
            <li>No firewall is blocking the connection</li>
          </ul>
          <div class="mt-3 rounded bg-muted p-2 font-mono text-xs">
            Expected: {import.meta.env.VITE_SPACETIME_HOST || "ws://localhost:3000"}
          </div>
        </div>
      </Show>

      <Tabs value={currentRoom()} onChange={setCurrentRoom}>
        <TabsList>
          <For each={Object.entries(rooms())}>
            {([roomId, room]) => (
              <TabsTrigger value={roomId}>{room.name}</TabsTrigger>
            )}
          </For>
        </TabsList>

        <For each={Object.entries(rooms())}>
          {([roomId, room]) => (
            <TabsContent value={roomId}>
              <Resizable orientation="horizontal" class="max-w-full rounded-lg border">
                <ResizablePanel initialSize={0.15} class="p-2">
                  <For each={room.memberIds}>
                    {memberId => (
                      <UserAvatarCard user={{ id: memberId, username: memberId }} />
                    )}
                  </For>
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel initialSize={0.85} class="p-2">
                  <div class="flex h-full flex-col gap-4">
                    <div class="flex-1">
                      <Show when={!room.startTime}>
                        <GamePreStartInteractions
                          roomId={roomId}
                          rooms={rooms()}
                          user={user}
                          roomsPreStart={roomsReadyState}
                          setRoomsPreStart={setRoomsReadyState}
                          conn={conn}
                          connected={connected}
                        />
                      </Show>
                      <Show when={room.startTime && currentUser()}>
                        <VotingInterface
                          room={room}
                          currentUser={currentUser()!}
                        />
                      </Show>
                      <Show when={room.startTime && !currentUser()}>
                        <div class="flex h-full items-center justify-center">
                          <div class="text-center">
                            <p class="text-lg text-gray-500">Loading user data...</p>
                          </div>
                        </div>
                      </Show>
                    </div>
                  </div>
                </ResizablePanel>
              </Resizable>
            </TabsContent>
          )}
        </For>
      </Tabs>
    </div>
  );
};

export default VoteBox;
