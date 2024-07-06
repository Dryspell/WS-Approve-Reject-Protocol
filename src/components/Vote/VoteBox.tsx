import { clientSocket, SC_ComType, SignalType } from "~/types/socket";
import { createEffect, createSignal, For, onMount, useContext } from "solid-js";
import { Component, ComponentProps } from "solid-js";
import { User } from "~/lib/Server/chat";
import { createStore, SetStoreFunction } from "solid-js/store";
import { createId } from "@paralleldrive/cuid2";
import { randAnimal } from "@ngneat/falso";
import { SocketContext } from "~/app";
import { createLocalStorageSignal } from "~/hooks/createLocalStorageSignal";
import {
  GameRoom,
  GameRoomPreStart,
  GameRound,
  SC_GameEventType,
  VoteActionType,
  VoteHandlerArgs,
} from "~/lib/Server/vote";
import { DEFAULT_REQUEST_TIMEOUT, DEFAULT_TOAST_DURATION } from "~/lib/timeout-constants";
import { InferCallbackData } from "~/types/socket-utils";
import { showToast } from "../ui/toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Button } from "../ui/button";
import { Resizable, ResizableHandle, ResizablePanel } from "../ui/resizable";
import { Card } from "../ui/card";
import { TextField, TextFieldInput } from "../ui/text-field";
import UserAvatarCard from "../Chat/UserAvatarCard";
import { Badge } from "../ui/badge";
import GamePreStartInteractions from "./GamePreStartInteractions";
import Game from "./Game";

const DEFAULT_GAME_ROOM = { id: "game1", name: "Game Room 1" };

export const voteHandler =
  (rooms: Record<string, GameRoom>, setRooms: SetStoreFunction<Record<string, GameRoom>>) =>
  ([type, comId, data]:
    | [type: SC_GameEventType.UserJoinedRoom, comId: string, data: [roomId: string, user: User]]
    | [type: SC_GameEventType.RoomCreated, comId: string, data: GameRoom]
    | [type: SC_GameEventType.GameStart, comId: string, data: GameRoom]
    | [type: SC_GameEventType.GameEnd, comId: string, data: [roomId: string, endTime: number]]
    | [type: SC_GameEventType.RoundStart, comId: string, data: [roomId: string, round: GameRound]]
    | [
        type: SC_GameEventType.RoundEnd,
        comId: string,
        data: [roomId: string, previousRound: GameRound, nextRound: GameRound],
      ]) => {
    try {
      // console.log(
      // 	`Received signal: ${SC_ComType[type]}, ${comId}, ${data}`
      // );
      switch (type) {
        case SC_GameEventType.RoomCreated: {
          const [roomId, ...roomData] = data;
          setRooms({
            [roomId]: [roomId, ...roomData],
          });
          break;
        }

        case SC_GameEventType.UserJoinedRoom: {
          throw new Error("Not implemented");
        }

        case SC_GameEventType.GameStart: {
          const [roomId, ...roomData] = data;
          setRooms({
            [roomId]: [roomId, ...roomData],
          });
          break;
        }

        case SC_GameEventType.GameEnd: {
          throw new Error("Not implemented");
        }

        case SC_GameEventType.RoundStart: {
          throw new Error("Not implemented");
        }

        case SC_GameEventType.RoundEnd: {
          throw new Error("Not implemented");
        }

        default: {
          console.error(`Received unexpected signal: ${SC_GameEventType[type]}, ${comId}, ${data}`);
        }
      }
    } catch (e) {
      console.error(
        `Failed to properly handle: ${SC_GameEventType[type]}, ${comId}, ${data}:`,
        e instanceof Error ? e.message : e,
      );
    }
  };

