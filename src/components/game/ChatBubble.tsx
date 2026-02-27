import { Component, createSignal, For, onCleanup, onMount } from "solid-js";
import type { ChatMessage, User } from "~/module_bindings/types";
import { useSpacetimeDB } from "~/hooks/useSpacetimeDB";

interface BubbleEntry {
  id: string;
  senderName: string;
  text: string;
  expiresAt: number;
}

interface FloatingChatBubblesProps {
  roomId: number;
  players: User[];
}

const BUBBLE_DURATION_MS = 8000;
const MAX_BUBBLES = 4;

export const FloatingChatBubbles: Component<FloatingChatBubblesProps> = (props) => {
  const { conn } = useSpacetimeDB();
  const [bubbles, setBubbles] = createSignal<BubbleEntry[]>([]);
  const chatRoomId = () => `game_${props.roomId}`;

  const resolveName = (sender: { toHexString: () => string }) => {
    const hex = sender.toHexString();
    return props.players.find((u) => u.identity.toHexString() === hex)?.name || hex.slice(0, 8);
  };

  const addBubble = (msg: ChatMessage) => {
    if (msg.roomId !== chatRoomId()) return;
    const entry: BubbleEntry = {
      id: msg.id,
      senderName: resolveName(msg.sender),
      text: msg.text,
      expiresAt: Date.now() + BUBBLE_DURATION_MS,
    };
    setBubbles((prev) => [...prev.slice(-(MAX_BUBBLES - 1)), entry]);

    setTimeout(() => {
      setBubbles((prev) => prev.filter((b) => b.id !== entry.id));
    }, BUBBLE_DURATION_MS);
  };

  onMount(() => {
    const connection = conn();
    if (!connection) return;
    connection.db.chat_message.onInsert((_ctx, msg) => addBubble(msg));
  });

  return (
    <div class="absolute bottom-32 left-4 z-20 flex flex-col-reverse gap-1 pointer-events-none">
      <For each={bubbles()}>
        {(bubble) => (
          <div
            class="flex items-start gap-2 max-w-xs rounded-xl bg-black/70 backdrop-blur-sm border border-white/10 px-3 py-2 text-sm shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            <span class="font-semibold text-white/90 shrink-0">{bubble.senderName}:</span>
            <span class="text-white/75 break-words">{bubble.text}</span>
          </div>
        )}
      </For>
    </div>
  );
};

export default FloatingChatBubbles;
