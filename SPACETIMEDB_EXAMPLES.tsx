/**
 * SpacetimeDB Usage Examples for SolidJS
 * 
 * These are complete, working examples showing how to properly use
 * SpacetimeDB with the official SDK in a SolidJS application.
 */

import { Component, createMemo, createSignal, For, Show, onMount } from "solid-js";
import { useSpacetimeDB } from "~/hooks/useSpacetimeDB";
import type { User } from "~/module_bindings/user_type";
import type { Message } from "~/module_bindings/message_type";
import type { ChatMessage } from "~/module_bindings/chat_message_type";
import type { ChatRoom } from "~/module_bindings/chat_room_type";
import type { Unit } from "~/module_bindings/unit_type";

// Import reducers
import { SetNameReducer } from "~/module_bindings/set_name_reducer";
import { SendMessageReducer } from "~/module_bindings/send_message_reducer";
import { SendChatMessageReducer } from "~/module_bindings/send_chat_message_reducer";
import { CreateChatRoomReducer } from "~/module_bindings/create_chat_room_reducer";
import { MoveUnitReducer } from "~/module_bindings/move_unit_reducer";
import { SetUnitVoteColorReducer } from "~/module_bindings/set_unit_vote_color_reducer";

/**
 * Example 1: Display Current User
 * Shows how to access the current user's identity and data
 */
export const UserProfileExample: Component = () => {
  const { conn, identity, connected } = useSpacetimeDB();

  // Reactive user lookup by identity
  const currentUser = createMemo<User | null>(() => {
    const id = identity();
    const connection = conn();
    if (!id || !connection) return null;

    // Find user by primary key (identity)
    return connection.db.user.identity.find(id) ?? null;
  });

  return (
    <Show when={connected()} fallback={<div>Connecting to SpacetimeDB...</div>}>
      <div class="user-profile">
        <h2>{currentUser()?.name || "Anonymous"}</h2>
        <p>Identity: {identity()?.toHexString().slice(0, 12)}...</p>
        <p>Online: {currentUser()?.online ? "Yes" : "No"}</p>
      </div>
    </Show>
  );
};

/**
 * Example 2: Set User Name
 * Shows how to call a reducer to mutate data
 */
export const SetNameExample: Component = () => {
  const { conn, connected } = useSpacetimeDB();
  const [name, setName] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    const connection = conn();
    if (!connection || !connected()) {
      setError("Not connected to SpacetimeDB");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Call the reducer
      await SetNameReducer.call(connection, { name: name() });
      console.log("Name updated successfully!");
      setName(""); // Clear input
    } catch (err) {
      console.error("Failed to set name:", err);
      setError(err instanceof Error ? err.message : "Failed to set name");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={name()}
        onInput={(e) => setName(e.currentTarget.value)}
        placeholder="Enter your name"
        disabled={loading() || !connected()}
      />
      <button type="submit" disabled={loading() || !connected()}>
        {loading() ? "Saving..." : "Set Name"}
      </button>
      <Show when={error()}>
        <p class="error">{error()}</p>
      </Show>
    </form>
  );
};

/**
 * Example 3: Display All Users
 * Shows how to read and display table data reactively
 */
export const UserListExample: Component = () => {
  const { conn, connected } = useSpacetimeDB();

  // Get all users reactively
  const allUsers = createMemo(() => {
    const connection = conn();
    if (!connection) return [];
    return connection.db.user.getAll();
  });

  // Filter to only online users
  const onlineUsers = createMemo(() => 
    allUsers().filter(user => user.online)
  );

  return (
    <div>
      <h3>Online Users ({onlineUsers().length})</h3>
      <Show when={connected()} fallback={<div>Connecting...</div>}>
        <For each={onlineUsers()} fallback={<div>No users online</div>}>
          {user => (
            <div class="user-item">
              {user.name || user.identity.toHexString().slice(0, 8)}
            </div>
          )}
        </For>
      </Show>
    </div>
  );
};

/**
 * Example 4: Simple Chat
 * Shows how to display messages and send new ones
 */