const joinRoom = (
  socket: clientSocket,
  roomId: string,
  roomName: string,
  user: { name: string; id: string },
  setRooms: SetStoreFunction<Record<string, GameRoom>>,
  setRoomsPreStart: SetStoreFunction<Record<string, GameRoomPreStart>>,
) => {
  socket
    .timeout(DEFAULT_REQUEST_TIMEOUT)
    .emit(
      SignalType.Vote,
      VoteActionType.CreateOrJoinRoom,
      [createId(), [roomId, roomName, [user.id, user.name]]],
      (
        err: Error,
        [returnType, comId, returnData]: InferCallbackData<
          VoteHandlerArgs,
          VoteActionType.CreateOrJoinRoom
        >,
      ) => {
        if (err) {
          showToast({
            title: "Error",
            description: err.message,
            variant: "error",
            duration: DEFAULT_TOAST_DURATION,
          });
          return;
        }

        if (returnType === SC_ComType.Reject) {
          showToast({
            title: "Error",
            description: returnData[0],
            variant: "error",
            duration: DEFAULT_TOAST_DURATION,
          });
          return;
        }

        if (returnType === SC_ComType.Approve) {
          showToast({
            title: "Success",
            description: `You have
              successfully created or joined room: ${roomName}`,
            variant: "success",
            duration: DEFAULT_TOAST_DURATION,
          });
          const [gameRoom, gameRoomPreStart] = returnData;
          setRooms({ [roomId]: gameRoom });
          setRoomsPreStart({ [roomId]: gameRoomPreStart });
        }
      },
    );
};

export const userIsReady = (
  roomId: string,
  userId: string,
  roomsPreStart: Record<string, GameRoomPreStart>,
) => {
  return roomsPreStart[roomId]?.[1]?.find(readyUser => {
    const truth = readyUser === userId;
    console.log(readyUser, userId, truth);
    return truth;
  });
};

const VoteBox: Component<ComponentProps<"div">> = rawProps => {
  const socket = useContext(SocketContext);

  const [rooms, setRooms] = createStore<Record<string, GameRoom>>({});
  const [roomsPreStart, setRoomsPreStart] = createStore<Record<string, GameRoomPreStart>>({});

  const [currentRoom, setCurrentRoom] = createSignal(DEFAULT_GAME_ROOM.id);
  const [user, setUser] = createLocalStorageSignal("chat-user", {
    name: randAnimal(),
    id: createId(),
  });

  createEffect(() => {
    console.log(rooms);
    console.log(roomsPreStart);
  });

  socket.on(SignalType.Vote, voteHandler(rooms, setRooms));

  onMount(() => {
    joinRoom(
      socket,
      DEFAULT_GAME_ROOM.id,
      DEFAULT_GAME_ROOM.name,
      user(),
      setRooms,
      setRoomsPreStart,
    );
  });

  return (
    <div>
      <TextField>
        <TextFieldInput
          type={"text"}
          placeholder="Chat as user..."
          value={user().name}
          onInput={e =>
            setUser({
              name: e.currentTarget.value,
              id: user().id,
            })
          }
        />
      </TextField>
      <Tabs defaultValue="global" value={currentRoom()} onChange={setCurrentRoom} class="py-1">
        <div class="flex w-full flex-row items-center justify-center">
          <TabsList class="w-80% grid w-full auto-cols-min grid-flow-col">
            <For each={Object.entries(rooms)}>
              {([roomId, room]) => <TabsTrigger value={roomId}>{room[1]}</TabsTrigger>}
            </For>
          </TabsList>
          <Button
            variant="outline"
            class="m-1.5 inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 text-sm font-medium"
          >
            Create Room
          </Button>
          <Button
            onClick={() => {
              socket.emit(SignalType.Vote, VoteActionType.Dev_DeleteRooms, [createId()], () => {});
              setRooms({});
              setRoomsPreStart({});
              window.location.reload();
            }}
          >
            Dev: Delete All Rooms
          </Button>
        </div>

        <For each={Object.entries(rooms)}>
          {([roomId, [, roomName, members, tickets, offers, startTime]]) => (
            <TabsContent value={roomId}>
              <Resizable orientation="horizontal" class="max-w-full rounded-lg border">
                <ResizablePanel initialSize={0.15} class="p-2">
                  <For each={members}>{member => <UserAvatarCard user={member} />}</For>
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel initialSize={0.85} class="p-2">
                  <div class="flex flex-col items-center justify-center">
                    {rooms[roomId][5] == null ? (
                      <GamePreStartInteractions
                        socket={socket}
                        roomId={roomId}
                        rooms={rooms}
                        user={user}
                        roomsPreStart={roomsPreStart}
                        setRoomsPreStart={setRoomsPreStart}
                      />
                    ) : (
                      <Game room={rooms[roomId]} setRooms={setRooms} />
                    )}
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
