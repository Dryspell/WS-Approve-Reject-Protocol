import { Component, createSignal, createMemo, createEffect, For, Show } from "solid-js";
import { clientOnly } from "@solidjs/start";
import { useSpacetimeDB } from "~/hooks/useSpacetimeDB";
import { resolvePlayerName } from "~/lib/game-utils";
import { showToast } from "~/components/ui/toast";
import { DEFAULT_TOAST_DURATION } from "~/lib/timeout-constants";
import type {
  DirectMessageConversation,
  DirectMessage,
  User,
  FriendRequest,
  Friendship,
  ChatRoom,
  ChatMessage as ChatMessageType,
} from "~/module_bindings/types";

type OverlayView = "collapsed" | "contacts" | "chat-rooms" | "dm";
type Identity = import("spacetimedb").Identity;

interface ActiveDM {
  conversationId: string;
  otherUserId: Identity;
  name: string;
  online: boolean;
}

const ChatOverlayInner: Component = () => {
  const { conn, connected, identity } = useSpacetimeDB();

  const [view, setView] = createSignal<OverlayView>("collapsed");
  const [activeDM, setActiveDM] = createSignal<ActiveDM | null>(null);
  const [activeChatRoom, setActiveChatRoom] = createSignal<string | null>(null);
  const [messageInput, setMessageInput] = createSignal("");
  const [searchQuery, setSearchQuery] = createSignal("");

  // Data signals
  const [friendships, setFriendships] = createSignal<Friendship[]>([]);
  const [friendRequests, setFriendRequests] = createSignal<FriendRequest[]>([]);
  const [conversations, setConversations] = createSignal<DirectMessageConversation[]>([]);
  const [directMessages, setDirectMessages] = createSignal<DirectMessage[]>([]);
  const [chatRooms, setChatRooms] = createSignal<ChatRoom[]>([]);
  const [chatMessages, setChatMessages] = createSignal<ChatMessageType[]>([]);
  const [users, setUsers] = createSignal<Map<string, User>>(new Map());
  const [subscriptionsSet, setSubscriptionsSet] = createSignal(false);

  let messagesEndRef: HTMLDivElement | undefined;
  let inputRef: HTMLInputElement | undefined;

  const scrollToBottom = () => {
    messagesEndRef?.scrollIntoView({ behavior: "smooth" });
  };

  // Subscribe to data
  createEffect(() => {
    const connection = conn();
    if (!connection || !connected() || subscriptionsSet()) return;

    setFriendships(Array.from(connection.db.friendship.iter()));
    setFriendRequests(Array.from(connection.db.friend_request.iter()));
    setConversations(Array.from(connection.db.direct_message_conversation.iter()));
    setDirectMessages(Array.from(connection.db.direct_message.iter()));
    setChatRooms(Array.from(connection.db.chat_room.iter()));
    setChatMessages(Array.from(connection.db.chat_message.iter()));

    const userMap = new Map<string, User>();
    for (const user of connection.db.user.iter()) {
      userMap.set(user.identity.toHexString(), user);
    }
    setUsers(userMap);

    // Listeners
    connection.db.friendship.onInsert((_, f) => {
      setFriendships((prev) => (prev.find((x) => x.id === f.id) ? prev : [...prev, f]));
    });
    connection.db.friendship.onDelete((_, f) => {
      setFriendships((prev) => prev.filter((x) => x.id !== f.id));
    });

    connection.db.friend_request.onInsert((_, r) => {
      setFriendRequests((prev) => (prev.find((x) => x.id === r.id) ? prev : [...prev, r]));
    });
    connection.db.friend_request.onUpdate((_, __, r) => {
      setFriendRequests((prev) => prev.map((x) => (x.id === r.id ? r : x)));
    });
    connection.db.friend_request.onDelete((_, r) => {
      setFriendRequests((prev) => prev.filter((x) => x.id !== r.id));
    });

    connection.db.direct_message_conversation.onInsert((_, c) => {
      setConversations((prev) => (prev.find((x) => x.id === c.id) ? prev : [...prev, c]));
    });
    connection.db.direct_message_conversation.onUpdate((_, __, c) => {
      setConversations((prev) => prev.map((x) => (x.id === c.id ? c : x)));
    });

    connection.db.direct_message.onInsert((_, m) => {
      setDirectMessages((prev) => (prev.find((x) => x.id === m.id) ? prev : [...prev, m]));
      if (m.conversationId === activeDM()?.conversationId) {
        setTimeout(scrollToBottom, 100);
      }
    });
    connection.db.direct_message.onUpdate((_, __, m) => {
      setDirectMessages((prev) => prev.map((x) => (x.id === m.id ? m : x)));
    });

    connection.db.chat_room.onInsert((_, r) => {
      setChatRooms((prev) => (prev.find((x) => x.id === r.id) ? prev : [...prev, r]));
    });
    connection.db.chat_message.onInsert((_, m) => {
      setChatMessages((prev) => (prev.find((x) => x.id === m.id) ? prev : [...prev, m]));
      if (m.roomId === activeChatRoom()) {
        setTimeout(scrollToBottom, 100);
      }
    });

    connection.db.user.onInsert((_, u) => {
      setUsers((prev) => {
        const m = new Map(prev);
        m.set(u.identity.toHexString(), u);
        return m;
      });
    });
    connection.db.user.onUpdate((_, __, u) => {
      setUsers((prev) => {
        const m = new Map(prev);
        m.set(u.identity.toHexString(), u);
        return m;
      });
    });

    setSubscriptionsSet(true);
  });

  // Computed values
  const myFriends = createMemo(() => {
    const myId = identity();
    if (!myId) return [];
    const myHex = myId.toHexString();
    return friendships()
      .filter((f) => f.user1.toHexString() === myHex || f.user2.toHexString() === myHex)
      .map((f) => {
        const friendId = f.user1.toHexString() === myHex ? f.user2 : f.user1;
        const friendHex = friendId.toHexString();
        const user = users().get(friendHex);
        return {
          friendId,
          name: user?.name || friendHex.slice(0, 8),
          online: user?.online ?? false,
        };
      })
      .sort((a, b) => {
        if (a.online !== b.online) return b.online ? 1 : -1;
        return a.name.localeCompare(b.name);
      });
  });

  const pendingIncomingRequests = createMemo(() => {
    const myId = identity();
    if (!myId) return [];
    const myHex = myId.toHexString();
    return friendRequests()
      .filter((r) => r.toUser.toHexString() === myHex && r.status === "pending")
      .map((r) => {
        const fromHex = r.fromUser.toHexString();
        const user = users().get(fromHex);
        return { request: r, name: user?.name || fromHex.slice(0, 8) };
      });
  });

  const unreadDMCount = createMemo(() => {
    const myId = identity();
    if (!myId) return 0;
    const myHex = myId.toHexString();
    return directMessages().filter(
      (m) => m.sender.toHexString() !== myHex && !m.isRead,
    ).length;
  });

  const recentConversations = createMemo(() => {
    const myId = identity();
    if (!myId) return [];
    const myHex = myId.toHexString();
    return conversations()
      .filter((c) => c.user1.toHexString() === myHex || c.user2.toHexString() === myHex)
      .map((c) => {
        const otherId = c.user1.toHexString() === myHex ? c.user2 : c.user1;
        const otherHex = otherId.toHexString();
        const user = users().get(otherHex);
        const unread = directMessages().filter(
          (m) => m.conversationId === c.id && m.sender.toHexString() !== myHex && !m.isRead,
        ).length;
        const convMsgs = directMessages()
          .filter((m) => m.conversationId === c.id)
          .sort((a, b) => b.timestamp.toDate().getTime() - a.timestamp.toDate().getTime());
        const last = convMsgs[0];
        return {
          conversation: c,
          otherId,
          name: user?.name || resolvePlayerName(otherHex, conn()),
          online: user?.online ?? false,
          unreadCount: unread,
          lastMessage: last ? (last.text.length > 30 ? last.text.slice(0, 30) + "..." : last.text) : "",
          lastTime: last?.timestamp.toDate() || new Date(0),
        };
      })
      .sort((a, b) => b.lastTime.getTime() - a.lastTime.getTime());
  });

  const currentDMMessages = createMemo(() => {
    const dm = activeDM();
    if (!dm) return [];
    return directMessages()
      .filter((m) => m.conversationId === dm.conversationId)
      .sort((a, b) => a.timestamp.toDate().getTime() - b.timestamp.toDate().getTime());
  });

  const currentChatRoomMessages = createMemo(() => {
    const roomId = activeChatRoom();
    if (!roomId) return [];
    return chatMessages()
      .filter((m) => m.roomId === roomId)
      .sort((a, b) => a.timestamp.toDate().getTime() - b.timestamp.toDate().getTime());
  });

  // Actions
  const openDM = (otherId: Identity, name: string, online: boolean) => {
    const myId = identity();
    if (!myId) return;
    const sortedIds = [myId.toHexString(), otherId.toHexString()].sort();
    const conversationId = `dm_${sortedIds[0]}_${sortedIds[1]}`;
    setActiveDM({ conversationId, otherUserId: otherId, name, online });
    setActiveChatRoom(null);
    setView("dm");
    setMessageInput("");

    // Mark as read
    const connection = conn();
    if (connection && connected()) {
      try {
        connection.reducers.markMessagesRead({ conversationId });
      } catch {}
    }
    setTimeout(scrollToBottom, 100);
  };

  const openChatRoom = (roomId: string) => {
    setActiveChatRoom(roomId);
    setActiveDM(null);
    setView("dm");
    setMessageInput("");
    setTimeout(scrollToBottom, 100);
  };

  const sendDM = () => {
    const connection = conn();
    const text = messageInput().trim();
    const dm = activeDM();
    if (!connection || !connected() || !text || !dm) return;
    try {
      connection.reducers.sendDirectMessage({ toUser: dm.otherUserId, text });
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

  const sendChatRoomMessage = () => {
    const connection = conn();
    const text = messageInput().trim();
    const roomId = activeChatRoom();
    if (!connection || !connected() || !text || !roomId) return;
    try {
      connection.reducers.sendChatMessage({ roomId, text, roundNumber: undefined });
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

  const handleSend = () => {
    if (activeDM()) sendDM();
    else if (activeChatRoom()) sendChatRoomMessage();
  };

  const acceptFriendRequest = (requestId: number) => {
    const connection = conn();
    if (!connection || !connected()) return;
    try {
      connection.reducers.acceptFriendRequest({ requestId });
    } catch {}
  };

  const rejectFriendRequest = (requestId: number) => {
    const connection = conn();
    if (!connection || !connected()) return;
    try {
      connection.reducers.rejectFriendRequest({ requestId });
    } catch {}
  };

  const togglePanel = () => {
    setView((v) => (v === "collapsed" ? "contacts" : "collapsed"));
  };

  const isOpen = () => view() !== "collapsed";
  const totalNotifications = () => unreadDMCount() + pendingIncomingRequests().length;

  // SVG icons as functions to keep JSX clean
  const ChatIcon = () => (
    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );

  const BackIcon = () => (
    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );

  const CloseIcon = () => (
    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );

  const PeopleIcon = () => (
    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );

  const RoomsIcon = () => (
    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  );

  const SendIcon = () => (
    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  );

  return (
    <div class="fixed bottom-0 right-4 z-[60] flex flex-col items-end">
      {/* Panel */}
      <Show when={isOpen()}>
        <div class="mb-0 flex h-[480px] w-[340px] flex-col overflow-hidden rounded-t-xl border border-white/10 bg-slate-900/95 shadow-2xl backdrop-blur-xl">
          {/* Header */}
          <div class="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div class="flex items-center gap-2">
              <Show when={view() === "dm"}>
                <button
                  class="rounded p-1 text-white/50 hover:bg-white/10 hover:text-white"
                  onClick={() => {
                    setActiveDM(null);
                    setActiveChatRoom(null);
                    setView("contacts");
                  }}
                >
                  <BackIcon />
                </button>
              </Show>
              <h3 class="text-sm font-semibold text-white">
                {view() === "contacts" && "Contacts"}
                {view() === "chat-rooms" && "Chat Rooms"}
                {view() === "dm" && activeDM() && activeDM()!.name}
                {view() === "dm" && activeChatRoom() && (chatRooms().find((r) => r.id === activeChatRoom())?.name || "Chat Room")}
              </h3>
            </div>
            <button
              class="rounded p-1 text-white/40 hover:bg-white/10 hover:text-white"
              onClick={() => setView("collapsed")}
            >
              <CloseIcon />
            </button>
          </div>

          {/* Tab bar for contacts vs rooms */}
          <Show when={view() === "contacts" || view() === "chat-rooms"}>
            <div class="flex border-b border-white/5">
              <button
                class="flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors"
                classList={{
                  "text-blue-400 border-b-2 border-blue-400": view() === "contacts",
                  "text-white/40 hover:text-white/60": view() !== "contacts",
                }}
                onClick={() => setView("contacts")}
              >
                <PeopleIcon /> Friends & DMs
              </button>
              <button
                class="flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors"
                classList={{
                  "text-blue-400 border-b-2 border-blue-400": view() === "chat-rooms",
                  "text-white/40 hover:text-white/60": view() !== "chat-rooms",
                }}
                onClick={() => setView("chat-rooms")}
              >
                <RoomsIcon /> Rooms
              </button>
            </div>
          </Show>

          {/* Content area */}
          <div class="flex-1 overflow-y-auto">
            {/* Contacts view */}
            <Show when={view() === "contacts"}>
              <div class="px-3 py-2">
                {/* Friend requests */}
                <Show when={pendingIncomingRequests().length > 0}>
                  <div class="mb-3">
                    <div class="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/30">
                      Friend Requests ({pendingIncomingRequests().length})
                    </div>
                    <For each={pendingIncomingRequests()}>
                      {(item) => (
                        <div class="mb-1 flex items-center justify-between rounded-lg bg-white/[0.03] p-2">
                          <div class="flex items-center gap-2">
                            <div class="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600/20 text-[10px] font-medium text-blue-400">
                              {item.name.slice(0, 2).toUpperCase()}
                            </div>
                            <span class="text-xs text-white/80">{item.name}</span>
                          </div>
                          <div class="flex gap-1">
                            <button
                              class="rounded bg-blue-600/80 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-blue-600"
                              onClick={() => acceptFriendRequest(item.request.id)}
                            >
                              Accept
                            </button>
                            <button
                              class="rounded bg-white/5 px-2 py-0.5 text-[10px] font-medium text-white/40 hover:bg-white/10 hover:text-white/60"
                              onClick={() => rejectFriendRequest(item.request.id)}
                            >
                              Deny
                            </button>
                          </div>
                        </div>
                      )}
                    </For>
                  </div>
                </Show>

                {/* Recent conversations */}
                <Show when={recentConversations().length > 0}>
                  <div class="mb-3">
                    <div class="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/30">
                      Recent Messages
                    </div>
                    <For each={recentConversations()}>
                      {(conv) => (
                        <button
                          class="mb-0.5 flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-white/5"
                          onClick={() => openDM(conv.otherId, conv.name, conv.online)}
                        >
                          <div class="relative flex-shrink-0">
                            <div class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600/20 text-xs font-medium text-blue-300">
                              {conv.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div
                              class="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-slate-900"
                              classList={{
                                "bg-emerald-400": conv.online,
                                "bg-white/20": !conv.online,
                              }}
                            />
                          </div>
                          <div class="min-w-0 flex-1">
                            <div class="flex items-center justify-between">
                              <span class="text-xs font-medium text-white/90">{conv.name}</span>
                              <Show when={conv.unreadCount > 0}>
                                <span class="flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
                                  {conv.unreadCount}
                                </span>
                              </Show>
                            </div>
                            <p class="truncate text-[11px] text-white/30">{conv.lastMessage || "No messages"}</p>
                          </div>
                        </button>
                      )}
                    </For>
                  </div>
                </Show>

                {/* Friends list */}
                <div>
                  <div class="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/30">
                    Friends ({myFriends().length})
                  </div>
                  <Show
                    when={myFriends().length > 0}
                    fallback={
                      <p class="py-4 text-center text-xs text-white/20">No friends yet</p>
                    }
                  >
                    <For each={myFriends()}>
                      {(friend) => (
                        <button
                          class="mb-0.5 flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-white/5"
                          onClick={() => openDM(friend.friendId, friend.name, friend.online)}
                        >
                          <div class="relative flex-shrink-0">
                            <div class="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-medium text-white/60">
                              {friend.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div
                              class="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-slate-900"
                              classList={{
                                "bg-emerald-400": friend.online,
                                "bg-white/20": !friend.online,
                              }}
                            />
                          </div>
                          <div>
                            <div class="text-xs font-medium text-white/80">{friend.name}</div>
                            <div class="text-[10px] text-white/25">
                              {friend.online ? "Online" : "Offline"}
                            </div>
                          </div>
                        </button>
                      )}
                    </For>
                  </Show>
                </div>
              </div>
            </Show>

            {/* Chat Rooms view */}
            <Show when={view() === "chat-rooms"}>
              <div class="px-3 py-2">
                <Show
                  when={chatRooms().length > 0}
                  fallback={<p class="py-8 text-center text-xs text-white/20">No chat rooms</p>}
                >
                  <For each={chatRooms()}>
                    {(room) => {
                      const roomMsgCount = () =>
                        chatMessages().filter((m) => m.roomId === room.id).length;
                      return (
                        <button
                          class="mb-0.5 flex w-full items-center gap-2.5 rounded-lg p-2.5 text-left transition-colors hover:bg-white/5"
                          onClick={() => openChatRoom(room.id)}
                        >
                          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-600/20 text-xs font-medium text-amber-300">
                            #
                          </div>
                          <div class="min-w-0 flex-1">
                            <div class="text-xs font-medium text-white/80">{room.name}</div>
                            <div class="text-[10px] text-white/25">{roomMsgCount()} messages</div>
                          </div>
                        </button>
                      );
                    }}
                  </For>
                </Show>
              </div>
            </Show>

            {/* DM / Chat Room message thread */}
            <Show when={view() === "dm"}>
              <div class="flex h-full flex-col">
                {/* Online status bar for DMs */}
                <Show when={activeDM()}>
                  <div class="flex items-center gap-2 border-b border-white/5 px-4 py-1.5">
                    <div
                      class="h-2 w-2 rounded-full"
                      classList={{
                        "bg-emerald-400": activeDM()!.online,
                        "bg-white/20": !activeDM()!.online,
                      }}
                    />
                    <span class="text-[10px] text-white/30">
                      {activeDM()!.online ? "Online" : "Offline"}
                    </span>
                  </div>
                </Show>

                {/* Messages */}
                <div class="flex-1 overflow-y-auto px-3 py-2">
                  <For each={activeDM() ? currentDMMessages() : currentChatRoomMessages()}>
                    {(message) => {
                      const isMe = () => message.sender.isEqual(identity()!);
                      const senderName = () => {
                        if (isMe()) return "You";
                        const user = users().get(message.sender.toHexString());
                        return user?.name || resolvePlayerName(message.sender.toHexString(), conn());
                      };
                      return (
                        <div
                          class="mb-2 flex"
                          classList={{ "justify-end": isMe(), "justify-start": !isMe() }}
                        >
                          <div
                            class="max-w-[80%] rounded-xl px-3 py-2"
                            classList={{
                              "bg-blue-600 text-white": isMe(),
                              "bg-white/[0.06] text-white/80": !isMe(),
                            }}
                          >
                            <Show when={!isMe() && activeChatRoom()}>
                              <div class="mb-0.5 text-[10px] font-medium text-blue-300">
                                {senderName()}
                              </div>
                            </Show>
                            <div class="text-[13px] leading-relaxed">{message.text}</div>
                            <div
                              class="mt-0.5 text-[9px]"
                              classList={{
                                "text-white/50": isMe(),
                                "text-white/20": !isMe(),
                              }}
                            >
                              {message.timestamp.toDate().toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  </For>
                  <div ref={messagesEndRef} />
                </div>
              </div>
            </Show>
          </div>

          {/* Input bar (only when in DM or Chat Room) */}
          <Show when={view() === "dm" && (activeDM() || activeChatRoom())}>
            <div class="border-t border-white/10 p-2">
              <div class="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  class="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-blue-500/50"
                  placeholder="Type a message..."
                  value={messageInput()}
                  onInput={(e) => setMessageInput(e.currentTarget.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && messageInput().trim()) {
                      handleSend();
                    }
                  }}
                />
                <button
                  class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white transition-colors hover:bg-blue-500 disabled:opacity-30"
                  disabled={!messageInput().trim()}
                  onClick={handleSend}
                >
                  <SendIcon />
                </button>
              </div>
            </div>
          </Show>
        </div>
      </Show>

      {/* Floating toggle button */}
      <button
        class="group relative flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-500 hover:shadow-blue-500/30 hover:scale-105 active:scale-95"
        classList={{ "rounded-t-none rounded-b-full": isOpen() }}
        onClick={togglePanel}
      >
        <Show when={isOpen()} fallback={<ChatIcon />}>
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </Show>

        {/* Notification badge */}
        <Show when={!isOpen() && totalNotifications() > 0}>
          <span class="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm">
            {totalNotifications()}
          </span>
        </Show>
      </button>
    </div>
  );
};

const ChatOverlay = clientOnly(() => Promise.resolve({ default: ChatOverlayInner }));
export default ChatOverlay;