export const SimpleChatExample: Component = () => {
  const { conn, identity, connected } = useSpacetimeDB();
  const [messageText, setMessageText] = createSignal("");

  // Get all messages, sorted by timestamp
  const messages = createMemo(() => {
    const connection = conn();
    if (!connection) return [];

    return connection.db.message
      .getAll()
      .sort((a, b) => a.sent.compare(b.sent));
  });

  // Get all users for name lookup
  const users = createMemo(() => {
    const connection = conn();
    if (!connection) return new Map();

    const userMap = new Map();
    for (const user of connection.db.user.getAll()) {
      userMap.set(user.identity.toHexString(), user);
    }
    return userMap;
  });

  const sendMessage = async () => {
    const connection = conn();
    if (!connection || !messageText().trim()) return;

    try {
      await SendMessageReducer.call(connection, { text: messageText() });
      setMessageText("");
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  return (
    <div class="chat-container">
      <div class="messages">
        <For each={messages()}>
          {message => {
            const sender = users().get(message.sender.toHexString());
            return (
              <div class="message">
                <strong>{sender?.name || "Anonymous"}: </strong>
                <span>{message.text}</span>
                <small>{message.sent.toDate().toLocaleTimeString()}</small>
              </div>
            );
          }}
        </For>
      </div>

      <div class="input-area">
        <input
          type="text"
          value={messageText()}
          onInput={(e) => setMessageText(e.currentTarget.value)}
          onKeyPress={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Type a message..."
          disabled={!connected()}
        />
        <button onClick={sendMessage} disabled={!connected()}>
          Send
        </button>
      </div>
    </div>
  );
};

/**
 * Example 5: Table Subscriptions with Callbacks
 * Shows how to react to real-time table updates
 */
export const RealtimeUnitsExample: Component<{ roomId: number }> = (props) => {
  const { conn, connected } = useSpacetimeDB();
  const [units, setUnits] = createSignal<Map<number, Unit>>(new Map());

  onMount(() => {
    const connection = conn();
    if (!connection || !connected()) return;

    // Subscribe to unit insertions
    connection.db.unit.onInsert((ctx, unit) => {
      if (unit.roomId === props.roomId) {
        setUnits(prev => new Map(prev).set(unit.id, unit));
        console.log("Unit added:", unit.id);
      }
    });

    // Subscribe to unit updates
    connection.db.unit.onUpdate((ctx, oldUnit, newUnit) => {
      if (newUnit.roomId === props.roomId) {
        setUnits(prev => new Map(prev).set(newUnit.id, newUnit));
        console.log("Unit updated:", newUnit.id);
      }
    });

    // Subscribe to unit deletions
    connection.db.unit.onDelete((ctx, unit) => {
      setUnits(prev => {
        const newMap = new Map(prev);
        newMap.delete(unit.id);
        return newMap;
      });
      console.log("Unit removed:", unit.id);
    });

    // Load initial data
    const roomUnits = connection.db.unit
      .getAll()
      .filter(u => u.roomId === props.roomId);
    
    setUnits(new Map(roomUnits.map(u => [u.id, u])));
  });

  return (
    <div>
      <h3>Units in Room {props.roomId} ({units().size})</h3>
      <For each={Array.from(units().values())}>
        {unit => (
          <div class="unit-item">
            Unit #{unit.id} - {unit.unitType} - Owner: {unit.ownerId}
          </div>
        )}
      </For>
    </div>
  );
};

/**
 * Example 6: Chat Room System
 * Shows a more complex example with multiple tables
 */
export const ChatRoomExample: Component = () => {
  const { conn, identity, connected } = useSpacetimeDB();
  const [currentRoomId, setCurrentRoomId] = createSignal<string | null>(null);
  const [newRoomName, setNewRoomName] = createSignal("");
  const [messageText, setMessageText] = createSignal("");

  // Get all chat rooms
  const rooms = createMemo(() => {
    const connection = conn();
    if (!connection) return [];
    return connection.db.chatRoom.getAll();
  });

  // Get messages for current room
  const roomMessages = createMemo(() => {
    const connection = conn();
    const roomId = currentRoomId();
    if (!connection || !roomId) return [];

    return connection.db.chatMessage
      .getAll()
      .filter(m => m.roomId === roomId)
      .sort((a, b) => a.timestamp.compare(b.timestamp));
  });

  const createRoom = async () => {
    const connection = conn();
    if (!connection || !newRoomName().trim()) return;

    try {
      await CreateChatRoomReducer.call(connection, { name: newRoomName() });
      setNewRoomName("");
    } catch (err) {
      console.error("Failed to create room:", err);
    }
  };

  const sendMessage = async () => {
    const connection = conn();
    const roomId = currentRoomId();
    if (!connection || !roomId || !messageText().trim()) return;

    try {
      await SendChatMessageReducer.call(connection, {
        roomId,
        text: messageText(),
        roundNumber: null,
      });
      setMessageText("");
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  return (
    <div class="chat-room-container">
      <div class="room-list">
        <h3>Rooms</h3>
        <div class="create-room">
          <input
            type="text"
            value={newRoomName()}
            onInput={(e) => setNewRoomName(e.currentTarget.value)}
            placeholder="New room name"
          />
          <button onClick={createRoom}>Create</button>
        </div>
        <For each={rooms()}>
          {room => (
            <button
              class={currentRoomId() === room.id ? "active" : ""}
              onClick={() => setCurrentRoomId(room.id)}
            >
              {room.name}
            </button>
          )}
        </For>
      </div>

      <Show when={currentRoomId()}>
        <div class="room-chat">
          <div class="messages">
            <For each={roomMessages()}>
              {message => (
                <div class="message">
                  <strong>{message.sender.toHexString().slice(0, 8)}: </strong>
                  <span>{message.text}</span>
                </div>
              )}
            </For>
          </div>
          <div class="input">
            <input
              type="text"
              value={messageText()}
              onInput={(e) => setMessageText(e.currentTarget.value)}
              onKeyPress={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type a message..."
            />
            <button onClick={sendMessage}>Send</button>
          </div>
        </div>
      </Show>
    </div>
  );
};

/**
 * Example 7: Game Actions
 * Shows how to call game-specific reducers
 */
export const GameActionsExample: Component<{ unitId: number }> = (props) => {
  const { conn, connected } = useSpacetimeDB();

  const moveUnit = async (x: number, y: number) => {
    const connection = conn();
    if (!connection) return;

    try {
      await MoveUnitReducer.call(connection, {
        unitId: props.unitId,
        targetPosition: { x, y },
      });
    } catch (err) {
      console.error("Failed to move unit:", err);
    }
  };

  const setVoteColor = async (color: "red" | "blue") => {
    const connection = conn();
    if (!connection) return;

    try {
      await SetUnitVoteColorReducer.call(connection, {
        unitId: props.unitId,
        color,
      });
    } catch (err) {
      console.error("Failed to set vote color:", err);
    }
  };

  return (
    <div>
      <button onClick={() => moveUnit(100, 100)}>Move to (100, 100)</button>
      <button onClick={() => setVoteColor("red")}>Vote Red</button>
      <button onClick={() => setVoteColor("blue")}>Vote Blue</button>
    </div>
  );
};



