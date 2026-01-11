import { Component, createSignal, createMemo, createEffect, For, Show } from "solid-js";
import { Identity } from "@clockworklabs/spacetimedb-sdk";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { useSpacetimeDB } from "~/hooks/useSpacetimeDB";
import { showToast } from "~/components/ui/toast";
import { DEFAULT_TOAST_DURATION } from "~/lib/timeout-constants";
import type { BlockedUser } from "~/module_bindings/blocked_user_type";
import type { User } from "~/module_bindings/user_type";

const BlockedUsers: Component = () => {
  const { conn, connected, identity } = useSpacetimeDB();

  const [blockedUsers, setBlockedUsers] = createSignal<BlockedUser[]>([]);
  const [users, setUsers] = createSignal<Map<string, User>>(new Map());
  const [subscriptionsSet, setSubscriptionsSet] = createSignal(false);

  // Set up subscriptions when connected
  createEffect(() => {
    const connection = conn();
    if (!connection || !connected() || subscriptionsSet()) return;

    // Load initial data
    const initialBlocked = Array.from(connection.db.blockedUser.iter());
    setBlockedUsers(initialBlocked);

    const userMap = new Map<string, User>();
    for (const user of connection.db.user.iter()) {
      userMap.set(user.identity.toHexString(), user);
    }
    setUsers(userMap);

    // Listen for blocked user changes
    connection.db.blockedUser.onInsert((ctx, blocked) => {
      setBlockedUsers(prev => {
        if (prev.find(b => b.id === blocked.id)) return prev;
        return [...prev, blocked];
      });
    });

    connection.db.blockedUser.onDelete((ctx, blocked) => {
      setBlockedUsers(prev => prev.filter(b => b.id !== blocked.id));
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

  // Get users blocked by current user
  const myBlockedUsers = createMemo(() => {
    const myId = identity();
    if (!myId) return [];

    const myHex = myId.toHexString();
    return blockedUsers()
      .filter(b => b.blocker.toHexString() === myHex)
      .map(b => {
        const blockedHex = b.blocked.toHexString();
        const user = users().get(blockedHex);
        return {
          blockRecord: b,
          blockedId: b.blocked,
          name: user?.name || blockedHex.slice(0, 8),
          blockedAt: b.createdAt.toDate(),
        };
      })
      .sort((a, b) => b.blockedAt.getTime() - a.blockedAt.getTime());
  });

  const unblockUser = (userId: Identity) => {
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
      connection.reducers.unblockUser(userId);
      showToast({
        title: "User Unblocked",
        description: "User has been unblocked",
        duration: DEFAULT_TOAST_DURATION,
      });
    } catch (error) {
      showToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to unblock user",
        variant: "error",
        duration: DEFAULT_TOAST_DURATION,
      });
    }
  };

  return (
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-lg font-semibold">Blocked Users</h3>
          <p class="text-sm text-muted-foreground">
            Blocked users cannot send you friend requests or messages.
          </p>
        </div>
        <Badge variant="outline">{myBlockedUsers().length}</Badge>
      </div>

      <Show
        when={myBlockedUsers().length > 0}
        fallback={
          <div class="rounded-lg border border-dashed p-8 text-center">
            <div class="text-muted-foreground">
              <p>You haven't blocked anyone.</p>
              <p class="text-sm">
                You can block users from their profile or the friends list.
              </p>
            </div>
          </div>
        }
      >
        <div class="space-y-2">
          <For each={myBlockedUsers()}>
            {(item) => (
              <div class="flex items-center justify-between rounded-lg border p-3">
                <div class="flex items-center gap-3">
                  <div class="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/20 text-sm font-medium text-destructive">
                    {item.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div class="font-medium">{item.name}</div>
                    <div class="text-xs text-muted-foreground">
                      Blocked {item.blockedAt.toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => unblockUser(item.blockedId)}
                >
                  Unblock
                </Button>
              </div>
            )}
          </For>
        </div>
      </Show>

      <div class="rounded-lg bg-muted/50 p-4">
        <h4 class="mb-2 font-medium">What happens when you block someone?</h4>
        <ul class="space-y-1 text-sm text-muted-foreground">
          <li>• They cannot send you friend requests</li>
          <li>• They cannot send you direct messages</li>
          <li>• Any existing friendship is removed</li>
          <li>• Pending friend requests are cancelled</li>
          <li>• They won't know they've been blocked</li>
        </ul>
      </div>
    </div>
  );
};

export default BlockedUsers;
