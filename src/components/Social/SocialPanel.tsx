import { Component, createSignal, Show } from "solid-js";
import { Identity } from "@clockworklabs/spacetimedb-sdk";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { useSpacetimeDB } from "~/hooks/useSpacetimeDB";
import FriendsList from "./FriendsList";
import FriendRequests from "./FriendRequests";
import DirectMessages from "./DirectMessages";
import BlockedUsers from "./BlockedUsers";
import { createMemo, createEffect } from "solid-js";
import type { FriendRequest } from "~/module_bindings/friend_request_type";
import type { DirectMessage } from "~/module_bindings/direct_message_type";

const SocialPanel: Component = () => {
  const { conn, connected, identity } = useSpacetimeDB();
  
  const [activeTab, setActiveTab] = createSignal("friends");
  const [dmTarget, setDmTarget] = createSignal<Identity | undefined>(undefined);
  const [pendingRequests, setPendingRequests] = createSignal(0);
  const [unreadMessages, setUnreadMessages] = createSignal(0);
  const [subscriptionsSet, setSubscriptionsSet] = createSignal(false);

  // Set up subscriptions for badge counts
  createEffect(() => {
    const connection = conn();
    if (!connection || !connected() || subscriptionsSet()) return;

    const updateCounts = () => {
      const myId = identity();
      if (!myId) return;
      const myHex = myId.toHexString();

      // Count pending incoming requests
      const requests = Array.from(connection.db.friendRequest.iter())
        .filter(r => r.toUser.toHexString() === myHex && r.status === "pending");
      setPendingRequests(requests.length);

      // Count unread messages
      const messages = Array.from(connection.db.directMessage.iter())
        .filter(m => m.sender.toHexString() !== myHex && !m.isRead);
      setUnreadMessages(messages.length);
    };

    // Initial count
    updateCounts();

    // Listen for changes
    connection.db.friendRequest.onInsert(() => updateCounts());
    connection.db.friendRequest.onUpdate(() => updateCounts());
    connection.db.friendRequest.onDelete(() => updateCounts());
    connection.db.directMessage.onInsert(() => updateCounts());
    connection.db.directMessage.onUpdate(() => updateCounts());

    setSubscriptionsSet(true);
  });

  const handleStartChat = (friendId: Identity) => {
    setDmTarget(friendId);
    setActiveTab("messages");
  };

  return (
    <Card class="h-full">
      <CardHeader>
        <CardTitle>Social</CardTitle>
        <CardDescription>
          Connect with friends, send messages, and manage your social connections.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Show
          when={connected()}
          fallback={
            <div class="flex h-64 items-center justify-center rounded-lg border border-dashed">
              <div class="text-center text-muted-foreground">
                <p class="mb-2">Not connected to SpacetimeDB</p>
                <p class="text-sm">Please wait for the connection to be established...</p>
              </div>
            </div>
          }
        >
          <Tabs value={activeTab()} onChange={(v) => setActiveTab(v as string)} class="w-full">
            <TabsList class="grid w-full grid-cols-4">
              <TabsTrigger value="friends">Friends</TabsTrigger>
              <TabsTrigger value="requests">
                Requests
                <Show when={pendingRequests() > 0}>
                  <Badge variant="destructive" class="ml-2 h-5 min-w-[1.25rem] px-1">
                    {pendingRequests()}
                  </Badge>
                </Show>
              </TabsTrigger>
              <TabsTrigger value="messages">
                Messages
                <Show when={unreadMessages() > 0}>
                  <Badge variant="default" class="ml-2 h-5 min-w-[1.25rem] px-1">
                    {unreadMessages()}
                  </Badge>
                </Show>
              </TabsTrigger>
              <TabsTrigger value="blocked">Blocked</TabsTrigger>
            </TabsList>

            <TabsContent value="friends" class="mt-4">
              <FriendsList onStartChat={handleStartChat} />
            </TabsContent>

            <TabsContent value="requests" class="mt-4">
              <FriendRequests />
            </TabsContent>

            <TabsContent value="messages" class="mt-4">
              <DirectMessages initialConversationWith={dmTarget()} />
            </TabsContent>

            <TabsContent value="blocked" class="mt-4">
              <BlockedUsers />
            </TabsContent>
          </Tabs>
        </Show>
      </CardContent>
    </Card>
  );
};

export default SocialPanel;
