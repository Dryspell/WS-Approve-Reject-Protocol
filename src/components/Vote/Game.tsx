import { Component, onMount } from "solid-js";
import type { GameRoom } from "~/types/vote";
import { useVoteStore } from "~/stores/voteStore";
import { showToast } from "../ui/toast";
import { DEFAULT_TOAST_DURATION } from "~/lib/timeout-constants";

interface Props {
  room: GameRoom;
  user: {
    id: string;
    name: string;
  };
}

const Game: Component<Props> = (props) => {
  const { voteState, subscribeToVotes, setUnitVoteColor, tradeUnitVote } = useVoteStore();

  onMount(() => {
    subscribeToVotes();
  });

  const handleVoteColorChange = async (unitId: number, color: string) => {
    try {
      await setUnitVoteColor(unitId, color);
      showToast({
        title: "Success",
        description: "Vote color updated",
        duration: DEFAULT_TOAST_DURATION,
      });
    } catch (error) {
      // Error is already handled by withSpacetimeDBErrorHandling
    }
  };

  const handleVoteTrade = async (unitId: number, price: number) => {
    try {
      await tradeUnitVote(unitId, props.user.id, price);
      showToast({
        title: "Success",
        description: "Vote trade completed",
        duration: DEFAULT_TOAST_DURATION,
      });
    } catch (error) {
      // Error is already handled by withSpacetimeDBErrorHandling
    }
  };

  return (
    <div class="flex h-full flex-col gap-4">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-bold">{props.room.name}</h2>
        <div class="text-sm text-gray-500">
          Round {props.room.rounds.length + 1}
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        {/* Unit List */}
        <div class="rounded-lg border p-4">
          <h3 class="mb-4 text-lg font-semibold">Units</h3>
          <div class="space-y-2">
            {Object.entries(voteState.unitVotes).map(([unitId, vote]) => (
              <div class="flex items-center justify-between rounded border p-2">
                <div class="flex items-center gap-2">
                  <div
                    class="h-4 w-4 rounded-full"
                    style={{ "background-color": vote.color || "#ccc" }}
                  />
                  <span>Unit {unitId}</span>
                  {vote.owner && (
                    <span class="text-sm text-gray-500">
                      (Owned by {vote.owner})
                    </span>
                  )}
                </div>
                <div class="flex gap-2">
                  <button
                    onClick={() => handleVoteColorChange(Number(unitId), "red")}
                    class="rounded bg-red-500 px-2 py-1 text-white hover:bg-red-600"
                  >
                    Red
                  </button>
                  <button
                    onClick={() => handleVoteColorChange(Number(unitId), "blue")}
                    class="rounded bg-blue-500 px-2 py-1 text-white hover:bg-blue-600"
                  >
                    Blue
                  </button>
                  {vote.price === null ? (
                    <button
                      onClick={() => handleVoteTrade(Number(unitId), 100)}
                      class="rounded bg-green-500 px-2 py-1 text-white hover:bg-green-600"
                    >
                      Sell
                    </button>
                  ) : (
                    <button
                      onClick={() => handleVoteTrade(Number(unitId), vote.price!)}
                      class="rounded bg-yellow-500 px-2 py-1 text-white hover:bg-yellow-600"
                    >
                      Buy ({vote.price})
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Round History */}
        <div class="rounded-lg border p-4">
          <h3 class="mb-4 text-lg font-semibold">Round History</h3>
          <div class="space-y-2">
            {Object.entries(voteState.roundVotes).map(([roundNumber, round]) => (
              <div class="rounded border p-2">
                <div class="mb-2 font-semibold">Round {roundNumber}</div>
                <div class="space-y-1">
                  {round.votes.map((vote) => (
                    <div class="flex items-center gap-2 text-sm">
                      <div
                        class="h-3 w-3 rounded-full"
                        style={{ "background-color": vote.color }}
                      />
                      <span>Unit {vote.unit_id}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Game;
