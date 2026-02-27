import { Component, createSignal, For, Show, createEffect } from "solid-js";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Progress } from "~/components/ui/progress";
import type { Transaction, GameEvent } from "~/module_bindings/types";

function formatGameEvent(event: GameEvent): string {
  const src = event.sourceId ? event.sourceId.slice(0, 8) : 'unknown';
  const tgt = event.targetId ? event.targetId.slice(0, 8) : '';
  const val = event.value;

  switch (event.eventType) {
    case 'round_start':       return `Round ${val} started`;
    case 'round_end':         return `Round ${val} ended`;
    case 'game_start':        return `Game started`;
    case 'game_end':          return `Game ended`;
    case 'player_join':       return `${src} joined the game`;
    case 'player_leave':      return `${src} left the game`;
    case 'elimination':       return `${src} was eliminated`;
    case 'vote_cast':         return tgt ? `${src} voted against ${tgt}` : `${src} cast a vote`;
    case 'vote_color_set':    return `${src} set vote color`;
    case 'trade_listed':      return `${src} listed a trade offer`;
    case 'trade_accepted':    return tgt ? `${tgt} accepted trade from ${src}` : `Trade accepted by ${src}`;
    case 'trade_cancelled':   return `${src} cancelled trade offer`;
    case 'purchase':          return val ? `${src} made a purchase for $${val}` : `${src} made a purchase`;
    case 'harvest':           return val ? `${src} harvested ${val} resources` : `${src} harvested resources`;
    case 'guarantee_bought':  return `${src} bought a guarantee`;
    case 'pot_won':           return val ? `${src} won $${val} from the pot` : `${src} won the pot`;
    case 'buy_in':            return val ? `${src} paid $${val} buy-in` : `${src} paid buy-in`;
    default:
      return tgt
        ? `${src} → ${tgt}${val ? ` (${val})` : ''} [${event.eventType}]`
        : `${src}${val ? ` (${val})` : ''} [${event.eventType}]`;
  }
}

interface ReplayEvent {
  timestamp: number;
  type: string;
  description: string;
  details: any;
  icon: string;
}

interface ReplayViewerProps {
  roomId: number;
  transactions: Transaction[];
  gameEvents: GameEvent[];
}

