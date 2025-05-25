import { clientSocket, SC_ComType, SignalType, VoteActionResponse, ChatActionType, ChatActionRequest, ChatActionResponse, ChatEvent } from "~/types/socket";
import { createEffect, createSignal, For, onMount, useContext } from "solid-js";
import { Component, ComponentProps } from "solid-js";
import { createStore, SetStoreFunction } from "solid-js/store";
import { createId } from "@paralleldrive/cuid2";
import { randAnimal } from "@ngneat/falso";
import { SocketContext } from "~/app";
import { createLocalStorageSignal } from "~/hooks/createLocalStorageSignal";
import {
  GameRoom,
  RoundsReadyState,
  SC_GameEventType,
  VoteActionType,
  SocketEvent,
} from "~/types/vote";
import { Message } from "~/types/chat";
import { ChatRoom } from "~/lib/Server/chat";
import { DEFAULT_REQUEST_TIMEOUT, DEFAULT_TOAST_DURATION } from "~/lib/timeout-constants";
import { showToast } from "../ui/toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Button } from "../ui/button";
import { Resizable, ResizableHandle, ResizablePanel } from "../ui/resizable";
import { TextField, TextFieldInput } from "../ui/text-field";
import UserAvatarCard from "../Chat/UserAvatarCard";
import GamePreStartInteractions from "./GamePreStartInteractions";
import Game from "./Game";
import ChatBox from "../Chat/ChatBox";
import { userIsReady } from "~/lib/game-utils";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { chatHandler } from "~/components/Chat/Chat";

const DEFAULT_GAME_ROOM = { id: "game1", name: "Game Room 1" };

export const voteHandler =
  (
    rooms: Record<string, GameRoom>,
    setRooms: SetStoreFunction<Record<string, GameRoom>>,
    roomsReadyState: Record<string, RoundsReadyState>,
    setRoomsReadyState: SetStoreFunction<Record<string, RoundsReadyState>>,
  ) =>
  (event: SocketEvent) => {
    const { type, comId, data } = event;
    try {
      switch (type) {
        case SC_GameEventType.RoomCreated: {
          setRooms({
            [data.id]: data,
          });
          break;
        }

        case SC_GameEventType.UserJoinedRoom: {
          const { roomId, user: newlyJoinedUser } = data;
          const room = rooms[roomId];
          if (!room.members.some(member => member.id === newlyJoinedUser.id))
            setRooms({
              [roomId]: {
                ...room,
                members: [...room.members, newlyJoinedUser],
              },
            });
          break;
        }

        case SC_GameEventType.UserToggleReadyGameStart: {
          const { roomId, user, readyState } = data;
          const readyUsers = roomsReadyState[roomId]?.readyUsers ?? [];
          readyState
            ? setRoomsReadyState({
                [roomId]: {
                  roomId,
                  round: 0,
                  readyUsers: Array.from(new Set([...readyUsers, user.id])),
                },
              })
            : setRoomsReadyState({
                [roomId]: {
                  roomId,
                  round: 0,
                  readyUsers: readyUsers.filter(id => id !== user.id),
                },
              });
          break;
        }

        case SC_GameEventType.GameStart: {
          setRooms({
            [data.id]: data,
          });
          setRoomsReadyState({
            [data.id]: { roomId: data.id, round: 1, readyUsers: [] },
          });
          break;
        }

        case SC_GameEventType.RoundEnd: {
          const { roomId, previousRound, newRound } = data;
          const room = rooms[roomId];
          const newRounds = [...room.rounds, newRound];
          setRooms({
            [roomId]: { ...room, rounds: newRounds },
          });
          setRoomsReadyState({
            [roomId]: { roomId, round: newRounds.length, readyUsers: [] },
          });
          break;
        }

        case SC_GameEventType.Error: {
          const { error } = data;
          showToast({
            title: "Error",
            description: error,
            variant: "error",
            duration: DEFAULT_TOAST_DURATION,
          });
          break;
        }
      }
    } catch (e) {
      console.error(
        `Failed to properly handle: ${SC_GameEventType[type]}, ${comId}, ${data}:`,
        e instanceof Error ? e.message : e,
      );
    }
  };

type VoteRequest = {
  type: VoteActionType.CreateOrJoinRoom;
  request: {
    comId: string;
    data: {
      roomId: string;
      roomName: string;
      user: {
        id: string;
        username: string;
      };
    };
  };
};

