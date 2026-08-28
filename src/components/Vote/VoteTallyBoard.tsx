import { type Component, Show } from "solid-js";
import { TID } from "~/lib/test-ids";
import {
  tallyVotes,
  playerFateAtLock,
  colorStance,
  stanceLabel,
  type TallyVote,
  type VoteColor,
} from "~/lib/vote-tally";

interface VoteTallyBoardProps {
  roomVotes: TallyVote[];
  myVotes: TallyVote[];
  /** True only after the round is resolved — other players' colors stay hidden until then. */
  revealed: boolean;
  draggedVote: boolean;
  voteFlashColor: string | null;
  onDragOver: (e: DragEvent) => void;
  onDrop: (color: VoteColor) => void;
  onClick: (color: VoteColor) => void;
}

const VoteTallyBoard: Component<VoteTallyBoardProps> = (props) => {
  const tally = () => tallyVotes(props.revealed ? props.roomVotes : props.myVotes);
  const fate = () => {
    const live = playerFateAtLock(props.myVotes, props.roomVotes);
    if (live === "no_tickets") return "no_tickets";
    return props.revealed ? live : "undecided";
  };
  const myCount = (color: VoteColor) => props.myVotes.filter((v) => v.color === color).length;
  const myUnset = () => props.myVotes.filter((v) => !v.color).length;

  const fateCopy = () => {
    if (!props.revealed) {
      const r = myCount("red");
      const b = myCount("blue");
      const u = myUnset();
      return `Other players' votes stay hidden until the round ends. You have ${r} red, ${b} blue${u ? `, ${u} unplaced` : ""}.`;
    }
    const t = tally();
    const f = fate();
    switch (f) {
      case "survive": {
        const minorityColor = t.minority === "red" || t.minority === "blue" ? t.minority : null;
        const onMinority = minorityColor ? myCount(minorityColor) : 0;
        if (onMinority > 0 && minorityColor) {
          return `If this locked now you survive — you hold ${onMinority} ${minorityColor} (minority) vote${onMinority === 1 ? "" : "s"}.`;
        }
        return "If this locked now you survive.";
      }
      case "eliminated":
        return `If this locked now you're out — you need at least one ${t.minority} (minority) vote. Split or buy one.`;
      case "no_tickets":
        return "You have no votes. Buy one before the round ends or you leave when it settles.";
      case "tie":
        return "If this locked now it's a tie — the game ends and the pot splits by vote count.";
      case "undecided":
        return myUnset() > 0
          ? `You have ${myUnset()} unplaced vote${myUnset() === 1 ? "" : "s"} — they split evenly when the round locks.`
          : "Cast a vote to see whether you'd survive.";
    }
  };

  const Zone = (color: VoteColor) => {
    const t = () => tally();
    const stance = () => colorStance(color, t());
    const count = () => (color === "red" ? t().red : t().blue);
    const mine = () => myCount(color);
    const isRed = color === "red";

    return (
      <div
        data-testid={isRed ? TID.voteRed : TID.voteBlue}
        role="button"
        tabindex="0"
        onDragOver={props.onDragOver}
        onDrop={() => props.onDrop(color)}
        onClick={() => props.onClick(color)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            props.onClick(color);
          }
        }}
        class="flex cursor-pointer flex-col gap-1 rounded-lg border-2 border-dashed px-3 py-2 transition-all active:scale-[0.98]"
        classList={{
          "border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/25 hover:border-red-400/60": isRed,
          "border-blue-500/40 bg-blue-500/10 text-blue-300 hover:bg-blue-500/25 hover:border-blue-400/60": !isRed,
          "border-red-400 bg-red-500/30": isRed && props.draggedVote,
          "border-blue-400 bg-blue-500/30": !isRed && props.draggedVote,
          "animate-vote-flash-red": props.voteFlashColor === "red" && isRed,
          "animate-vote-flash-blue": props.voteFlashColor === "blue" && !isRed,
        }}
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5 text-sm font-semibold">
            <div
              class="h-3 w-3 rounded-full"
              classList={{ "bg-red-500": isRed, "bg-blue-500": !isRed }}
            />
            {isRed ? "Red" : "Blue"}
          </div>
          <span class="text-lg font-bold leading-none tabular-nums">
            {props.revealed ? count() : mine()}
          </span>
        </div>
        <div
          class="text-[10px] font-semibold uppercase tracking-wide"
          classList={{
            "text-rose-300": props.revealed && stance() === "majority",
            "text-emerald-300": props.revealed && stance() === "minority",
            "text-amber-300": props.revealed && stance() === "tie",
            "text-white/35": !props.revealed || stance() === "none",
          }}
        >
          {props.revealed ? stanceLabel(stance()) : "Hidden until round ends"}
        </div>
        <div class="text-[10px] font-normal opacity-70">
          You: {mine()}
          {mine() === 1 ? " vote" : " votes"}
          {" · "}
          {props.draggedVote ? "Drop to cast" : "Click or drop to cast"}
        </div>
      </div>
    );
  };

  return (
    <div class="space-y-2" data-testid={TID.voteTally}>
      <p class="text-center text-[10px] text-white/45">
        <span class="font-semibold text-white/70">Minority color lives.</span>{" "}
        Majority fights in the arena. Unplaced votes split evenly at lock.
      </p>

      <div
        data-testid={TID.fateBanner}
        class="rounded-md border px-2.5 py-1.5 text-center text-[11px] font-medium leading-snug"
        classList={{
          "border-emerald-400/40 bg-emerald-500/15 text-emerald-200": fate() === "survive",
          "border-rose-400/40 bg-rose-500/15 text-rose-200": fate() === "eliminated",
          "border-amber-400/40 bg-amber-500/15 text-amber-200": fate() === "tie" || fate() === "no_tickets",
          "border-white/10 bg-white/5 text-white/55": fate() === "undecided",
        }}
      >
        {fateCopy()}
      </div>

      <Show when={props.revealed && tally().totalCast > 0}>
        <div class="flex h-2 overflow-hidden rounded-full bg-white/10" title="Live vote share">
          <div
            class="h-full bg-red-500 transition-all duration-500"
            style={{ width: `${tally().redShare * 100}%` }}
          />
          <div
            class="h-full bg-blue-500 transition-all duration-500"
            style={{ width: `${tally().blueShare * 100}%` }}
          />
        </div>
      </Show>

      <div class="grid grid-cols-2 gap-2">
        {Zone("red")}
        {Zone("blue")}
      </div>
    </div>
  );
};

export default VoteTallyBoard;
