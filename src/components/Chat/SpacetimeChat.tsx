import { Component, createSignal, For, onMount, createMemo, Show, createEffect } from "solid-js";
import { TextField, TextFieldInput } from "~/components/ui/text-field";
import { Button } from "~/components/ui/button";
import { Resizable, ResizableHandle, ResizablePanel } from "~/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Badge } from "~/components/ui/badge";
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

  // Use signals instead of memos for SpacetimeDB data
  const [rooms, setRooms] = createSignal<ChatRoom[]>([]);
  const [allMessages, setAllMessages] = createSignal<ChatMessageType[]>([]);
  const [allPermissions, setAllPermissions] = createSignal<ChatPermission[]>([]);
  const [subscriptionsSet, setSubscriptionsSet] = createSignal(false);

  // Get SpacetimeDB connection
  const { conn, connected, identity } = useSpacetimeDB();

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

    console.log("✅ SpacetimeDB connection ready!");
    console.log("Connected:", connected());
    console.log("Identity:", identity()?.toHexString());

    // Initial load of rooms from cache
    const initialRooms = Array.from(connection.db.chatRoom.iter());
    console.log("📦 Initial rooms loaded:", initialRooms.length, initialRooms);
    setRooms(initialRooms);

    // Initial load of messages
    const initialMessages = Array.from(connection.db.chatMessage.iter());
    console.log("💬 Initial messages loaded:", initialMessages.length);
    setAllMessages(initialMessages);

    // Initial load of permissions
    const initialPermissions = Array.from(connection.db.chatPermission.iter());
    console.log("🔐 Initial permissions loaded:", initialPermissions.length);
    setAllPermissions(initialPermissions);

    // Listen for new chat rooms being inserted
    connection.db.chatRoom.onInsert((ctx, room) => {
      console.log("🎉 New chat room inserted:", room);
      
      // Check if this is a room we already have (initial load) or a new one
      const existingRoom = rooms().find(r => r.id === room.id);
      if (!existingRoom) {
        setRooms(prev => [...prev, room]);
      }
      // Note: We don't show toasts here because onInsert fires for both
      // initial load AND new rooms. The "Creating..." toast when calling
      // the reducer is enough feedback.
    });

    // Listen for new messages
    connection.db.chatMessage.onInsert((ctx, message) => {
      console.log("💬 New chat message inserted:", message);

      // Only add if not already in our list (avoid duplicates from initial load)
      const existingMessage = allMessages().find(m => m.id === message.id);
      if (!existingMessage) {
        setAllMessages(prev => [...prev, message]);
      }
    });

    // Listen for new chat permissions being inserted
    connection.db.chatPermission.onInsert((ctx, permission) => {
      console.log("🔐 New chat permission inserted:", permission);

      // Only add if not already in our list (avoid duplicates from initial load)
      const existingPermission = allPermissions().find(
        p => p.roomId === permission.roomId && p.userId.isEqual(permission.userId),
      );
      if (!existingPermission) {
        setAllPermissions(prev => [...prev, permission]);
      }
    });

    // Mark subscriptions as set up
    setSubscriptionsSet(true);
    console.log("✅ All subscriptions set up!");
  });

  // Filtered memos based on signals
  const messages = createMemo(() => {
    const currentRoomId = currentRoom();
    if (!currentRoomId) return [];

    return allMessages()
      .filter(msg => msg.roomId === currentRoomId)
      .sort((a, b) => {
        // Compare timestamps by converting to numbers
        const aTime = a.timestamp.toDate().getTime();
        const bTime = b.timestamp.toDate().getTime();
        return aTime - bTime;
      });
  });

  const permissions = createMemo(() => {
    const currentRoomId = currentRoom();
    if (!currentRoomId) return [];

    return allPermissions().filter(perm => perm.roomId === currentRoomId);
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

  const createNewRoom = () => {
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
      console.log("Calling createChatRoom with name:", name);
      
      // Call the reducer - it's fire-and-forget, the onInsert callback will update the list
      connection.reducers.createChatRoom(name);
      
      // Clear input immediately
      setNewRoomName("");
      
      // Show feedback - the room will appear in the list when created
      showToast({
        title: "Room Created",
        description: `"${name}" will appear in the list shortly`,
        duration: DEFAULT_TOAST_DURATION,
      });
      
      console.log("createChatRoom called, waiting for room to appear in list");
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

  return (
    <div class="flex h-full flex-col">
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
            {rooms().length} room{rooms().length !== 1 ? "s" : ""} available
          </div>
        </div>
      </div>

      <Tabs value={currentRoom()} onChange={v => setCurrentRoom(v as string)} class="flex-1">
        <TabsList>
          <TabsTrigger value="">Lobby</TabsTrigger>
          <For each={rooms()}>{room => <TabsTrigger value={room.id}>{room.name}</TabsTrigger>}</For>
        </TabsList>

        <TabsContent value="">
          <div class="space-y-4 p-4">
            <Show
              when={!connected()}
              fallback={
                <div>
                  <h2 class="text-lg font-semibold">Welcome to SpacetimeDB Chat</h2>
                  <p class="text-sm text-muted-foreground">
                    Select a room or create a new one to start chatting!
                  </p>
                </div>
              }
            >
              <div class="rounded-lg border border-destructive bg-destructive/10 p-4">
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
              <h3 class="text-md mb-2 font-semibold">Available Rooms ({rooms().length})</h3>
              <div class="space-y-2">
                <For each={rooms()}>
                  {room => (
                    <div
                      class="cursor-pointer rounded border p-2 hover:bg-accent"
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
                  <h3 class="mb-2 text-sm font-semibold">Members</h3>
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
                <ResizablePanel initialSize={0.85} class="flex flex-col p-2">
                  <div class="mb-4 flex-1 overflow-y-auto">
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