type VoteResponse = VoteActionResponse<VoteActionType.CreateOrJoinRoom> | { type: SC_ComType.Reject; comId: string; data: { reason: string } };
type DeleteRoomsResponse = VoteActionResponse<VoteActionType.Dev_DeleteRooms> | { type: SC_ComType.Reject; comId: string; data: { reason: string } };

const joinRoom = (
  socket: clientSocket,
  roomId: string,
  roomName: string,
  user: { name: string; id: string },
  setRooms: SetStoreFunction<Record<string, GameRoom>>,
  setRoomsReadyState: SetStoreFunction<Record<string, RoundsReadyState>>,
) => {
  socket
    .timeout(DEFAULT_REQUEST_TIMEOUT)
    .emit<VoteActionType.CreateOrJoinRoom>(
      SignalType.Vote,
      {
        type: VoteActionType.CreateOrJoinRoom,
        request: {
          comId: createId(),
          data: { roomId, roomName, user: { id: user.id, username: user.name } },
        },
      },
      (error: Error | null, returnData: VoteActionResponse<VoteActionType.CreateOrJoinRoom> | { type: SC_ComType.Reject; comId: string; data: { reason: string } }) => {
        if (error) {
          showToast({
            title: "Error",
            description: error.message,
            variant: "error",
            duration: DEFAULT_TOAST_DURATION,
          });
          return;
        }

        if (returnData.type === SC_ComType.Reject) {
          showToast({
            title: "Error",
            description: returnData.data.reason,
            variant: "error",
            duration: DEFAULT_TOAST_DURATION,
          });
          return;
        }

        showToast({
          title: "Success",
          description: `Successfully created or joined room: ${roomName}`,
          variant: "success",
          duration: DEFAULT_TOAST_DURATION,
        });
        const { room, readyState } = returnData.data;
        setRooms({ [roomId]: room });
        setRoomsReadyState({ [roomId]: readyState });
      }
    );
};

const voteBoxChatHandler = (
  roomMessages: Record<string, Message[]>,
  setRoomMessages: SetStoreFunction<Record<string, Message[]>>
) =>
  (data: { type: SC_ComType; comId: string; data: Message | ChatRoom | { reason: string } }) => {
    try {
      switch (data.type) {
        case SC_ComType.Delta: {
          if ("roomId" in data.data) {
            const message = data.data as Message;
            const currentMessages = roomMessages[message.roomId] || [];
            setRoomMessages({
              [message.roomId]: [...currentMessages, message],
            });
          }
          break;
        }

        case SC_ComType.Error: {
          if ("reason" in data.data) {
            showToast({
              title: "Error",
              description: data.data.reason,
              variant: "error",
              duration: DEFAULT_TOAST_DURATION,
            });
          }
          break;
        }

        default: {
          console.error(
            `Received unexpected signal: ${data.type}, ${data.comId}, ${data.data}`,
          );
        }
      }
    } catch (e) {
      console.error(
        `Failed to properly handle: ${data.type}, ${data.comId}, ${data.data}:`,
        e instanceof Error ? e.message : e,
      );
    }
  };

