import { Component, For, Show, createMemo } from "solid-js";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "~/components/ui/carousel";

interface VoteRecord {
  unitId: number;
  color: string;
  survived: boolean;
}

interface TradeEvent {
  unitId: number;
  fromPlayer: string;
  toPlayer: string;
  price: number;
  timestamp: number;
}

interface RoundData {
  roundNumber: number;
  votes: VoteRecord[];
  trades: TradeEvent[];
  eliminatedUnits: number[];
  voteDistribution: Record<string, number>;
  minorityColor: string | null;
}

interface RoundHistoryProps {
  rounds: RoundData[];
  currentRound: number;
}

const RoundHistory: Component<RoundHistoryProps> = (props) => {
  const sortedRounds = createMemo(() => {
    return [...props.rounds].sort((a, b) => b.roundNumber - a.roundNumber);
  });

  const getVoteDistribution = (round: RoundData) => {
    return Object.entries(round.voteDistribution)
      .sort(([, a], [, b]) => b - a)
      .map(([color, count]) => ({ color, count }));
  };

  const getTotalVotes = (round: RoundData) => {
    return Object.values(round.voteDistribution).reduce((sum, count) => sum + count, 0);
  };

  const getColorDot = (color: string) => {
    return (
      <div
        class="h-3 w-3 rounded-full border border-gray-300"
        style={{ "background-color": color || "#ccc" }}
      />
    );
  };

  const RoundCard: Component<{ round: RoundData }> = (roundProps) => {
    const isCurrent = () => roundProps.round.roundNumber === props.currentRound;
    const distribution = createMemo(() => getVoteDistribution(roundProps.round));
    const totalVotes = getTotalVotes(roundProps.round);

    return (
      <Card
        class="h-full"
        classList={{
          "border-blue-500 shadow-lg": isCurrent(),
        }}
      >
        <CardHeader class="pb-3">
          <CardTitle class="flex items-center justify-between text-base">
            <span>Round {roundProps.round.roundNumber}</span>
            <Show when={isCurrent()}>
              <Badge variant="default">Current</Badge>
            </Show>
          </CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          {/* Vote Distribution */}
          <div>
            <p class="mb-2 text-sm font-medium text-gray-700">Vote Distribution</p>
            <div class="space-y-2">
              <For each={distribution()}>
                {(item) => {
                  const percentage = totalVotes > 0 ? (item.count / totalVotes) * 100 : 0;
                  const isMinority = item.color === roundProps.round.minorityColor;

                  return (
                    <div class="space-y-1">
                      <div class="flex items-center justify-between text-sm">
                        <div class="flex items-center gap-2">
                          {getColorDot(item.color)}
                          <span class="capitalize">{item.color}</span>
                          {isMinority && (
                            <Badge variant="default" class="text-xs">
                              ✓ Minority
                            </Badge>
                          )}
                        </div>
                        <span class="font-semibold">{item.count}</span>
                      </div>
                      <div class="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                        <div
                          class="h-full transition-all"
                          style={{
                            width: `${percentage}%`,
                            "background-color": item.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                }}
              </For>
            </div>
          </div>

          {/* Eliminated Units */}
          <Show when={roundProps.round.eliminatedUnits.length > 0}>
            <div>
              <p class="mb-2 text-sm font-medium text-gray-700">
                Eliminated Units ({roundProps.round.eliminatedUnits.length})
              </p>
              <div class="flex flex-wrap gap-1">
                <For each={roundProps.round.eliminatedUnits}>
                  {(unitId) => (
                    <Badge variant="destructive" class="text-xs">
                      ☠️ Unit #{unitId}
                    </Badge>
                  )}
                </For>
              </div>
            </div>
          </Show>

          {/* Trade Events */}
          <Show when={roundProps.round.trades.length > 0}>
            <div>
              <p class="mb-2 text-sm font-medium text-gray-700">
                Trades ({roundProps.round.trades.length})
              </p>
              <ScrollArea class="h-24">
                <div class="space-y-1 pr-2">
                  <For each={roundProps.round.trades}>
                    {(trade) => (
                      <div class="rounded border p-2 text-xs">
                        <div class="flex items-center justify-between">
                          <span>
                            Unit #{trade.unitId}
                          </span>
                          <Badge variant="outline" class="text-xs">
                            ${trade.price}
                          </Badge>
                        </div>
                        <div class="mt-1 text-gray-500">
                          {trade.fromPlayer} → {trade.toPlayer}
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </ScrollArea>
            </div>
          </Show>

          {/* No activity message */}
          <Show when={roundProps.round.eliminatedUnits.length === 0 && roundProps.round.trades.length === 0}>
            <div class="rounded border border-dashed p-3 text-center text-xs text-gray-500">
              No eliminations or trades this round
            </div>
          </Show>
        </CardContent>
      </Card>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center justify-between">
          <span>Round History</span>
          <Badge variant="outline">{props.rounds.length} rounds</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Show
          when={sortedRounds().length > 0}
          fallback={
            <div class="rounded border border-dashed p-8 text-center text-sm text-gray-500">
              No rounds completed yet. History will appear here.
            </div>
          }
        >
          {/* Carousel for navigating rounds */}
          <Carousel
            opts={{
              align: "start",
              loop: false,
            }}
            class="w-full"
          >
            <CarouselContent>
              <For each={sortedRounds()}>
                {(round) => (
                  <CarouselItem class="md:basis-1/2 lg:basis-1/3">
                    <div class="p-1">
                      <RoundCard round={round} />
                    </div>
                  </CarouselItem>
                )}
              </For>
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>

          {/* Summary Stats */}
          <div class="mt-4 grid grid-cols-3 gap-2 text-center">
            <div class="rounded border p-2">
              <div class="text-2xl font-bold">{props.rounds.length}</div>
              <div class="text-xs text-gray-500">Total Rounds</div>
            </div>
            <div class="rounded border p-2">
              <div class="text-2xl font-bold">
                {props.rounds.reduce((sum, r) => sum + r.eliminatedUnits.length, 0)}
              </div>
              <div class="text-xs text-gray-500">Eliminations</div>
            </div>
            <div class="rounded border p-2">
              <div class="text-2xl font-bold">
                {props.rounds.reduce((sum, r) => sum + r.trades.length, 0)}
              </div>
              <div class="text-xs text-gray-500">Total Trades</div>
            </div>
          </div>
        </Show>
      </CardContent>
    </Card>
  );
};

export default RoundHistory;

