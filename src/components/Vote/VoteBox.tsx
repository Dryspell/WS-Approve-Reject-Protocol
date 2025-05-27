import { Component, createSignal, onMount, For } from "solid-js";
import { createLocalStorageSignal } from "~/hooks/createLocalStorageSignal";
import { randAnimal } from "@ngneat/falso";
import { createId } from "@paralleldrive/cuid2";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Resizable, ResizableHandle, ResizablePanel } from "../ui/resizable";
import UserAvatarCard from "../Chat/UserAvatarCard";
import Game from "./Game";
import GamePreStartInteractions from "./GamePreStartInteractions";
import { useSpacetimeDB } from "~/hooks/useSpacetimeDB";
import { showToast } from "../ui/toast";
import { DEFAULT_TOAST_DURATION } from "~/lib/timeout-constants";
import { createStore } from "solid-js/store";
import type { GameRoom, ReadyState } from "~/module_bindings";
import { withSpacetimeDBErrorHandling, withRetry, SpacetimeDBErrorCodes, SpacetimeDBError } from "~/lib/spacetime-errors";

const VoteBox: Component = () => {
  const [rooms, setRooms] = createSignal<Record<string, GameRoom>>({});
  const [roomsReadyState, setRoomsReadyState] = createStore<Record<string, ReadyState>>({});
  const [currentRoom, setCurrentRoom] = createSignal<string | undefined>(undefined);
  const [newRoomName, setNewRoomName] = createSignal("");
  const [showCreateRoom, setShowCreateRoom] = createSignal(false);
  const [user, setUser] = createLocalStorageSignal("chat-user", {
    name: randAnimal(),
    id: createId(),
  });

  // Initialize SpacetimeDB connection
  const { db, connected } = useSpacetimeDB();

  // Subscribe to room updates
  onMount(() => {
    const client = db();
    if (!client || !connected()) {
      throw new SpacetimeDBError(
        "Not connected to SpacetimeDB",
        SpacetimeDBErrorCodes.CONNECTION_ERROR
      );
    }

    // Subscribe to all rooms with error handling
    try {
      client.subscribe("game_room", "*", (room: GameRoom) => {
        if (!room) return;
        setRooms(prev => ({
          ...prev,
          [room.id]: room
        }));
      });
    } catch (error) {
      throw new SpacetimeDBError(
        "Failed to subscribe to game rooms",
        SpacetimeDBErrorCodes.SUBSCRIPTION_ERROR,
        error
      );
    }

    // Subscribe to ready state updates with error handling
    try {
      client.subscribe("ready_state", "*", (readyState: ReadyState) => {
        if (!readyState) return;
        setRoomsReadyState({
          [readyState.roomId]: readyState
        });
      });
    } catch (error) {
      throw new SpacetimeDBError(
        "Failed to subscribe to ready states",
        SpacetimeDBErrorCodes.SUBSCRIPTION_ERROR,
        error
      );
    }
  });

  const handleCreateRoom = async () => {
    const client = db();
    if (!client || !connected()) {
      throw new SpacetimeDBError(
        "Not connected to SpacetimeDB",
        SpacetimeDBErrorCodes.CONNECTION_ERROR
      );
    }

    await withSpacetimeDBErrorHandling(async () => {
      const roomName = newRoomName() || `Game Room ${Object.keys(rooms()).length + 1}`;
      await withRetry(() => client.reducers.create_room(roomName));
      
      showToast({
        title: "Success",
        description: "Room created successfully",
        duration: DEFAULT_TOAST_DURATION,
      });

      setNewRoomName("");
      setShowCreateRoom(false);
    }, "Failed to create room");
  };

  const handleJoinRoom = async (roomId: string) => {
    const client = db();
    if (!client || !connected()) {
      throw new SpacetimeDBError(
        "Not connected to SpacetimeDB",
        SpacetimeDBErrorCodes.CONNECTION_ERROR
      );
    }

    await withSpacetimeDBErrorHandling(async () => {
      await withRetry(() => client.reducers.create_room(roomId));
      setCurrentRoom(roomId);
    }, "Failed to join room");
  };

  return (
    <div class="flex h-full flex-col gap-4">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-bold">Game Rooms</h2>
        <button
          onClick={() => setShowCreateRoom(true)}
          class="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        >
          Create Room
        </button>
      </div>

      {showCreateRoom() && (
        <div class="flex gap-2">
          <input
            type="text"
            value={newRoomName()}
            onInput={e => setNewRoomName(e.currentTarget.value)}
            placeholder="Room name"
            class="flex-1 rounded border p-2"
          />
          <button
            onClick={handleCreateRoom}
            class="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
          >
            Create
          </button>
          <button
            onClick={() => setShowCreateRoom(false)}
            class="rounded bg-gray-500 px-4 py-2 text-white hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      )}

      <Tabs value={currentRoom()} onChange={setCurrentRoom}>
        <TabsList>
          <For each={Object.entries(rooms())}>
            {([roomId, room]) => (
              <TabsTrigger value={roomId.toString()}>{room.name}</TabsTrigger>
            )}
          </For>
        </TabsList>

        <For each={Object.entries(rooms())}>
          {([roomId, room]) => (
            <TabsContent value={roomId.toString()}>
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
                      {!room.startTime ? (
                        <GamePreStartInteractions
                          roomId={roomId.toString()}
                          rooms={rooms()}
                          user={user}
                          roomsPreStart={roomsReadyState}
                          setRoomsPreStart={setRoomsReadyState}
                        />
                      ) : (
                        <Game
                          room={room}
                          user={user()}
                        />
                      )}
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