const VoteBox: Component<ComponentProps<"div">> = rawProps => {
  const socket = useContext(SocketContext);
  const [rooms, setRooms] = createStore<Record<string, GameRoom>>({});
  const [roomsReadyState, setRoomsReadyState] = createStore<Record<string, RoundsReadyState>>({});
  const [roomMessages, setRoomMessages] = createStore<Record<string, Message[]>>({});
  const [currentRoom, setCurrentRoom] = createSignal<string | undefined>(undefined);
  const [newRoomName, setNewRoomName] = createSignal("");
  const [showCreateRoom, setShowCreateRoom] = createSignal(false);
  const [user, setUser] = createLocalStorageSignal("chat-user", {
    name: randAnimal(),
    id: createId(),
  });

  const isDevelopment = import.meta.env.DEV;

  socket.on(SignalType.Vote, voteHandler(rooms, setRooms, roomsReadyState, setRoomsReadyState));

  const handleCreateRoom = () => {
    const roomName = newRoomName() || `Game Room ${Object.keys(rooms).length + 1}`;
    const roomId = createId();
    joinRoom(socket, roomId, roomName, user(), setRooms, setRoomsReadyState);
    setNewRoomName("");
    setShowCreateRoom(false);
    setCurrentRoom(roomId);
  };

  const handleJoinRoom = (roomId: string) => {
    const room = rooms[roomId];
    if (room) {
      joinRoom(socket, roomId, room.name, user(), setRooms, setRoomsReadyState);
      setCurrentRoom(roomId);
    }
  };

  const handleSendMessage = (message: Message) => {
    socket
      .timeout(DEFAULT_REQUEST_TIMEOUT)
      .emit<ChatActionType.SendMessage>(
        SignalType.Chat,
        {
          type: ChatActionType.SendMessage,
          comId: createId(),
          data: { message },
        } as ChatActionRequest<ChatActionType.SendMessage>,
        (
          error: Error | null,
          response:
            | { type: SC_ComType.Approve; comId: string; data: { success: boolean } }
            | { type: SC_ComType.Reject; comId: string; data: { reason: string } }
        ) => {
          if (error) {
            showToast({
              title: "Error",
              description: error.message,
              variant: "error",
              duration: DEFAULT_TOAST_DURATION,
            });
            return;
          }

          if (response.type === SC_ComType.Reject) {
            showToast({
              title: "Error",
              description: response.data.reason,
              variant: "error",
              duration: DEFAULT_TOAST_DURATION,
            });
            return;
          }

          // Update local messages
          const currentMessages = roomMessages[message.roomId] || [];
          setRoomMessages({
            [message.roomId]: [...currentMessages, message],
          });
        }
      );
  };

  // Add chat message handler
  socket.on(SignalType.Chat, voteBoxChatHandler(roomMessages, setRoomMessages));

  onMount(() => {
    joinRoom(
      socket,
      DEFAULT_GAME_ROOM.id,
      DEFAULT_GAME_ROOM.name,
      user(),
      setRooms,
      setRoomsReadyState,
    );
  });

  return (
    <div class="flex h-full flex-col gap-4">
      <TextField>
        <TextFieldInput
          type="text"
          placeholder="Chat as user..."
          value={user().name}
          onInput={e =>
            setUser({
              name: e.currentTarget.value || randAnimal(),
              id: user().id,
            })
          }
        />
      </TextField>

      {currentRoom() ? (
        <Tabs value={currentRoom()} onChange={setCurrentRoom} class="flex-1">
          <div class="flex w-full flex-row items-center justify-center">
            <TabsList class="w-80% grid w-full auto-cols-min grid-flow-col">
              <TabsTrigger value="lobby" onClick={() => setCurrentRoom(undefined)}>Lobby</TabsTrigger>
              <For each={Object.entries(rooms)}>
                {([roomId, room]) => <TabsTrigger value={roomId}>{room.name}</TabsTrigger>}
              </For>
            </TabsList>
            {showCreateRoom() ? (
              <div class="flex items-center">
                <TextField>
                  <TextFieldInput
                    type="text"
                    placeholder="Room name..."
                    value={newRoomName()}
                    onInput={e => setNewRoomName(e.currentTarget.value)}
                    onKeyDown={e => e.key === "Enter" && handleCreateRoom()}
                  />
                </TextField>
                <Button onClick={handleCreateRoom} class="ml-2">
                  Create
                </Button>
                <Button onClick={() => setShowCreateRoom(false)} variant="outline" class="ml-2">
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => setShowCreateRoom(true)}
                class="m-1.5 inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 text-sm font-medium"
              >
                Create Room
              </Button>
            )}
            {isDevelopment && (
              <Button
                onClick={() => {
                  socket
                    .timeout(DEFAULT_REQUEST_TIMEOUT)
                    .emit<VoteActionType.Dev_DeleteRooms>(
                      SignalType.Vote,
                      {
                        type: VoteActionType.Dev_DeleteRooms,
                        request: {
                          comId: createId(),
                          data: {}
                        }
                      },
                      (error: Error | null, returnData: VoteActionResponse<VoteActionType.Dev_DeleteRooms> | { type: SC_ComType.Reject; comId: string; data: { reason: string } }) => {
                        if (error) {
                          showToast({
                            title: "Error",
                            description: error.message,
                            variant: "error",
                            duration: DEFAULT_TOAST_DURATION,
                          });
                          return;
                        }

                        if (returnData.type === SC_ComType.Reject) {
                          showToast({
                            title: "Error",
                            description: returnData.data.reason,
                            variant: "error",
                            duration: DEFAULT_TOAST_DURATION,
                          });
                          return;
                        }

                        setRooms({});
                        setRoomsReadyState({});
                        window.location.reload();
                      }
                    );
                }}
              >
                Dev: Delete All Rooms
              </Button>
            )}
          </div>

          <TabsContent value="lobby" class="mt-4">
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <For each={Object.entries(rooms)}>
                {([roomId, room]) => (
                  <Card>
                    <CardHeader>
                      <CardTitle>{room.name}</CardTitle>
                      <CardDescription>
                        {room.members.length} players
                        {room.startTime ? " • Game in progress" : " • Waiting to start"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div class="flex flex-wrap gap-2">
                        <For each={room.members}>
                          {member => <UserAvatarCard user={member} />}
                        </For>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button
                        onClick={() => handleJoinRoom(roomId)}
                        class="w-full"
                        disabled={room.members.some(m => m.id === user().id)}
                      >
                        {room.members.some(m => m.id === user().id) ? "Already Joined" : "Join Room"}
                      </Button>
                    </CardFooter>
                  </Card>
                )}
              </For>
            </div>
          </TabsContent>

          <For each={Object.entries(rooms)}>
            {([roomId, room]) => (
              <TabsContent value={roomId}>
                <Resizable orientation="horizontal" class="max-w-full rounded-lg border">
                  <ResizablePanel initialSize={0.15} class="p-2">
                    <For each={room.members}>{member => <UserAvatarCard user={member} />}</For>
                  </ResizablePanel>
                  <ResizableHandle withHandle />
                  <ResizablePanel initialSize={0.85} class="p-2">
                    <div class="flex h-full flex-col gap-4">
                      <div class="flex-1">
                        {room.startTime == null ? (
                          <GamePreStartInteractions
                            socket={socket}
                            roomId={roomId}
                            rooms={rooms}
                            user={() => ({ ...user(), username: user().name })}
                            roomsPreStart={roomsReadyState}
                            setRoomsPreStart={setRoomsReadyState}
                          />
                        ) : (
                          <Game
                            room={room}
                            setRooms={setRooms}
                            user={() => ({ ...user(), username: user().name })}
                            roomsReadyState={roomsReadyState}
                            setRoomsReadyState={setRoomsReadyState}
                          />
                        )}
                      </div>
                      <div class="h-64">
                        <ChatBox
                          roomId={roomId}
                          user={() => ({ ...user(), username: user().name })}
                          messages={roomMessages[roomId] || []}
                          onSendMessage={handleSendMessage}
                          roundNumber={room.rounds?.length}
                        />
                      </div>
                    </div>
                  </ResizablePanel>
                </Resizable>
              </TabsContent>
            )}
          </For>
        </Tabs>
      ) : (
        <div class="flex-1">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <For each={Object.entries(rooms)}>
              {([roomId, room]) => (
                <Card>
                  <CardHeader>
                    <CardTitle>{room.name}</CardTitle>
                    <CardDescription>
                      {room.members.length} players
                      {room.startTime ? " • Game in progress" : " • Waiting to start"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div class="flex flex-wrap gap-2">
                      <For each={room.members}>
                        {member => <UserAvatarCard user={member} />}
                      </For>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      onClick={() => handleJoinRoom(roomId)}
                      class="w-full"
                      disabled={room.members.some(m => m.id === user().id)}
                    >
                      {room.members.some(m => m.id === user().id) ? "Already Joined" : "Join Room"}
                    </Button>
                  </CardFooter>
                </Card>
              )}
            </For>
          </div>
          <div class="mt-4 flex justify-center">
            {showCreateRoom() ? (
              <div class="flex items-center">
                <TextField>
                  <TextFieldInput
                    type="text"
                    placeholder="Room name..."
                    value={newRoomName()}
                    onInput={e => setNewRoomName(e.currentTarget.value)}
                    onKeyDown={e => e.key === "Enter" && handleCreateRoom()}
                  />
                </TextField>
                <Button onClick={handleCreateRoom} class="ml-2">
                  Create
                </Button>
                <Button onClick={() => setShowCreateRoom(false)} variant="outline" class="ml-2">
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => setShowCreateRoom(true)}
                class="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 text-sm font-medium"
              >
                Create New Room
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VoteBox;
