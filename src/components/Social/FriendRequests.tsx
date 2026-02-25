import { Component, createSignal, createMemo, createEffect, For, Show } from "solid-js";
import { Identity } from "spacetimedb";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { TextField, TextFieldInput } from "~/components/ui/text-field";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useSpacetimeDB } from "~/hooks/useSpacetimeDB";
import { showToast } from "~/components/ui/toast";
import { DEFAULT_TOAST_DURATION } from "~/lib/timeout-constants";
import type { FriendRequest, User } from "~/module_bindings/types";

const FriendRequests: Component = () => {
  const { conn, connected, identity } = useSpacetimeDB();
  
  const [friendRequests, setFriendRequests] = createSignal<FriendRequest[]>([]);
  const [users, setUsers] = createSignal<Map<string, User>>(new Map());
  const [subscriptionsSet, setSubscriptionsSet] = createSignal(false);
  const [searchQuery, setSearchQuery] = createSignal("");

  // Set up subscriptions when connected
  createEffect(() => {
    const connection = conn();
    if (!connection || !connected() || subscriptionsSet()) return;

    // Load initial data
    const initialRequests = Array.from(connection.db.friend_request.iter());
    setFriendRequests(initialRequests);

    const userMap = new Map<string, User>();
    for (const user of connection.db.user.iter()) {
      userMap.set(user.identity.toHexString(), user);
    }
    setUsers(userMap);

    // Listen for friend request changes
    connection.db.friend_request.onInsert((ctx, request) => {
      setFriendRequests(prev => {
        if (prev.find(r => r.id === request.id)) return prev;
        return [...prev, request];
      });
    });

    connection.db.friend_request.onUpdate((ctx, oldRequest, newRequest) => {
      setFriendRequests(prev => 
        prev.map(r => r.id === newRequest.id ? newRequest : r)
      );
    });

    connection.db.friend_request.onDelete((ctx, request) => {
      setFriendRequests(prev => prev.filter(r => r.id !== request.id));
    });

    // Listen for user changes
    connection.db.user.onInsert((ctx, user) => {
      setUsers(prev => {
        const newMap = new Map(prev);
        newMap.set(user.identity.toHexString(), user);
        return newMap;
      });
    });

    setSubscriptionsSet(true);
  });

  // Incoming requests (pending requests TO me)
  const incomingRequests = createMemo(() => {
    const myId = identity();
    if (!myId) return [];

    const myHex = myId.toHexString();
    return friendRequests()
      .filter(r => r.toUser.toHexString() === myHex && r.status === "pending")
      .map(r => {
        const fromHex = r.fromUser.toHexString();
        const user = users().get(fromHex);
        return {
          request: r,
          fromUser: r.fromUser,
          name: user?.name || fromHex.slice(0, 8),
          online: user?.online ?? false,
        };
      });
  });

  // Outgoing requests (pending requests FROM me)
  const outgoingRequests = createMemo(() => {
    const myId = identity();
    if (!myId) return [];

    const myHex = myId.toHexString();
    return friendRequests()
      .filter(r => r.fromUser.toHexString() === myHex && r.status === "pending")
      .map(r => {
        const toHex = r.toUser.toHexString();
        const user = users().get(toHex);
        return {
          request: r,
          toUser: r.toUser,
          name: user?.name || toHex.slice(0, 8),
          online: user?.online ?? false,
        };
      });
  });

  // Search results (users you can send requests to)
  const searchResults = createMemo(() => {
    const query = searchQuery().toLowerCase().trim();
    if (!query) return [];

    const myId = identity();
    if (!myId) return [];
    const myHex = myId.toHexString();

    return Array.from(users().values())
      .filter(user => {
        // Exclude self
        if (user.identity.toHexString() === myHex) return false;
        // Match by name or identity
        const name = user.name?.toLowerCase() || "";
        const hex = user.identity.toHexString().toLowerCase();
        return name.includes(query) || hex.includes(query);
      })
      .slice(0, 10); // Limit results
  });

  const sendRequest = (toUser: Identity) => {
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
      connection.reducers.sendFriendRequest({ toUser });
      showToast({
        title: "Request Sent",
        description: "Friend request sent successfully",
        duration: DEFAULT_TOAST_DURATION,
      });
      setSearchQuery("");
    } catch (error) {
      showToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send request",
        variant: "error",
        duration: DEFAULT_TOAST_DURATION,
      });
    }
  };

  const acceptRequest = (requestId: number) => {
    const connection = conn();
    if (!connection || !connected()) return;

    try {
      connection.reducers.acceptFriendRequest({ requestId });
      showToast({
        title: "Request Accepted",
        description: "You are now friends!",
        duration: DEFAULT_TOAST_DURATION,
      });
    } catch (error) {
      showToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to accept request",
        variant: "error",
        duration: DEFAULT_TOAST_DURATION,
      });
    }
  };

  const rejectRequest = (requestId: number) => {
    const connection = conn();
    if (!connection || !connected()) return;

    try {
      connection.reducers.rejectFriendRequest({ requestId });
      showToast({
        title: "Request Rejected",
        description: "Friend request rejected",
        duration: DEFAULT_TOAST_DURATION,
      });
    } catch (error) {
      showToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reject request",
        variant: "error",
        duration: DEFAULT_TOAST_DURATION,
      });
    }
  };

  const cancelRequest = (requestId: number) => {
    const connection = conn();
    if (!connection || !connected()) return;

    try {
      connection.reducers.cancelFriendRequest({ requestId });
      showToast({
        title: "Request Cancelled",
        description: "Friend request cancelled",
        duration: DEFAULT_TOAST_DURATION,
      });
    } catch (error) {
      showToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to cancel request",
        variant: "error",
        duration: DEFAULT_TOAST_DURATION,
      });
    }
  };

  return (
    <div class="space-y-4">
      {/* Search to add friends */}
      <div class="space-y-2">
        <h3 class="text-lg font-semibold">Add Friend</h3>
        <TextField>
          <TextFieldInput
            type="text"
            placeholder="Search by name or ID..."
            value={searchQuery()}
            onInput={(e) => setSearchQuery(e.currentTarget.value)}
          />
        </TextField>

        <Show when={searchQuery().trim() && searchResults().length > 0}>
          <div class="space-y-1 rounded-lg border p-2">
            <For each={searchResults()}>
              {(user) => (
                <div class="flex items-center justify-between rounded p-2 hover:bg-accent">
                  <div class="flex items-center gap-2">
                    <div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-medium">
                      {(user.name || user.identity.toHexString().slice(0, 2)).slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div class="text-sm font-medium">
                        {user.name || user.identity.toHexString().slice(0, 12)}
                      </div>
                      <div class="text-xs text-muted-foreground">
                        {user.online ? "Online" : "Offline"}
                      </div>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => sendRequest(user.identity)}>
                    Add
                  </Button>
                </div>
              )}
            </For>
          </div>
        </Show>

        <Show when={searchQuery().trim() && searchResults().length === 0}>
          <div class="rounded-lg border p-4 text-center text-sm text-muted-foreground">
            No users found matching "{searchQuery()}"
          </div>
        </Show>
      </div>

      {/* Tabs for incoming/outgoing */}
      <Tabs defaultValue="incoming" class="w-full">
        <TabsList class="grid w-full grid-cols-2">
          <TabsTrigger value="incoming">
            Incoming
            <Show when={incomingRequests().length > 0}>
              <Badge variant="default" class="ml-2">
                {incomingRequests().length}
              </Badge>
            </Show>
          </TabsTrigger>
          <TabsTrigger value="outgoing">
            Outgoing
            <Show when={outgoingRequests().length > 0}>
              <Badge variant="outline" class="ml-2">
                {outgoingRequests().length}
              </Badge>
            </Show>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="incoming" class="mt-4">
          <Show
            when={incomingRequests().length > 0}
            fallback={
              <div class="py-6 text-center text-muted-foreground">
                No incoming friend requests
              </div>
            }
          >
            <div class="space-y-2">
              <For each={incomingRequests()}>
                {(item) => (
                  <div class="flex items-center justify-between rounded-lg border p-3">
                    <div class="flex items-center gap-3">
                      <div class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-sm font-medium">
                        {item.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div class="font-medium">{item.name}</div>
                        <div class="text-xs text-muted-foreground">
                          wants to be your friend
                        </div>
                      </div>
                    </div>
                    <div class="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => acceptRequest(item.request.id)}
                      >
                        Accept
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => rejectRequest(item.request.id)}
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </TabsContent>

        <TabsContent value="outgoing" class="mt-4">
          <Show
            when={outgoingRequests().length > 0}
            fallback={
              <div class="py-6 text-center text-muted-foreground">
                No outgoing friend requests
              </div>
            }
          >
            <div class="space-y-2">
              <For each={outgoingRequests()}>
                {(item) => (
                  <div class="flex items-center justify-between rounded-lg border p-3">
                    <div class="flex items-center gap-3">
                      <div class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-sm font-medium">
                        {item.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div class="font-medium">{item.name}</div>
                        <div class="text-xs text-muted-foreground">
                          Request pending...
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => cancelRequest(item.request.id)}
                      class="text-destructive hover:text-destructive"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FriendRequests;
