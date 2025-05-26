import { createSignal, useContext, onMount, onCleanup } from "solid-js";
import { TextField, TextFieldInput } from "~/components/ui/text-field";
import { Component, For } from "solid-js";
import { Message } from "~/types/chat";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Button } from "~/components/ui/button";
import { showToast } from "~/components/ui/toast";
import { DEFAULT_TOAST_DURATION } from "~/lib/timeout-constants";
import { Resizable, ResizableHandle, ResizablePanel } from "~/components/ui/resizable";
import { useSpacetimeDB } from "~/app";
import ChatMessage from "./ChatMessage";
import UserAvatarCard from "./UserAvatarCard";

interface ChatProps {
  user: () => { id: string; name: string };
}

const Chat: Component<ChatProps> = (props) => {
  const [rooms, setRooms] = createSignal<Record<string, any>>({});
  const [chatInput, setChatInput] = createSignal("");
  const spacetimedb = useSpacetimeDB();

  onMount(async () => {
    // Subscribe to new messages
    const unsubscribeMessage = spacetimedb.subscribe("ChatMessage", (message) => {
      const room = rooms()[message.room_id];
      if (room) {
        setRooms({
          ...rooms(),
          [message.room_id]: {
            ...room,
            messages: [...room.messages, {
              id: message.id,
              senderId: message.sender_id,
              roomId: message.room_id,
              timestamp: message.timestamp,
              message: message.message,
              roundNumber: message.round_number,
            }],
          },
        });
      }
    });

    // Subscribe to room updates
    const unsubscribeRoom = spacetimedb.subscribe("ChatRoom", (room) => {
      setRooms({
        ...rooms(),
        [room.id]: {
          ...room,
          messages: rooms()[room.id]?.messages || [],
        },
      });
    });

    // Cleanup subscriptions
    onCleanup(() => {
      unsubscribeMessage();
      unsubscribeRoom();
    });

    // Create default global room if it doesn't exist
    try {
      const globalRoom = await spacetimedb.query("get_room", "global");
      if (!globalRoom) {
        await spacetimedb.call("create_room", "Global");
      }
    } catch (error) {
      console.error("Failed to setup global room:", error);
      showToast({
        title: "Error",
        description: "Failed to setup chat room",
        variant: "error",
        duration: DEFAULT_TOAST_DURATION,
      });
    }
  });

  const sendMessage = async (roomId: string) => {
    const messageText = chatInput().trim();
    if (!messageText) return;

    try {
      await spacetimedb.call("send_message", roomId, messageText);
      setChatInput("");
    } catch (error) {
      console.error("Failed to send message:", error);
      showToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "error",
        duration: DEFAULT_TOAST_DURATION,
      });
    }
  };

  return (
    <div class="flex h-full flex-col">
      <Tabs defaultValue="global" class="flex-1">
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
                  
                  <div class="flex gap-2">
                    <TextField class="flex-1">
                      <TextFieldInput
                        type="text"
                        placeholder="Type a message..."
                        value={chatInput()}
                        onInput={e => setChatInput(e.currentTarget.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter" && chatInput().trim()) {
                            sendMessage(roomId);
                          }
                        }}
                      />
                    </TextField>
                    <Button
                      variant="outline"
                      onClick={() => sendMessage(roomId)}
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
