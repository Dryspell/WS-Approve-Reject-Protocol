import { clientSocket, SC_ComType, SignalType } from "~/types/socket";
import { createSignal, For, onMount, useContext } from "solid-js";
import { Component, ComponentProps } from "solid-js";
import { Message, ChatRoom } from "~/lib/Server/chat";
import { createStore, SetStoreFunction } from "solid-js/store";
import { createId } from "@paralleldrive/cuid2";
import { randAnimal } from "@ngneat/falso";
import { SocketContext } from "~/app";
import { createLocalStorageSignal } from "~/hooks/createLocalStorageSignal";
import { GameRoom, VoteActionType, VoteHandlerArgs } from "~/lib/Server/vote";
import { DEFAULT_REQUEST_TIMEOUT } from "~/lib/Client/socket";
import { InferCallbackData } from "~/types/socket-utils";
import { showToast } from "./ui/toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Button } from "./ui/button";
import { Resizable, ResizableHandle, ResizablePanel } from "./ui/resizable";
import { Card } from "./ui/card";
import { TextField, TextFieldInput } from "./ui/text-field";

const DEFAULT_GAME_ROOM = { id: "game1", name: "Game Room 1" };

export const voteHandler =
  (rooms: Record<string, GameRoom>, setRooms: SetStoreFunction<Record<string, GameRoom>>) =>
  ([type, comId, data]:
    | [type: SC_ComType.Delta, comId: string, data: Message]
    | [type: SC_ComType.Set, comId: string, data: GameRoom]) => {
    try {
      // console.log(
      // 	`Received signal: ${SC_ComType[type]}, ${comId}, ${data}`
      // );
      switch (type) {
        default: {
          console.error(`Received unexpected signal: ${SC_ComType[type]}, ${comId}, ${data}`);
        }
      }
    } catch (e) {
      console.error(
        `Failed to properly handle: ${SC_ComType[type]}, ${comId}, ${data}:`,
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
            duration: 5000,
          });
          return;
        }

        if (returnType === SC_ComType.Reject) {
          showToast({
            title: "Error",
            description: returnData[0],
            variant: "error",
            duration: 5000,
          });
          return;
        }

        if (returnType === SC_ComType.Approve) {
          showToast({
            title: "Success",
            description: `You have
              successfully created or joined room: ${roomName}`,
            variant: "success",
            duration: 5000,
          });
          setRooms({ [roomId]: returnData });
        }
      },
    );
};

const VoteBox: Component<ComponentProps<"div">> = rawProps => {
  const socket = useContext(SocketContext);

  const [rooms, setRooms] = createStore<Record<string, GameRoom>>({});
  const [currentRoom, setCurrentRoom] = createSignal(DEFAULT_GAME_ROOM.id);
  const [user, setUser] = createLocalStorageSignal("chat-user", {
    name: randAnimal(),
    id: createId(),
  });

  const [chatInput, setChatInput] = createSignal("");

  socket.on(SignalType.Vote, voteHandler(rooms, setRooms));

  onMount(() => {
    joinRoom(socket, DEFAULT_GAME_ROOM.id, DEFAULT_GAME_ROOM.name, user(), setRooms);
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
        </div>

        <For each={Object.entries(rooms)}>
          {([roomId, [, roomName, members, tickets, offers, startTime]]) => (
            <TabsContent value={roomId}>
              <Resizable orientation="horizontal" class="max-w-full rounded-lg border">
                <ResizablePanel initialSize={0.15} class="p-2">
                  <For each={members}>
                    {([id, name]) => (
                      <Card class="m-1.5 p-2">
                        <div class="flex flex-row items-center justify-center">
                          <div class="avatar chat-image pr-2">
                            <div class="w-10 rounded-full">
                              <img
                                alt="Tailwind CSS chat bubble component"
                                src="https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.jpg"
                              />
                            </div>
                          </div>
                          <div class="chat-header">{name}</div>
                        </div>
                      </Card>
                    )}
                  </For>
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel initialSize={0.85} class="p-2">
                  <div class="flex items-center justify-center">
                    <Button
                      variant="outline"
                      class="m-1.5 inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 text-sm font-medium"
                      onClick={() => console.log("Ready")}
                    >
                      Ready?
                    </Button>
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
