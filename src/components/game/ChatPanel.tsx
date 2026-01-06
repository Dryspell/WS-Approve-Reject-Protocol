import { Component, createSignal, For, Show, onMount, createEffect } from "solid-js";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { TextField, TextFieldInput } from "~/components/ui/text-field";
import { useSpacetimeDB } from "~/hooks/useSpacetimeDB";
import type { Identity } from "~/module_bindings";

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: number;
  type: 'player' | 'system' | 'trade-offer';
}

interface ChatPanelProps {
  roomId: number;
  minimized?: boolean;
  onToggleMinimize?: () => void;
}

export const ChatPanel: Component<ChatPanelProps> = (props) => {
  const { conn, identity, connected } = useSpacetimeDB();
  const [messages, setMessages] = createSignal<ChatMessage[]>([]);
  const [inputValue, setInputValue] = createSignal('');
  const [scrollAreaRef, setScrollAreaRef] = createSignal<HTMLDivElement>();

  // Auto-scroll to bottom when new messages arrive
  createEffect(() => {
    const scrollArea = scrollAreaRef();
    if (scrollArea) {
      scrollArea.scrollTop = scrollArea.scrollHeight;
    }
  });

  onMount(() => {
    // Add welcome message
    addSystemMessage('Welcome to the game chat! You can communicate with other players here.');
  });

  const addSystemMessage = (text: string) => {
    const msg: ChatMessage = {
      id: `system-${Date.now()}`,
      senderId: 'system',
      senderName: 'System',
      message: text,
      timestamp: Date.now(),
      type: 'system',
    };
    setMessages([...messages(), msg]);
  };

  const sendMessage = () => {
    const message = inputValue().trim();
    if (!message || !identity()) return;

    const connection = conn();
    if (!connection) return;

    // Get current user
    const currentUser = connection.db.user.identity.get(identity() as Identity);
    
    const msg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: identity()!.toHexString(),
      senderName: currentUser?.name || 'Anonymous',
      message,
      timestamp: Date.now(),
      type: 'player',
    };

    setMessages([...messages(), msg]);
    setInputValue('');

    // TODO: When SpacetimeDB adds chat support, send via reducer:
    // connection.call('sendChatMessage', props.roomId, message);
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getMessageTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card class="flex h-full flex-col" classList={{
      'h-12': props.minimized,
    }}>
      <CardHeader class="cursor-pointer" onClick={props.onToggleMinimize}>
        <div class="flex items-center justify-between">
          <CardTitle class="flex items-center gap-2 text-base">
            💬 Chat {props.minimized && <Badge variant="outline" class="text-xs">Minimized</Badge>}
          </CardTitle>
          <Button size="sm" variant="ghost" class="h-6 w-6 p-0">
            {props.minimized ? '▲' : '▼'}
          </Button>
        </div>
      </CardHeader>

      <Show when={!props.minimized}>
        <CardContent class="flex flex-1 flex-col p-0">
          {/* Messages */}
          <ScrollArea class="flex-1 p-4" ref={setScrollAreaRef}>
            <div class="space-y-3">
              <For each={messages()} fallback={
                <div class="py-8 text-center text-xs text-gray-500">
                  No messages yet. Be the first to chat!
                </div>
              }>
                {(msg) => (
                  <div classList={{
                    'text-center': msg.type === 'system',
                  }}>
                    <Show when={msg.type === 'system'}>
                      <div class="inline-block rounded bg-gray-100 px-3 py-1 text-xs text-gray-600">
                        ℹ️ {msg.message}
                      </div>
                    </Show>

                    <Show when={msg.type === 'player'}>
                      <div classList={{
                        'text-right': msg.senderId === identity()?.toHexString(),
                      }}>
                        <div class="mb-1 flex items-center gap-2" classList={{
                          'justify-end': msg.senderId === identity()?.toHexString(),
                        }}>
                          <span class="text-xs font-semibold text-gray-700">
                            {msg.senderName}
                          </span>
                          <span class="text-xs text-gray-400">
                            {getMessageTime(msg.timestamp)}
                          </span>
                        </div>
                        <div class="inline-block max-w-[80%] rounded-lg px-3 py-2 text-sm" classList={{
                          'bg-blue-500 text-white': msg.senderId === identity()?.toHexString(),
                          'bg-gray-200 text-gray-800': msg.senderId !== identity()?.toHexString(),
                        }}>
                          {msg.message}
                        </div>
                      </div>
                    </Show>

                    <Show when={msg.type === 'trade-offer'}>
                      <Card class="bg-yellow-50 border-yellow-200">
                        <CardContent class="p-3 text-sm">
                          <div class="font-semibold">🤝 Trade Offer</div>
                          <div class="mt-1">{msg.message}</div>
                          <div class="mt-2 flex gap-2">
                            <Button size="sm" variant="outline">Accept</Button>
                            <Button size="sm" variant="outline">Decline</Button>
                          </div>
                        </CardContent>
                      </Card>
                    </Show>
                  </div>
                )}
              </For>
            </div>
          </ScrollArea>

          {/* Input */}
          <div class="border-t p-3">
            <div class="flex gap-2">
              <TextField class="flex-1">
                <TextFieldInput
                  placeholder="Type a message..."
                  value={inputValue()}
                  onInput={(e) => setInputValue(e.currentTarget.value)}
                  onKeyPress={handleKeyPress}
                />
              </TextField>
              <Button onClick={sendMessage} disabled={!inputValue().trim()}>
                Send
              </Button>
            </div>
            <div class="mt-2 text-xs text-gray-500">
              Press Enter to send • Shift+Enter for new line
            </div>
          </div>
        </CardContent>
      </Show>
    </Card>
  );
};

export default ChatPanel;

