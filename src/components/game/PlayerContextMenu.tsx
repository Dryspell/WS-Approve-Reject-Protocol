import { type Component, Show } from "solid-js";

export interface PlayerMenuTarget {
  playerId: string;
  name: string;
  unitId?: number;
  isSelf: boolean;
  listedPrice?: number;
  x: number;
  y: number;
}

interface PlayerContextMenuProps {
  target: PlayerMenuTarget;
  onWhisper: () => void;
  onOfferTrade: () => void;
  onBuyVote?: () => void;
  onClose: () => void;
}

const PlayerContextMenu: Component<PlayerContextMenuProps> = (props) => {
  return (
    <div
      class="fixed z-50 w-48 rounded-lg border border-white/15 bg-slate-900/95 p-1 shadow-2xl backdrop-blur-xl"
      style={{
        left: `${Math.min(props.target.x, typeof window !== "undefined" ? window.innerWidth - 200 : props.target.x)}px`,
        top: `${Math.min(props.target.y, typeof window !== "undefined" ? window.innerHeight - 180 : props.target.y)}px`,
      }}
      data-testid="player-context-menu"
    >
      <div class="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/40">
        {props.target.isSelf ? "Your unit" : props.target.name}
      </div>
      <Show when={!props.target.isSelf}>
        <button
          class="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-white/80 hover:bg-white/10"
          onClick={props.onWhisper}
        >
          <span>💬</span> Whisper
        </button>
        <button
          class="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-white/80 hover:bg-white/10"
          onClick={props.onOfferTrade}
        >
          <span>🤝</span> Offer to buy a vote
        </button>
        <Show when={props.target.listedPrice != null && props.onBuyVote}>
          <button
            class="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-amber-200 hover:bg-amber-500/15"
            onClick={props.onBuyVote}
          >
            <span>🎫</span> Buy listed vote (${props.target.listedPrice!.toFixed(2)})
          </button>
        </Show>
      </Show>
      <Show when={props.target.isSelf}>
        <p class="px-2 py-1.5 text-[10px] text-white/40">
          Click a color below to cast, or List to sell this vote.
        </p>
      </Show>
      <button
        class="mt-0.5 flex w-full items-center gap-2 rounded px-2 py-1 text-left text-[10px] text-white/35 hover:bg-white/5"
        onClick={props.onClose}
      >
        Close
      </button>
    </div>
  );
};

export default PlayerContextMenu;
