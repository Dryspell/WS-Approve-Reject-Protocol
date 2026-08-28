import { type Component, createSignal, Show, onMount } from "solid-js";

const STORAGE_KEY = "nashfall-vote-coach-v1";

interface VoteCoachProps {
  onOpenMarket: () => void;
}

const VoteCoach: Component<VoteCoachProps> = (props) => {
  const [open, setOpen] = createSignal(false);

  onMount(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== "1") setOpen(true);
    } catch {
      setOpen(true);
    }
  });

  const dismiss = () => {
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore quota / private mode */
    }
  };

  return (
    <Show when={open()}>
      <div
        class="mb-2 rounded-xl border border-amber-400/30 bg-black/75 p-3 shadow-2xl backdrop-blur-md"
        data-testid="vote-coach"
      >
        <div class="mb-2 flex items-start justify-between gap-2">
          <p class="text-xs font-semibold text-amber-200">How this round works</p>
          <button
            class="rounded px-1.5 py-0.5 text-[10px] text-white/40 hover:bg-white/10 hover:text-white/70"
            onClick={dismiss}
          >
            Got it
          </button>
        </div>
        <ol class="space-y-1.5 text-[11px] text-white/70">
          <li>
            <span class="font-semibold text-white/90">1. Cast.</span> Click Red or Blue
            (or drag a vote chip). The <em>smaller</em> color stays as votes; the larger
            fights in the arena. Unplaced votes split evenly at lock. Other players'
            colors stay hidden until the round ends.
          </li>
          <li>
            <span class="font-semibold text-white/90">2. Split to stay safe.</span>{" "}
            Holding even one vote on the minority side keeps you in the game.
          </li>
          <li>
            <span class="font-semibold text-white/90">3. Trade.</span> List a vote from
            the chips below, or buy someone else's in the{" "}
            <button
              class="underline decoration-amber-400/60 underline-offset-2 hover:text-amber-200"
              onClick={() => {
                props.onOpenMarket();
                dismiss();
              }}
            >
              Market
            </button>
            . Bought votes become yours to recast.
          </li>
        </ol>
      </div>
    </Show>
  );
};

export default VoteCoach;
