import { Component, For, Show } from "solid-js";
import { ScrollArea } from "~/components/ui/scroll-area";
import type { GameEvent, User } from "~/module_bindings/types";

interface ActivityFeedProps {
  events: GameEvent[];
  roomId: number;
  players: User[];
}

function getEventIcon(eventType: string): string {
  if (eventType.includes("elimination")) return "❌";
  if (eventType.includes("vote")) return "🗳️";
  if (eventType.includes("round_start")) return "🔔";
  if (eventType.includes("round_end")) return "⏱️";
  if (eventType.includes("game_start")) return "🎮";
  if (eventType.includes("game_end")) return "🏁";
  if (eventType.includes("trade")) return "🔄";
  if (eventType.includes("purchase")) return "🛒";
  if (eventType.includes("harvest")) return "🌾";
  if (eventType.includes("guarantee")) return "🛡️";
  if (eventType.includes("pot")) return "🏆";
  if (eventType.includes("buy_in")) return "💵";
  if (eventType.includes("join")) return "👋";
  if (eventType.includes("leave")) return "🚪";
  return "📢";
}

function resolvePlayerName(id: string, players: User[]): string {
  const player = players.find((u) => u.identity.toHexString() === id);
  return player?.name || id.slice(0, 8);
}

function formatActivityEvent(event: GameEvent, players: User[]): string {
  const src = event.sourceId ? resolvePlayerName(event.sourceId, players) : "Unknown";
  const tgt = event.targetId ? resolvePlayerName(event.targetId, players) : "";
  const val = event.value;

  switch (event.eventType) {
    case "round_start":      return `Round ${val} started`;
    case "round_end":        return `Round ${val} ended`;
    case "game_start":       return "Game started";
    case "game_end":         return "Game ended";
    case "player_join":      return `${src} joined`;
    case "player_leave":     return `${src} left`;
    case "elimination":      return `${src} was eliminated`;
    case "vote_cast":        return tgt ? `${src} voted against ${tgt}` : `${src} cast a vote`;
    case "vote_color_set":   return `${src} set vote color`;
    case "trade_listed":     return `${src} listed a trade offer`;
    case "trade_accepted":   return tgt ? `${tgt} accepted ${src}'s trade` : `Trade accepted`;
    case "trade_cancelled":  return `${src} cancelled a trade`;
    case "purchase":         return val ? `${src} made a purchase for $${val}` : `${src} made a purchase`;
    case "harvest":          return val ? `${src} harvested ${val} resources` : `${src} harvested`;
    case "guarantee_bought": return `${src} bought a guarantee`;
    case "pot_won":          return val ? `${src} won $${val}` : `${src} won the pot`;
    case "buy_in":           return val ? `${src} paid $${val} buy-in` : `${src} paid buy-in`;
    default:
      return tgt
        ? `${src} → ${tgt}${val ? ` (${val})` : ""} [${event.eventType}]`
        : `${src}${val ? ` (${val})` : ""} [${event.eventType}]`;
  }
}

function formatTimestamp(ts: bigint): string {
  // GameEvent.timestamp is i64 microseconds since epoch
  const date = new Date(Number(ts) / 1000);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

const ActivityFeed: Component<ActivityFeedProps> = (props) => {
  const roomIdStr = () => props.roomId.toString();

  const sortedEvents = () =>
    props.events
      .filter((e) => e.roomId === roomIdStr())
      .slice()
      .sort((a, b) => (b.timestamp > a.timestamp ? 1 : b.timestamp < a.timestamp ? -1 : 0));

  return (
    <div class="h-full flex flex-col">
      <Show when={sortedEvents().length === 0}>
        <div class="flex h-full items-center justify-center text-xs text-white/30">
          No activity yet — game events will appear here
        </div>
      </Show>
      <Show when={sortedEvents().length > 0}>
        <ScrollArea class="flex-1">
          <div class="space-y-0.5 p-2">
            <For each={sortedEvents()}>
              {(event) => (
                <div class="flex items-start gap-2 rounded px-2 py-1 text-xs hover:bg-white/5 transition-colors">
                  <span class="mt-px shrink-0 text-sm leading-none">{getEventIcon(event.eventType)}</span>
                  <span class="flex-1 text-white/80 leading-snug">
                    {formatActivityEvent(event, props.players)}
                  </span>
                  <span class="shrink-0 text-white/30 tabular-nums">
                    {formatTimestamp(event.timestamp)}
                  </span>
                </div>
              )}
            </For>
          </div>
        </ScrollArea>
      </Show>
    </div>
  );
};

export default ActivityFeed;
