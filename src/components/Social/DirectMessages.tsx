import { Component, createSignal, createMemo, createEffect, For, Show, onMount } from "solid-js";
import { Identity } from "spacetimedb";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { TextField, TextFieldInput } from "~/components/ui/text-field";
import { ScrollArea } from "~/components/ui/scroll-area";
import { useSpacetimeDB } from "~/hooks/useSpacetimeDB";
import { resolvePlayerName } from "~/lib/game-utils";
import { showToast } from "~/components/ui/toast";
import { DEFAULT_TOAST_DURATION } from "~/lib/timeout-constants";
import type { DirectMessageConversation, DirectMessage, User } from "~/module_bindings/types";

interface DirectMessagesProps {
  initialConversationWith?: Identity;
}

const DirectMessages: Component<DirectMessagesProps> = (props) => {
  const { conn, connected, identity } = useSpacetimeDB();

  const [conversations, setConversations] = createSignal<DirectMessageConversation[]>([]);
  const [messages, setMessages] = createSignal<DirectMessage[]>([]);
  const [users, setUsers] = createSignal<Map<string, User>>(new Map());
  const [selectedConversationId, setSelectedConversationId] = createSignal<string | null>(null);
  const [messageInput, setMessageInput] = createSignal("");
  const [subscriptionsSet, setSubscriptionsSet] = createSignal(false);

  let messagesEndRef: HTMLDivElement | undefined;

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef?.scrollIntoView({ behavior: "smooth" });
  };

  // Set up subscriptions when connected
  createEffect(() => {
    const connection = conn();
    if (!connection || !connected() || subscriptionsSet()) return;

    // Load initial data
    const initialConversations = Array.from(connection.db.direct_message_conversation.iter());
    setConversations(initialConversations);

    const initialMessages = Array.from(connection.db.direct_message.iter());
    setMessages(initialMessages);

    const userMap = new Map<string, User>();
    for (const user of connection.db.user.iter()) {
      userMap.set(user.identity.toHexString(), user);
    }
    setUsers(userMap);

    // Listen for conversation changes
    connection.db.direct_message_conversation.onInsert((ctx, conversation) => {
      setConversations(prev => {
        if (prev.find(c => c.id === conversation.id)) return prev;
        return [...prev, conversation];
      });
    });

    connection.db.direct_message_conversation.onUpdate((ctx, oldConv, newConv) => {
      setConversations(prev =>
        prev.map(c => c.id === newConv.id ? newConv : c)
      );
    });

    // Listen for new messages
    connection.db.direct_message.onInsert((ctx, message) => {
      setMessages(prev => {
        if (prev.find(m => m.id === message.id)) return prev;
        return [...prev, message];
      });
      // Scroll to bottom if in the same conversation
      if (message.conversationId === selectedConversationId()) {
        setTimeout(scrollToBottom, 100);
      }
    });

    connection.db.direct_message.onUpdate((ctx, oldMsg, newMsg) => {
      setMessages(prev =>
        prev.map(m => m.id === newMsg.id ? newMsg : m)
      );
    });

    // Listen for user updates
    connection.db.user.onUpdate((ctx, oldUser, newUser) => {
      setUsers(prev => {
        const newMap = new Map(prev);
        newMap.set(newUser.identity.toHexString(), newUser);
        return newMap;
      });
    });

    connection.db.user.onInsert((ctx, user) => {
      setUsers(prev => {
        const newMap = new Map(prev);
        newMap.set(user.identity.toHexString(), user);
        return newMap;
      });
    });

    setSubscriptionsSet(true);
  });

  // Handle initial conversation
  createEffect(() => {
    if (props.initialConversationWith && subscriptionsSet()) {
      const myId = identity();
      if (!myId) return;

      // Find or create conversation ID
      const sortedIds = [myId.toHexString(), props.initialConversationWith.toHexString()].sort();
      const conversationId = `dm_${sortedIds[0]}_${sortedIds[1]}`;

      // Check if conversation exists
      const existingConv = conversations().find(c => c.id === conversationId);
      if (existingConv) {
        setSelectedConversationId(conversationId);
      }
    }
  });

  // Get conversations for current user, sorted by last message
  const myConversations = createMemo(() => {
    const myId = identity();
    if (!myId) return [];

    const myHex = myId.toHexString();
    return conversations()
      .filter(c =>
        c.user1.toHexString() === myHex ||
        c.user2.toHexString() === myHex
      )
      .map(c => {
        const otherUserId = c.user1.toHexString() === myHex ? c.user2 : c.user1;
        const otherHex = otherUserId.toHexString();
        const user = users().get(otherHex);

        // Count unread messages
        const unreadCount = messages().filter(m =>
          m.conversationId === c.id &&
          m.sender.toHexString() !== myHex &&
          !m.isRead
        ).length;

        // Get last message preview
        const convMessages = messages()
          .filter(m => m.conversationId === c.id)
          .sort((a, b) => b.timestamp.toDate().getTime() - a.timestamp.toDate().getTime());
        const lastMessage = convMessages[0];

        return {
          conversation: c,
          otherUserId,
          name: user?.name || resolvePlayerName(otherHex, conn()),
          online: user?.online ?? false,
          unreadCount,
          lastMessage: lastMessage?.text.slice(0, 30) + (lastMessage?.text.length > 30 ? "..." : "") || "",
          lastMessageTime: lastMessage?.timestamp.toDate() || new Date(Number(c.lastMessageAt) / 1000),
        };
      })
      .sort((a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime());
  });

  // Get messages for selected conversation
  const conversationMessages = createMemo(() => {
    const convId = selectedConversationId();
    if (!convId) return [];

    return messages()
      .filter(m => m.conversationId === convId)
      .sort((a, b) => a.timestamp.toDate().getTime() - b.timestamp.toDate().getTime());
  });

  // Get the other user in selected conversation
  const selectedConversationUser = createMemo(() => {
    const convId = selectedConversationId();
    const myId = identity();
    if (!convId || !myId) return null;

    const conv = conversations().find(c => c.id === convId);
    if (!conv) return null;

    const myHex = myId.toHexString();
    const otherUserId = conv.user1.toHexString() === myHex ? conv.user2 : conv.user1;
    const user = users().get(otherUserId.toHexString());

    return {
      identity: otherUserId,
      name: user?.name || resolvePlayerName(otherUserId.toHexString(), conn()),
      online: user?.online ?? false,
    };
  });

  const sendMessage = () => {
    const connection = conn();
    const text = messageInput().trim();
    const targetUser = selectedConversationUser();

    if (!connection || !connected() || !text || !targetUser) return;

    try {
      connection.reducers.sendDirectMessage({ toUser: targetUser.identity, text });
      setMessageInput("");
    } catch (error) {
      showToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "error",
        duration: DEFAULT_TOAST_DURATION,
      });
    }
  };

  const markAsRead = (conversationId: string) => {
    const connection = conn();
    if (!connection || !connected()) return;

    try {
      connection.reducers.markMessagesRead({ conversationId });
    } catch (error) {
      console.error("Failed to mark messages as read:", error);
    }
  };

  // Mark messages as read when selecting a conversation
  createEffect(() => {
    const convId = selectedConversationId();
    if (convId) {
      markAsRead(convId);
      setTimeout(scrollToBottom, 100);
    }
  });

  return (
    <div class="flex h-[500px] rounded-lg border">
      {/* Conversation List */}
      <div class="w-1/3 border-r">
        <div class="border-b p-3">
          <h3 class="font-semibold">Messages</h3>
        </div>
        <ScrollArea class="h-[calc(100%-3rem)]">
          <Show
            when={myConversations().length > 0}
            fallback={
              <div class="p-4 text-center text-sm text-muted-foreground">
                No conversations yet
              </div>
            }
          >
            <For each={myConversations()}>
              {(item) => (
                <div
                  class={`cursor-pointer border-b p-3 hover:bg-accent ${
                    selectedConversationId() === item.conversation.id ? "bg-accent" : ""
                  }`}
                  onClick={() => setSelectedConversationId(item.conversation.id)}
                >
                  <div class="flex items-center gap-3">
                    <div class="relative">
                      <div class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-sm font-medium">
                        {item.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div
                        class={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background ${
                          item.online ? "bg-green-500" : "bg-gray-400"
                        }`}
                      />
                    </div>
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center justify-between">
                        <span class="font-medium">{item.name}</span>
                        <Show when={item.unreadCount > 0}>
                          <Badge variant="default" class="h-5 min-w-[1.25rem] px-1">
                            {item.unreadCount}
                          </Badge>
                        </Show>
                      </div>
                      <div class="truncate text-xs text-muted-foreground">
                        {item.lastMessage || "No messages yet"}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </For>
          </Show>
        </ScrollArea>
      </div>

      {/* Message Thread */}
      <div class="flex flex-1 flex-col">
        <Show
          when={selectedConversationId()}
          fallback={
            <div class="flex flex-1 items-center justify-center text-muted-foreground">
              Select a conversation to start messaging
            </div>
          }
        >
          {/* Header */}
          <div class="flex items-center gap-3 border-b p-3">
            <div class="relative">
              <div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-medium">
                {selectedConversationUser()?.name.slice(0, 2).toUpperCase()}
              </div>
              <div
                class={`absolute bottom-0 right-0 h-2 w-2 rounded-full border border-background ${
                  selectedConversationUser()?.online ? "bg-green-500" : "bg-gray-400"
                }`}
              />
            </div>
            <div>
              <div class="font-medium">{selectedConversationUser()?.name}</div>
              <div class="text-xs text-muted-foreground">
                {selectedConversationUser()?.online ? "Online" : "Offline"}
              </div>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea class="flex-1 p-4">
            <div class="space-y-3">
              <For each={conversationMessages()}>
                {(message) => {
                  const isMe = message.sender.isEqual(identity()!);
                  return (
                    <div class={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                      <div
                        class={`max-w-[70%] rounded-lg px-3 py-2 ${
                          isMe
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <div class="text-sm">{message.text}</div>
                        <div
                          class={`mt-1 text-xs ${
                            isMe ? "text-primary-foreground/70" : "text-muted-foreground"
                          }`}
                        >
                          {message.timestamp.toDate().toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          <Show when={isMe}>
                            <span class="ml-2">
                              {message.isRead ? "Read" : "Sent"}
                            </span>
                          </Show>
                        </div>
                      </div>
                    </div>
                  );
                }}
              </For>
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          <div class="flex gap-2 border-t p-3">
            <TextField class="flex-1">
              <TextFieldInput
                type="text"
                placeholder="Type a message..."
                value={messageInput()}
                onInput={(e) => setMessageInput(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && messageInput().trim()) {
                    sendMessage();
                  }
                }}
              />
            </TextField>
            <Button
              onClick={sendMessage}
              disabled={!messageInput().trim()}
            >
              Send
            </Button>
          </div>
        </Show>
      </div>
    </div>
  );
};

export default DirectMessages;