export const ReplayViewer: Component<ReplayViewerProps> = (props) => {
  const [currentTime, setCurrentTime] = createSignal(0);
  const [isPlaying, setIsPlaying] = createSignal(false);
  const [playbackSpeed, setPlaybackSpeed] = createSignal(1);
  const [events, setEvents] = createSignal<ReplayEvent[]>([]);
  const [maxTime, setMaxTime] = createSignal(0);

  createEffect(() => {
    // Build unified timeline from transactions and events
    const timeline: ReplayEvent[] = [];

    // Add transactions
    props.transactions.forEach((tx) => {
      if (tx.roomId !== props.roomId) return;

      const timestamp = tx.timestamp.seconds * 1000 + tx.timestamp.nanoseconds / 1000000;
      
      let description = '';
      let icon = '💰';
      
      switch (tx.transactionType) {
        case 'vote_sale':
          description = `${tx.fromPlayer.slice(0, 8)} sold vote to ${tx.toPlayer.slice(0, 8)} for $${tx.amount}`;
          icon = '🔄';
          break;
        case 'guarantee_purchase':
          description = `${tx.toPlayer.slice(0, 8)} bought guarantee for $${tx.amount}`;
          icon = '🛡️';
          break;
        case 'pot_distribution':
          description = `${tx.toPlayer.slice(0, 8)} won $${tx.amount} from pot`;
          icon = '🏆';
          break;
        case 'buy_in':
          description = `${tx.fromPlayer.slice(0, 8)} paid buy-in of $${tx.amount}`;
          icon = '💵';
          break;
      }

      timeline.push({
        timestamp,
        type: tx.transactionType,
        description,
        details: tx,
        icon,
      });
    });

    // Add game events
    props.gameEvents.forEach((event) => {
      if (event.roomId !== props.roomId) return;

      // GameEvent.timestamp is a raw i64 (microseconds since epoch)
      const timestamp = Number(event.timestamp) / 1000;
      
      timeline.push({
        timestamp,
        type: event.eventType,
        description: formatGameEvent(event),
        details: event,
        icon: event.eventType.includes('elimination') ? '❌' :
              event.eventType.includes('vote') ? '🗳️' :
              event.eventType.includes('round') ? '⏱️' :
              event.eventType.includes('trade') ? '🔄' :
              event.eventType.includes('harvest') ? '🌾' :
              event.eventType.includes('purchase') ? '🛒' :
              event.eventType.includes('game') ? '🎮' : '📢',
      });
    });

    // Sort by timestamp
    timeline.sort((a, b) => a.timestamp - b.timestamp);
    setEvents(timeline);

    // Set max time
    if (timeline.length > 0) {
      const firstTime = timeline[0].timestamp;
      const lastTime = timeline[timeline.length - 1].timestamp;
      setMaxTime(lastTime - firstTime);
    }
  });

  const getVisibleEvents = () => {
    const current = currentTime();
    if (events().length === 0) return [];
    
    const startTime = events()[0].timestamp;
    const currentTimestamp = startTime + current;
    
    return events().filter(e => e.timestamp <= currentTimestamp);
  };

  const togglePlayback = () => {
    if (isPlaying()) {
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      playback();
    }
  };

  const playback = () => {
    if (!isPlaying()) return;

    const interval = setInterval(() => {
      if (!isPlaying()) {
        clearInterval(interval);
        return;
      }

      const newTime = currentTime() + 100 * playbackSpeed();
      if (newTime >= maxTime()) {
        setCurrentTime(maxTime());
        setIsPlaying(false);
        clearInterval(interval);
      } else {
        setCurrentTime(newTime);
      }
    }, 100);
  };

  const restart = () => {
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const skip = (direction: 'forward' | 'backward') => {
    const skipAmount = 5000; // 5 seconds
    const newTime = direction === 'forward' 
      ? Math.min(currentTime() + skipAmount, maxTime())
      : Math.max(currentTime() - skipAmount, 0);
    setCurrentTime(newTime);
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  return (
    <Card class="w-full">
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          🎬 Game Replay
        </CardTitle>
      </CardHeader>

      <CardContent>
        <Show when={events().length === 0}>
          <div class="py-8 text-center text-sm text-gray-500">
            No replay data available for this game.
          </div>
        </Show>

        <Show when={events().length > 0}>
          {/* Playback Controls */}
          <div class="space-y-4">
            {/* Progress Bar */}
            <div class="space-y-2">
              <Progress value={maxTime() > 0 ? (currentTime() / maxTime()) * 100 : 0} />
              <div class="flex justify-between text-xs text-gray-600">
                <span>{formatTime(currentTime())}</span>
                <span>{formatTime(maxTime())}</span>
              </div>
            </div>

            {/* Control Buttons */}
            <div class="flex items-center justify-center gap-2">
              <Button size="sm" variant="outline" onClick={restart}>
                ⏮️ Restart
              </Button>
              <Button size="sm" variant="outline" onClick={() => skip('backward')}>
                ⏪ -5s
              </Button>
              <Button size="sm" onClick={togglePlayback}>
                {isPlaying() ? '⏸️ Pause' : '▶️ Play'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => skip('forward')}>
                ⏩ +5s
              </Button>
              
              {/* Playback Speed */}
              <div class="flex gap-1">
                <Button
                  size="sm"
                  variant={playbackSpeed() === 0.5 ? 'default' : 'outline'}
                  onClick={() => setPlaybackSpeed(0.5)}
                >
                  0.5x
                </Button>
                <Button
                  size="sm"
                  variant={playbackSpeed() === 1 ? 'default' : 'outline'}
                  onClick={() => setPlaybackSpeed(1)}
                >
                  1x
                </Button>
                <Button
                  size="sm"
                  variant={playbackSpeed() === 2 ? 'default' : 'outline'}
                  onClick={() => setPlaybackSpeed(2)}
                >
                  2x
                </Button>
              </div>
            </div>

            {/* Event Timeline */}
            <div class="mt-6">
              <h3 class="mb-3 font-semibold">Event Timeline</h3>
              <ScrollArea class="h-[400px]">
                <div class="space-y-2 pr-2">
                  <For each={getVisibleEvents()}>
                    {(event) => (
                      <Card class="transition-all" classList={{
                        'opacity-50': event.timestamp > (events()[0]?.timestamp || 0) + currentTime(),
                      }}>
                        <CardContent class="p-3">
                          <div class="flex items-start gap-3">
                            <div class="text-2xl">{event.icon}</div>
                            <div class="flex-1">
                              <div class="flex items-center gap-2">
                                <Badge variant="outline" class="text-xs">
                                  {event.type}
                                </Badge>
                                <span class="text-xs text-gray-500">
                                  {formatTimestamp(event.timestamp)}
                                </span>
                              </div>
                              <p class="mt-1 text-sm">{event.description}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </For>
                </div>
              </ScrollArea>
            </div>
          </div>
        </Show>

        {/* Info */}
        <div class="mt-4 rounded border border-purple-200 bg-purple-50 p-3 text-xs text-purple-700">
          <p class="font-semibold">🎬 Replay Features:</p>
          <ul class="ml-4 mt-1 list-disc space-y-1">
            <li>Review all transactions and game events</li>
            <li>Adjust playback speed for detailed analysis</li>
            <li>Skip forward/backward to key moments</li>
            <li>See exact timing of all player actions</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReplayViewer;

