import { Component, createSignal, For, onMount } from "solid-js";
import { TextField, TextFieldInput } from "~/components/ui/text-field";
import { Button } from "~/components/ui/button";
import { Resizable, ResizableHandle, ResizablePanel } from "~/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { createId } from "@paralleldrive/cuid2";
import { showToast } from "~/components/ui/toast";
import { DEFAULT_TOAST_DURATION } from "~/lib/timeout-constants";
import ChatMessage from "./ChatMessage";
import UserAvatarCard from "./UserAvatarCard";
import { createLocalStorageSignal } from "~/hooks/createLocalStorageSignal";
import { useSpacetimeDB, type SpacetimeDBClient } from "~/hooks/useSpacetimeDB";

// Local state types
type LocalChatRoom = {
  id: string;
  name: string;
  messages: Array<{
    room_id: string;
    sender_id: string;
    message: string;
    timestamp: number;
    round_number?: number;
  }>;
  permissions: Array<{
    room_id: string;
    user_id: string;
    permission: string;
  }>;
};

const SpacetimeChat: Component = () => {
  const [chatInput, setChatInput] = createLocalStorageSignal("chat-input", "");
  const [rooms, setRooms] = createSignal<Record<string, LocalChatRoom>>({});
  const [currentRoom, setCurrentRoom] = createSignal("");
  const [user] = createLocalStorageSignal("user", { id: "", username: "" });

  // Initialize SpacetimeDB connection
  const { db, connected } = useSpacetimeDB();

  // Subscribe to room updates
  onMount(() => {
    const client = db();
    if (!client || !connected()) return;

    // Subscribe to all rooms
    client.subscribe("chat_room", "*", (room: any) => {
      if (!room) return;

      setRooms(prev => ({
        ...prev,
        [room.id]: {
          ...prev[room.id],
          id: room.id,
          name: room.name,
          messages: prev[room.id]?.messages || [],
          permissions: prev[room.id]?.permissions || [],
        },
      }));
    });

    // Subscribe to messages for each room
    client.subscribe("chat_message", "*", (messages: any[]) => {
      if (!messages?.length) return;

      const roomId = messages[0].room_id;
      setRooms(prev => ({
        ...prev,
        [roomId]: {
          ...prev[roomId],
          messages: [...(prev[roomId]?.messages || []), ...messages],
        },
      }));
    });

    // Subscribe to permission updates
    client.subscribe("chat_permission", "*", (permissions: any[]) => {
      if (!permissions?.length) return;

      const roomId = permissions[0].room_id;
      setRooms(prev => ({
        ...prev,
        [roomId]: {
          ...prev[roomId],
          permissions,
        },
      }));
    });
  });

  const sendMessage = async (roomId: string, message: string) => {
    const client = db();
    if (!client || !connected()) {
      showToast({
        title: "Error",
        description: "Not connected to SpacetimeDB",
        variant: "error",
        duration: DEFAULT_TOAST_DURATION,
      });
      return;
    }

    try {
      await client.send_chat_message(roomId, message);
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

  const createNewRoom = async (name: string) => {
    const client = db();
    if (!client || !connected()) {
      showToast({
        title: "Error",
        description: "Not connected to SpacetimeDB",
        variant: "error",
        duration: DEFAULT_TOAST_DURATION,
      });
      return;
    }

    try {
      const roomId = await client.create_chat_room(name);
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
          <TabsTrigger value="">Global</TabsTrigger>
          <For each={Object.entries(rooms())}>
            {([roomId, room]) => <TabsTrigger value={roomId}>{room.name}</TabsTrigger>}
          </For>
        </TabsList>

        <TabsContent value="">
          <div class="p-4">
            <h2 class="text-lg font-semibold">Welcome to the Global Chat</h2>
            <p class="text-sm text-muted-foreground">Join a room to start chatting!</p>
          </div>
        </TabsContent>

        <For each={Object.entries(rooms())}>
          {([roomId, room]) => (
            <TabsContent value={roomId}>
              <Resizable orientation="horizontal" class="max-w-full rounded-lg border">
                <ResizablePanel initialSize={0.15} class="p-2">
                  <For each={room.permissions}>
                    {permission => (
                      <UserAvatarCard
                        user={{
                          id: permission.user_id,
                          username: permission.user_id, // You might want to fetch usernames separately
                        }}
                      />
                    )}
                  </For>
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel initialSize={0.85} class="p-2">
                  <div>
                    <For each={room.messages}>
                      {message => (
                        <ChatMessage
                          senderId={message.sender_id}
                          roomId={message.room_id}
                          timestamp={message.timestamp}
                          message={message.message}
                          members={room.permissions.map(p => ({
                            id: p.user_id,
                            username: p.user_id, // You might want to fetch usernames separately
                          }))}
                        />
                      )}
                    </For>
                  </div>

                  <div class="flex gap-2">
                    <TextField class="flex-1">
                      <TextFieldInput
                        type="text"
                        placeholder="Type a message..."
                        value={chatInput()}
                        onInput={e => {
                          setChatInput(e.currentTarget.value as string);
                        }}
                        onKeyDown={e => {
                          if (e.key === "Enter" && chatInput().trim()) {
                            sendMessage(roomId, chatInput().trim());
                          }
                        }}
                      />
                    </TextField>
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (chatInput().trim()) {
                          sendMessage(roomId, chatInput().trim());
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

export default SpacetimeChat;
