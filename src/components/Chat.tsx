import { clientSocket, SC_ComType, SignalType } from "~/types/socket";
import { Accessor, createSignal, useContext } from "solid-js";
import { TextField, TextFieldInput } from "~/components/ui/text-field";
import { Component, ComponentProps, For, onMount } from "solid-js";
import { ChatHandlerArgs, Message, ChatRoom } from "~/lib/Server/chat";
import { createStore, SetStoreFunction } from "solid-js/store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { createId } from "@paralleldrive/cuid2";
import { InferCallbackData, InferRequestData } from "~/types/socket-utils";
import { Button } from "~/components/ui/button";
import { randAnimal } from "@ngneat/falso";
import { showToast } from "~/components/ui/toast";
import { DEFAULT_REQUEST_TIMEOUT } from "~/lib/Client/socket";
import { formatDistance } from "date-fns";
import { Resizable, ResizableHandle, ResizablePanel } from "~/components/ui/resizable";
import { Card } from "~/components/ui/card";
import { SocketContext } from "~/app";
import { createLocalStorageSignal } from "~/hooks/createLocalStorageSignal";

export enum ChatActionType {
  CreateOrJoinRoom,
  LeaveRoom,
  SendMessage,
}

export const chatHandler =
  (rooms: Record<string, ChatRoom>, setRooms: SetStoreFunction<Record<string, ChatRoom>>) =>
  ([type, comId, data]:
    | [type: SC_ComType.Delta, comId: string, data: Message]
    | [type: SC_ComType.Set, comId: string, data: ChatRoom]) => {
    try {
      // console.log(
      // 	`Received signal: ${SC_ComType[type]}, ${comId}, ${data}`
      // );
      switch (type) {
        case SC_ComType.Set: {
          const [roomId, ...roomData] = data;
          setRooms({
            [roomId]: [roomId, ...roomData],
          });
          break;
        }

        case SC_ComType.Delta: {
          const [senderId, roomId, timestamp, message] = data;
          const [, roomName, members, messages, permissions] = rooms[roomId];
          const updatedRoom: ChatRoom = [
            roomId,
            roomName,
            members,
            [...messages, data],
            permissions,
          ];
          setRooms({
            [roomId]: updatedRoom,
          });
          break;
        }

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

const DEFAULT_CHAT_ROOM = {
  id: "global",
  name: "Global",
  members: [],
  messages: [],
  permissions: [],
};

const joinRoom = (
  socket: clientSocket,
  roomId: string,
  roomName: string,
  user: { name: string; id: string },
  setRooms: SetStoreFunction<Record<string, ChatRoom>>,
) => {
  socket
    .timeout(DEFAULT_REQUEST_TIMEOUT)
    .emit(
      SignalType.Chat,
      ChatActionType.CreateOrJoinRoom,
      [createId(), [roomId, roomName, [user.id, user.name]]],
      (
        err: Error,
        [returnType, comId, returnData]: InferCallbackData<
          ChatHandlerArgs,
          ChatActionType.CreateOrJoinRoom
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
          const [reason] = returnData;
          showToast({
            title: "Error",
            description: reason,
            variant: "error",
            duration: 5000,
          });
          return;
        }

        const [roomId, roomName, ...roomData] = returnData;
        showToast({
          title: "Room Joined!",
          description: `You have
              successfully created or joined room: ${roomName}`,
          variant: "success",
          duration: 5000,
        });
        setRooms({
          [roomId]: [roomId, roomName, ...roomData],
        });
      },
    );
};

const sendMessage = (
  socket: clientSocket,
  message: Message,
  rooms: Record<string, ChatRoom>,
  setRooms: SetStoreFunction<Record<string, ChatRoom>>,
) => {
  socket
    .timeout(DEFAULT_REQUEST_TIMEOUT)
    .emit(
      SignalType.Chat,
      ChatActionType.SendMessage,
      [createId(), [message]],
      (
        err: Error,
        [returnType, comId, returnData]: InferCallbackData<
          ChatHandlerArgs,
          ChatActionType.SendMessage
        >,
      ) => {
        // console.log(
        // 	`Received response from server: ${returnType}, ${comId}, ${returnData}`
        // );
        if (returnType === SC_ComType.Reject) {
          const [reason] = returnData;
          showToast({
            title: "Error",
            description: reason,
            variant: "error",
            duration: 5000,
          });
          return;
        }
        if (err) {
          showToast({
            title: "Error",
            description: err.message,
            variant: "error",
            duration: 5000,
          });
          return;
        }
        if (returnType === SC_ComType.Approve) {
          // console.log(
          // 	`Recieved approval from server: ${message.join(", ")}`
          // );
          const [senderId, roomId, ...rest] = message;
          const [, roomName, memberIds, messages, permissions] = rooms[roomId];
          setRooms(roomId, [roomId, roomName, memberIds, [...messages, message], permissions]);
        }
      },
    );
};

function ChatMessage(props: {
  senderId: string;
  user: Accessor<{ id: string; name: string }>;
  members: ChatRoom[2];
  timestamp: number;
  message: string;
}) {
  return (
    <div class={`chat ${props.senderId === props.user().id ? "chat-start" : "chat-end"}`}>
      <div class="avatar chat-image">
        <div class="w-10 rounded-full">
          <img
            alt="Tailwind CSS chat bubble component"
            src="https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.jpg"
          />
        </div>
      </div>
      <div class="chat-header">
        {props.members.find(([id, name]) => id === props.senderId)?.[1]}
        <time class="px-2 text-xs opacity-50">
          {formatDistance(new Date(props.timestamp), new Date(), {
            addSuffix: true,
          })}
        </time>
      </div>
      <div class="chat-bubble">{props.message}</div>
      <div class="chat-footer opacity-50">Delivered</div>
    </div>
  );
}

const Chat: Component<ComponentProps<"div">> = rawProps => {
  const socket = useContext(SocketContext);

  const [rooms, setRooms] = createStore<Record<string, ChatRoom>>({});
  const [currentRoom, setCurrentRoom] = createSignal(DEFAULT_CHAT_ROOM.id);
  const [user, setUser] = createLocalStorageSignal("chat-user", {
    name: randAnimal(),
    id: createId(),
  });

  const [chatInput, setChatInput] = createSignal("");

  socket.on(SignalType.Chat, chatHandler(rooms, setRooms));

  onMount(() => {
    joinRoom(socket, DEFAULT_CHAT_ROOM.id, DEFAULT_CHAT_ROOM.name, user(), setRooms);
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
          {([roomId, [, roomName, members, messages, permissions]]) => (
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
                  <div>
                    <For each={messages}>
                      {([senderId, roomId, timestamp, message]) => {
                        return (
                          <ChatMessage
                            senderId={senderId}
                            user={user}
                            members={members}
                            timestamp={timestamp}
                            message={message}
                          />
                        );
                      }}
                    </For>
                  </div>
                </ResizablePanel>
              </Resizable>
            </TabsContent>
          )}
        </For>
      </Tabs>
      <div class="flex w-full flex-row items-center justify-center">
        <TextField class="w-full">
          <TextFieldInput
            value={chatInput()}
            onInput={e => setChatInput(e.currentTarget.value)}
            type={"text"}
            placeholder="Type a message..."
          />
        </TextField>
        <Button
          class="mx-3 inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 text-sm font-medium"
          onClick={() => {
            if (!chatInput() || !currentRoom() || !user().id) {
              showToast({
                title: "You say anything!",
                description: "Please enter a message before sending!",
                variant: "error",
                duration: 5000,
              });
            }
            const message: Message = [user().id, currentRoom(), Date.now(), chatInput()];
            sendMessage(socket, message, rooms, setRooms);
            setChatInput("");
          }}
        >
          Send!
        </Button>
      </div>
    </div>
  );
};

export default Chat;
