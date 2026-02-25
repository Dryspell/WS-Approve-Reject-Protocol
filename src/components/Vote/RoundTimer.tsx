import { Component, createSignal, onMount, onCleanup, Show, untrack } from "solid-js";
import { Badge } from "~/components/ui/badge";

interface RoundTimerProps {
  roundNumber: number;
  roundStartTime: bigint | undefined;
  roundDuration?: number; // Duration in seconds (default 120s = 2 minutes)
  onRoundEnd?: () => void;
}

type GamePhase = "voting" | "action" | "resolution";

const RoundTimer: Component<RoundTimerProps> = (props) => {
  const duration = () => props.roundDuration || 120; // 2 minutes default
  const [timeRemaining, setTimeRemaining] = createSignal(duration());
  const [phase, setPhase] = createSignal<GamePhase>("voting");
  const [isWarning, setIsWarning] = createSignal(false);

  let interval: number | undefined;

  onMount(() => {
    // Update timer every second
    interval = setInterval(() => {
      untrack(() => {
        if (!props.roundStartTime) {
          setTimeRemaining(duration());
          return;
        }

        // Calculate time elapsed since round start
        const now = BigInt(Date.now());
        const elapsed = Number((now - props.roundStartTime) / 1000n); // Convert to seconds
        const remaining = Math.max(0, duration() - elapsed);
        
        setTimeRemaining(remaining);

        // Determine phase based on time remaining
        const percentRemaining = (remaining / duration()) * 100;
        if (percentRemaining > 66) {
          setPhase("voting");
        } else if (percentRemaining > 33) {
          setPhase("action");
        } else {
          setPhase("resolution");
        }

        // Warning if less than 30 seconds
        setIsWarning(remaining <= 30 && remaining > 0);

        // Round ended
        if (remaining === 0) {
          props.onRoundEnd?.();
          clearInterval(interval);
        }
      });
    }, 1000) as unknown as number;
  });

  onCleanup(() => {
    if (interval) clearInterval(interval);
  });

  const formatTime = (seconds: number): string => {
    const totalSecs = Math.floor(seconds);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getPhaseColor = () => {
    switch (phase()) {
      case "voting":
        return "bg-blue-500";
      case "action":
        return "bg-green-500";
      case "resolution":
        return "bg-orange-500";
    }
  };

  const getPhaseLabel = () => {
    switch (phase()) {
      case "voting":
        return "🗳️ Voting Phase";
      case "action":
        return "⚡ Action Phase";
      case "resolution":
        return "📊 Resolution Phase";
    }
  };

  const progressPercent = () => (timeRemaining() / duration()) * 100;

  return (
    <div class="flex items-center gap-2">
      {/* Compact circular timer */}
      <div class="relative h-10 w-10 flex-shrink-0">
        <svg class="h-full w-full -rotate-90 transform">
          <circle cx="20" cy="20" r="16" stroke="currentColor" stroke-width="3" fill="none" class="text-slate-200" />
          <circle
            cx="20" cy="20" r="16"
            stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"
            class={getPhaseColor()}
            classList={{ "text-red-500": isWarning() }}
            style={{
              "stroke-dasharray": "100.53",
              "stroke-dashoffset": `${100.53 * (1 - progressPercent() / 100)}`,
              transition: "stroke-dashoffset 1s linear",
            }}
          />
        </svg>
      </div>
      <div class="flex flex-col">
        <div
          class="text-lg font-bold leading-tight"
          classList={{ "text-red-500 animate-pulse": isWarning() }}
        >
          {formatTime(timeRemaining())}
        </div>
        <Badge
          variant={isWarning() ? "destructive" : "outline"}
          class="px-1 py-0 text-[10px] leading-tight"
        >
          {getPhaseLabel()}
        </Badge>
      </div>
      <Show when={!props.roundStartTime}>
        <span class="text-xs text-slate-400">Not started</span>
      </Show>
    </div>
  );
};

export default RoundTimer;

