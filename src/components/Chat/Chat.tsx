import {
  clientSocket,
  SC_ComType,
  SignalType,
  ChatActionResponse,
  ChatActionRequest,
} from "~/types/socket";
import { createSignal, useContext } from "solid-js";
import { TextField, TextFieldInput } from "~/components/ui/text-field";
import { Component, ComponentProps, For, onMount } from "solid-js";
import { Message, ChatRoom } from "~/lib/Server/chat";
import { createStore, SetStoreFunction } from "solid-js/store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { createId } from "@paralleldrive/cuid2";
import { Button } from "~/components/ui/button";
import { randAnimal } from "@ngneat/falso";
import { showToast } from "~/components/ui/toast";
import { DEFAULT_REQUEST_TIMEOUT, DEFAULT_TOAST_DURATION } from "~/lib/timeout-constants";
import { Resizable, ResizableHandle, ResizablePanel } from "~/components/ui/resizable";
import { SocketContext } from "~/app";
import { createLocalStorageSignal } from "~/hooks/createLocalStorageSignal";
import ChatMessage from "./ChatMessage";
import UserAvatarCard from "./UserAvatarCard";

export const chatHandler =
  (rooms: Record<string, ChatRoom>, setRooms: SetStoreFunction<Record<string, ChatRoom>>) =>
  (data: { type: SC_ComType; comId: string; data: Message | ChatRoom }) => {
    try {
      switch (data.type) {
        case SC_ComType.Set: {
          const room = data.data as ChatRoom;
          setRooms({
            [room.roomId]: room,
          });
          break;
        }

        case SC_ComType.Delta: {
          const message = data.data as Message;
          const room = rooms[message.roomId];
          if (!room) break;

          const updatedRoom: ChatRoom = {
            ...room,
            messages: [...room.messages, message],
          };
          setRooms({
            [message.roomId]: updatedRoom,
          });
          break;
        }

        default: {
          console.error(
            `Received unexpected signal: ${SC_ComType[data.type]}, ${data.comId}, ${data.data}`,
          );
        }
      }
    } catch (e) {
      console.error(
        `Failed to properly handle: ${SC_ComType[data.type]}, ${data.comId}, ${data.data}:`,
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
  const request: ChatActionRequest<"CreateOrJoinRoom"> = {
    type: "CreateOrJoinRoom",
    comId: createId(),
    data: {
      roomId,
      roomName,
      user: { id: user.id, username: user.name },
    },
  };

  socket
    .timeout(DEFAULT_REQUEST_TIMEOUT)
    .emit<"CreateOrJoinRoom">(
      SignalType.Chat,
      request,
      (
        error: Error | null,
        returnData:
          | ChatActionResponse<"CreateOrJoinRoom">
          | { type: SC_ComType.Reject; comId: string; data: { reason: string } },
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

        if (returnData.type === SC_ComType.Reject) {
          showToast({
            title: "Error",
            description: returnData.data.reason,
            variant: "error",
            duration: DEFAULT_TOAST_DURATION,
          });
          return;
        }

        const room = returnData.data;
        showToast({
          title: "Room Joined!",
          description: `You have successfully created or joined room: ${room.roomName}`,
          variant: "success",
          duration: DEFAULT_TOAST_DURATION,
        });
        setRooms({
          [room.roomId]: room,
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
  const request: ChatActionRequest<"SendMessage"> = {
    type: "SendMessage",
    comId: createId(),
    data: { message },
  };

  socket
    .timeout(DEFAULT_REQUEST_TIMEOUT)
    .emit<"SendMessage">(
      SignalType.Chat,
      request,
      (
        error: Error | null,
        returnData:
          | ChatActionResponse<"SendMessage">
          | { type: SC_ComType.Reject; comId: string; data: { reason: string } },
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

        if (returnData.type === SC_ComType.Reject) {
          showToast({
            title: "Error",
            description: returnData.data.reason,
            variant: "error",
            duration: DEFAULT_TOAST_DURATION,
          });
          return;
        }

        const room = rooms[message.roomId];
        if (!room) return;

        setRooms({
          [message.roomId]: {
            ...room,
            messages: [...room.messages, message],
          },
        });
      },
    );
};

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
              {([roomId, room]) => <TabsTrigger value={roomId}>{room.roomName}</TabsTrigger>}
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
          {([roomId, room]) => (
            <TabsContent value={roomId}>
              <Resizable orientation="horizontal" class="max-w-full rounded-lg border">
                <ResizablePanel initialSize={0.15} class="p-2">
                  <For each={room.members}>{member => <UserAvatarCard user={member} />}</For>
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel initialSize={0.85} class="p-2">
                  <div>
                    <For each={room.messages}>
                      {message => (
                        <ChatMessage
                          senderId={message.senderId}
                          roomId={message.roomId}
                          timestamp={message.timestamp}
                          message={message.message}
                          members={room.members}
                        />
                      )}
                    </For>
                  </div>
                  <div class="flex flex-row items-center justify-center">
                    <TextField class="w-full">
                      <TextFieldInput
                        type={"text"}
                        placeholder="Type a message..."
                        value={chatInput()}
                        onInput={e => setChatInput(e.currentTarget.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter" && chatInput().trim()) {
                            const message: Message = {
                              senderId: user().id,
                              roomId,
                              timestamp: Date.now(),
                              message: chatInput().trim(),
                            };
                            sendMessage(socket, message, rooms, setRooms);
                            setChatInput("");
                          }
                        }}
                      />
                    </TextField>
                    <Button
                      variant="outline"
                      class="m-1.5 inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 text-sm font-medium"
                      onClick={() => {
                        if (chatInput().trim()) {
                          const message: Message = {
                            senderId: user().id,
                            roomId,
                            timestamp: Date.now(),
                            message: chatInput().trim(),
                          };
                          sendMessage(socket, message, rooms, setRooms);
                          setChatInput("");
                        }
                      }}
                    >
                      Send
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

export default Chat;
