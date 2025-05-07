import { Component, For, createSignal, onMount } from "solid-js";
import { Message } from "~/types/chat";
import { User } from "~/types/user";
import { Button } from "../ui/button";
import { TextField, TextFieldInput } from "../ui/text-field";
import { ScrollArea } from "../ui/scroll-area";
import { createId } from "@paralleldrive/cuid2";

interface ChatBoxProps {
  roomId: string;
  user: () => User;
  messages: Message[];
  onSendMessage: (message: Message) => void;
  roundNumber?: number;
}

const ChatBox: Component<ChatBoxProps> = (props) => {
  const [newMessage, setNewMessage] = createSignal("");
  let scrollAreaRef: HTMLDivElement | undefined;

  const handleSendMessage = () => {
    const messageText = newMessage().trim();
    if (!messageText) return;

    const message: Message = {
      id: createId(),
      senderId: props.user().id,
      roomId: props.roomId,
      message: messageText,
      timestamp: Date.now(),
      roundNumber: props.roundNumber,
    };

    props.onSendMessage(message);
    setNewMessage("");
  };

  const scrollToBottom = () => {
    if (scrollAreaRef) {
      scrollAreaRef.scrollTop = scrollAreaRef.scrollHeight;
    }
  };

  onMount(() => {
    scrollToBottom();
  });

  return (
    <div class="flex h-full flex-col gap-2">
      <ScrollArea 
        ref={scrollAreaRef} 
        class="h-[calc(100%-4rem)] rounded-md border border-input bg-background p-4"
      >
        <For each={props.messages}>
          {(message) => (
            <div
              class={`mb-2 flex ${
                message.senderId === props.user().id ? "justify-end" : "justify-start"
              }`}
            >
              <div
                class={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.senderId === props.user().id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <div class="text-sm font-semibold">
                  {message.senderId === props.user().id ? "You" : message.senderId}
                </div>
                <div class="break-words">{message.message}</div>
                <div class="text-right text-xs opacity-70">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          )}
        </For>
      </ScrollArea>

      <div class="flex gap-2">
        <TextField class="flex-1">
          <TextFieldInput
            type="text"
            placeholder="Type a message..."
            value={newMessage()}
            onInput={(e) => setNewMessage(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
        </TextField>
        <Button onClick={handleSendMessage}>Send</Button>
      </div>
    </div>
  );
};

export default ChatBox; 