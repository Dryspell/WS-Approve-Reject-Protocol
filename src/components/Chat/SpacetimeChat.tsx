import { Component, createSignal, For, onMount, createMemo } from "solid-js";
import { TextField, TextFieldInput } from "~/components/ui/text-field";
import { Button } from "~/components/ui/button";
import { Resizable, ResizableHandle, ResizablePanel } from "~/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { showToast } from "~/components/ui/toast";
import { DEFAULT_TOAST_DURATION } from "~/lib/timeout-constants";
import ChatMessage from "./ChatMessage";
import UserAvatarCard from "./UserAvatarCard";
import { createLocalStorageSignal } from "~/hooks/createLocalStorageSignal";
import { useSpacetimeDB } from "~/hooks/useSpacetimeDB";
import type { ChatRoom } from "~/module_bindings/chat_room_type";
import type { ChatMessage as ChatMessageType } from "~/module_bindings/chat_message_type";
import type { ChatPermission } from "~/module_bindings/chat_permission_type";
import type { User } from "~/module_bindings/user_type";

const SpacetimeChat: Component = () => {
  const [chatInput, setChatInput] = createSignal("");
  const [currentRoom, setCurrentRoom] = createSignal<string>("");
  const [newRoomName, setNewRoomName] = createSignal<string>("");

  // Get SpacetimeDB connection
  const { conn, connected, identity } = useSpacetimeDB();

  // Reactive memos to get data from SpacetimeDB client cache
  const rooms = createMemo(() => {
    const connection = conn();
    if (!connection) return [];
    return Array.from(connection.db.chatRoom.iter());
  });

  const messages = createMemo(() => {
    const connection = conn();
    if (!connection) return [];
    const currentRoomId = currentRoom();
    if (!currentRoomId) return [];
    
    return Array.from(connection.db.chatMessage.iter())
      .filter(msg => msg.roomId === currentRoomId)
      .sort((a, b) => {
        // Compare timestamps by converting to numbers
        const aTime = a.timestamp.toDate().getTime();
        const bTime = b.timestamp.toDate().getTime();
        return aTime - bTime;
      });
  });

  const permissions = createMemo(() => {
    const connection = conn();
    if (!connection) return [];
    const currentRoomId = currentRoom();
    if (!currentRoomId) return [];
    
    return Array.from(connection.db.chatPermission.iter())
      .filter(perm => perm.roomId === currentRoomId);
  });

  const users = createMemo(() => {
    const connection = conn();
    if (!connection) return new Map<string, User>();
    
    const userMap = new Map<string, User>();
    for (const user of connection.db.user.iter()) {
      userMap.set(user.identity.toHexString(), user);
    }
    return userMap;
  });

  const sendMessage = async (roomId: string, message: string) => {
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
      // Call the reducer via connection.reducers
      connection.reducers.sendChatMessage(roomId, message, undefined);
      setChatInput("");
    } catch (error) {
      showToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "error",
        duration: DEFAULT_TOAST_DURATION,
      });
    }
  };

  const createNewRoom = async () => {
    const connection = conn();
    const name = newRoomName().trim();
    
    if (!connection || !connected()) {
      showToast({
        title: "Error",
        description: "Not connected to SpacetimeDB",
        variant: "error",
        duration: DEFAULT_TOAST_DURATION,
      });
      return;
    }

    if (!name) {
      showToast({
        title: "Error",
        description: "Room name cannot be empty",
        variant: "error",
        duration: DEFAULT_TOAST_DURATION,
      });
      return;
    }

    try {
      // Call the reducer via connection.reducers
      connection.reducers.createChatRoom(name);
      setNewRoomName("");
      showToast({
        title: "Success",
        description: "Room created successfully",
        duration: DEFAULT_TOAST_DURATION,
      });
    } catch (error) {
      showToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create room",
        variant: "error",
        duration: DEFAULT_TOAST_DURATION,
      });
    }
  };

  return (
    <div class="flex h-full flex-col">
      <Tabs value={currentRoom()} onChange={v => setCurrentRoom(v as string)} class="flex-1">
        <TabsList>
          <TabsTrigger value="">Lobby</TabsTrigger>
          <For each={rooms()}>
            {room => <TabsTrigger value={room.id}>{room.name}</TabsTrigger>}
          </For>
        </TabsList>

        <TabsContent value="">
          <div class="p-4 space-y-4">
            <div>
              <h2 class="text-lg font-semibold">Welcome to SpacetimeDB Chat</h2>
              <p class="text-sm text-muted-foreground">Select a room or create a new one to start chatting!</p>
            </div>
            
            <div class="flex gap-2">
              <TextField class="flex-1">
                <TextFieldInput
                  type="text"
                  placeholder="New room name..."
                  value={newRoomName()}
                  onInput={e => setNewRoomName(e.currentTarget.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && newRoomName().trim()) {
                      createNewRoom();
                    }
                  }}
                />
              </TextField>
              <Button
                variant="default"
                onClick={createNewRoom}
                disabled={!newRoomName().trim() || !connected()}
              >
                Create Room
              </Button>
            </div>

            <div class="mt-4">
              <h3 class="text-md font-semibold mb-2">Available Rooms ({rooms().length})</h3>
              <div class="space-y-2">
                <For each={rooms()}>
                  {room => (
                    <div 
                      class="p-2 border rounded cursor-pointer hover:bg-accent"
                      onClick={() => setCurrentRoom(room.id)}
                    >
                      <div class="font-medium">{room.name}</div>
                      <div class="text-xs text-muted-foreground">
                        Created: {new Date(Number(room.createdAt)).toLocaleString()}
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </div>
          </div>
        </TabsContent>

        <For each={rooms()}>
          {room => (
            <TabsContent value={room.id}>
              <Resizable orientation="horizontal" class="max-w-full rounded-lg border">
                <ResizablePanel initialSize={0.15} class="p-2">
                  <h3 class="text-sm font-semibold mb-2">Members</h3>
                  <For each={permissions()}>
                    {permission => {
                      const user = users().get(permission.userId.toHexString());
                      return (
                        <UserAvatarCard
                          user={{
                            id: permission.userId.toHexString(),
                            username: user?.name || permission.userId.toHexString().slice(0, 8),
                          }}
                        />
                      );
                    }}
                  </For>
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel initialSize={0.85} class="p-2 flex flex-col">
                  <div class="flex-1 overflow-y-auto mb-4">
                    <For each={messages()}>
                      {message => {
                        const sender = users().get(message.sender.toHexString());
                        return (
                          <ChatMessage
                            senderId={message.sender.toHexString()}
                            roomId={message.roomId}
                            timestamp={message.timestamp.toDate().getTime()}
                            message={message.text}
                            members={Array.from(users().values()).map(u => ({
                              id: u.identity.toHexString(),
                              username: u.name || u.identity.toHexString().slice(0, 8),
                            }))}
                          />
                        );
                      }}
                    </For>
                  </div>

                  <div class="flex gap-2">
                    <TextField class="flex-1">
                      <TextFieldInput
                        type="text"
                        placeholder="Type a message..."
                        value={chatInput()}
                        onInput={e => {
                          setChatInput(e.currentTarget.value);
                        }}
                        onKeyDown={e => {
                          if (e.key === "Enter" && chatInput().trim()) {
                            sendMessage(room.id, chatInput().trim());
                          }
                        }}
                        disabled={!connected()}
                      />
                    </TextField>
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (chatInput().trim()) {
                          sendMessage(room.id, chatInput().trim());
                        }
                      }}
                      disabled={!connected() || !chatInput().trim()}
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

export default SpacetimeChat;
