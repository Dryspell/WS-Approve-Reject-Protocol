import { Component, createSignal, onMount, onCleanup, Show, untrack } from "solid-js";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Progress } from "~/components/ui/progress";
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
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
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
    <Card
      class="transition-all"
      classList={{
        "border-red-500 shadow-lg shadow-red-500/20": isWarning(),
      }}
    >
      <CardHeader class="pb-3">
        <CardTitle class="flex items-center justify-between text-base">
          <span>Round {props.roundNumber}</span>
          <Badge variant={isWarning() ? "destructive" : "default"}>
            {getPhaseLabel()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent class="space-y-3">
        {/* Circular Progress Representation */}
        <div class="flex items-center justify-center">
          <div class="relative h-32 w-32">
            {/* Background circle */}
            <svg class="h-full w-full -rotate-90 transform">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                stroke-width="8"
                fill="none"
                class="text-gray-200"
              />
              {/* Progress circle */}
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                stroke-width="8"
                fill="none"
                stroke-linecap="round"
                class={getPhaseColor()}
                classList={{
                  "text-red-500": isWarning(),
                  "animate-pulse": isWarning(),
                }}
                style={{
                  "stroke-dasharray": "351.86",
                  "stroke-dashoffset": `${351.86 * (1 - progressPercent() / 100)}`,
                  transition: "stroke-dashoffset 1s linear",
                }}
              />
            </svg>
            {/* Timer text in center */}
            <div class="absolute inset-0 flex flex-col items-center justify-center">
              <div
                class="text-3xl font-bold"
                classList={{
                  "text-red-500": isWarning(),
                  "animate-pulse": isWarning(),
                }}
              >
                {formatTime(timeRemaining())}
              </div>
              <div class="text-xs text-gray-500">remaining</div>
            </div>
          </div>
        </div>

        {/* Linear progress bar for additional visual feedback */}
        <div>
          <Progress
            value={progressPercent()}
            class="h-2"
            classList={{
              "[&>div]:bg-red-500": isWarning(),
            }}
          />
        </div>

        {/* Phase descriptions */}
        <div class="space-y-1 text-xs text-gray-600">
          <Show when={phase() === "voting"}>
            <p>⏰ Time to set vote colors and prepare strategy</p>
          </Show>
          <Show when={phase() === "action"}>
            <p>⚡ Execute trades and unit actions</p>
          </Show>
          <Show when={phase() === "resolution"}>
            <p>📊 Final moments - prepare for vote resolution!</p>
          </Show>
        </div>

        {/* Warning message */}
        <Show when={isWarning()}>
          <div class="animate-pulse rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">
            ⚠️ Less than 30 seconds remaining!
          </div>
        </Show>

        {/* Not started message */}
        <Show when={!props.roundStartTime}>
          <div class="rounded border border-gray-200 bg-gray-50 p-2 text-xs text-gray-600">
            ⏸️ Round not started yet
          </div>
        </Show>
      </CardContent>
    </Card>
  );
};

export default RoundTimer;

