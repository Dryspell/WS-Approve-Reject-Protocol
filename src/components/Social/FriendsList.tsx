import { Component, createSignal, createMemo, createEffect, For, Show } from "solid-js";
import { Identity } from "spacetimedb";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { useSpacetimeDB } from "~/hooks/useSpacetimeDB";
import { showToast } from "~/components/ui/toast";
import { DEFAULT_TOAST_DURATION } from "~/lib/timeout-constants";
import type { Friendship, User } from "~/module_bindings/types";

interface FriendsListProps {
  onStartChat?: (friendId: Identity) => void;
}

const FriendsList: Component<FriendsListProps> = (props) => {
  const { conn, connected, identity } = useSpacetimeDB();
  
  const [friendships, setFriendships] = createSignal<Friendship[]>([]);
  const [users, setUsers] = createSignal<Map<string, User>>(new Map());
  const [subscriptionsSet, setSubscriptionsSet] = createSignal(false);

  // Set up subscriptions when connected
  createEffect(() => {
    const connection = conn();
    if (!connection || !connected() || subscriptionsSet()) return;

    // Load initial data
    const initialFriendships = Array.from(connection.db.friendship.iter());
    setFriendships(initialFriendships);

    const userMap = new Map<string, User>();
    for (const user of connection.db.user.iter()) {
      userMap.set(user.identity.toHexString(), user);
    }
    setUsers(userMap);

    // Listen for friendship changes
    connection.db.friendship.onInsert((ctx, friendship) => {
      setFriendships(prev => {
        if (prev.find(f => f.id === friendship.id)) return prev;
        return [...prev, friendship];
      });
    });

    connection.db.friendship.onDelete((ctx, friendship) => {
      setFriendships(prev => prev.filter(f => f.id !== friendship.id));
    });

    // Listen for user changes (online status, name)
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

  // Get friends for current user
  const myFriends = createMemo(() => {
    const myId = identity();
    if (!myId) return [];

    const myHex = myId.toHexString();
    return friendships()
      .filter(f => 
        f.user1.toHexString() === myHex || 
        f.user2.toHexString() === myHex
      )
      .map(f => {
        const friendId = f.user1.toHexString() === myHex ? f.user2 : f.user1;
        const friendHex = friendId.toHexString();
        const user = users().get(friendHex);
        return {
          friendship: f,
          friendId,
          name: user?.name || friendHex.slice(0, 8),
          online: user?.online ?? false,
        };
      })
      .sort((a, b) => {
        // Sort by online status first, then by name
        if (a.online !== b.online) return b.online ? 1 : -1;
        return a.name.localeCompare(b.name);
      });
  });

  const removeFriend = (friendId: Identity) => {
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
      connection.reducers.removeFriend({ friendId });
      showToast({
        title: "Friend Removed",
        description: "Friend has been removed from your list",
        duration: DEFAULT_TOAST_DURATION,
      });
    } catch (error) {
      showToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove friend",
        variant: "error",
        duration: DEFAULT_TOAST_DURATION,
      });
    }
  };

  const blockFriend = (friendId: Identity) => {
    const connection = conn();
    if (!connection || !connected()) return;

    try {
      connection.reducers.blockUser({ userId: friendId });
      showToast({
        title: "User Blocked",
        description: "User has been blocked",
        duration: DEFAULT_TOAST_DURATION,
      });
    } catch (error) {
      showToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to block user",
        variant: "error",
        duration: DEFAULT_TOAST_DURATION,
      });
    }
  };

  return (
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold">Friends</h3>
        <Badge variant="outline">{myFriends().length}</Badge>
      </div>

      <Show
        when={myFriends().length > 0}
        fallback={
          <div class="py-8 text-center text-muted-foreground">
            <p>No friends yet.</p>
            <p class="text-sm">Send friend requests to connect with other players!</p>
          </div>
        }
      >
        <div class="space-y-2">
          <For each={myFriends()}>
            {(friend) => (
              <div class="flex items-center justify-between rounded-lg border p-3 hover:bg-accent/50">
                <div class="flex items-center gap-3">
                  <div class="relative">
                    <div class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-sm font-medium">
                      {friend.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div
                      class={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background ${
                        friend.online ? "bg-green-500" : "bg-gray-400"
                      }`}
                    />
                  </div>
                  <div>
                    <div class="font-medium">{friend.name}</div>
                    <div class="text-xs text-muted-foreground">
                      {friend.online ? "Online" : "Offline"}
                    </div>
                  </div>
                </div>

                <div class="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => props.onStartChat?.(friend.friendId)}
                  >
                    Message
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFriend(friend.friendId)}
                    class="text-destructive hover:text-destructive"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
};

export default FriendsList;
