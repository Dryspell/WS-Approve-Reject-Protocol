import { Component, createSignal, For, Show } from "solid-js";
import type { Vote, Transaction, User } from "~/module_bindings/types";
import GuaranteeMarket from "./GuaranteeMarket";
import StrategyPanel from "./StrategyPanel";
import MarketTrends from "./MarketTrends";
import { useSpacetimeDB } from "~/hooks/useSpacetimeDB";
import { ToastHelper } from "~/lib/toast-helpers";
import { sounds } from "~/lib/sounds";
import { resolvePlayerName } from "~/lib/game-utils";

interface VoteMarketPanelProps {
  votes: Vote[];
  transactions: Transaction[];
  roomId: number;
  roundNumber: number;
  currentUserId: string;
  userWalletBalance: number;
  players?: User[];
}

type SortOption = "price-asc" | "price-desc" | "color" | "recent";

const VoteMarketPanel: Component<VoteMarketPanelProps> = (props) => {
  const { conn } = useSpacetimeDB();
  const [sortBy, setSortBy] = createSignal<SortOption>("price-asc");
  const [filterColor, setFilterColor] = createSignal<string | null>(null);
  const [priceInputs, setPriceInputs] = createSignal<Record<number, number>>({});
  const [activeTab, setActiveTab] = createSignal<"market" | "my-votes" | "guarantees" | "history" | "strategy" | "trends">("market");

  const marketListings = () => {
    let listings = props.votes.filter(
      (v) => v.isForSale && v.playerId !== props.currentUserId && v.roomId === props.roomId
    );
    if (filterColor()) {
      listings = listings.filter((v) => v.color === filterColor());
    }
    const sorted = [...listings].sort((a, b) => {
      switch (sortBy()) {
        case "price-asc": return (a.salePrice || 0) - (b.salePrice || 0);
        case "price-desc": return (b.salePrice || 0) - (a.salePrice || 0);
        case "color": return (a.color || "").localeCompare(b.color || "");
        case "recent": return b.id - a.id;
        default: return 0;
      }
    });
    return sorted;
  };

  const myVotes = () => props.votes.filter((v) => v.playerId === props.currentUserId && v.roomId === props.roomId);

  const recentTrades = () =>
    props.transactions
      .filter((t) => t.roomId === props.roomId)
      .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
      .slice(0, 30);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "vote_sale": return "🎫";
      case "guarantee_purchase": return "🛡️";
      case "pot_distribution": return "🏆";
      case "rebuy": return "🔄";
      default: return "💰";
    }
  };

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case "vote_sale": return "Vote Sale";
      case "guarantee_purchase": return "Guarantee";
      case "pot_distribution": return "Pot Distribution";
      case "rebuy": return "Re-Buy";
      default: return type;
    }
  };

  const handleBuyVote = async (voteId: number, price: number) => {
    const connection = conn();
    if (!connection) return;
    if (props.userWalletBalance < price) {
      ToastHelper.warning("Insufficient Funds", `You need $${price} but have $${props.userWalletBalance.toFixed(2)}`);
      return;
    }
    try {
      connection.reducers.transferVoteOwnership({ voteId, buyerId: props.currentUserId, price });
      ToastHelper.success("Vote Purchased", `You bought vote #${voteId} for $${price}`);
      sounds.tradeComplete();
      sounds.moneyReceived();
    } catch {
      ToastHelper.error("Failed to purchase vote");
      sounds.error();
    }
  };

  const handleSetPrice = async (voteId: number) => {
    const connection = conn();
    if (!connection) return;
    const price = priceInputs()[voteId];
    if (price && price > 0) {
      try {
        connection.reducers.setVoteForSale({ voteId, price });
        ToastHelper.success("Vote Listed", `Vote #${voteId} listed for $${price}`);
      } catch {
        ToastHelper.error("Failed to list vote");
      }
    }
  };

  const handleRemoveFromMarket = async (voteId: number) => {
    const connection = conn();
    if (!connection) return;
    try {
      connection.reducers.removeVoteFromSale({ voteId });
      ToastHelper.success("Vote Unlisted", `Vote #${voteId} removed from market`);
    } catch {
      ToastHelper.error("Failed to remove vote");
    }
  };

  const setPriceInput = (voteId: number, value: number) => {
    setPriceInputs((prev) => ({ ...prev, [voteId]: value }));
  };

  const colorDot = (color: string | null) => (
    <div
      class="h-3 w-3 rounded-full"
      classList={{
        "bg-red-500": color === "red",
        "bg-blue-500": color === "blue",
        "bg-white/30": !color,
      }}
    />
  );

  const tabs = [
    { id: "market" as const, label: "Votes", count: () => marketListings().length },
    { id: "my-votes" as const, label: "Mine", count: () => myVotes().length },
    { id: "guarantees" as const, label: "Guar.", count: undefined },
    { id: "strategy" as const, label: "Strategy", count: undefined },
    { id: "trends" as const, label: "Trends", count: undefined },
    { id: "history" as const, label: "History", count: undefined },
  ];

  return (
    <div class="flex h-full flex-col text-white/90">
      {/* Tab bar */}
      <div class="flex border-b border-white/10">
        <For each={tabs}>
          {(tab) => (
            <button
              class="flex-1 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-colors"
              classList={{
                "text-white bg-white/10 border-b-2 border-amber-400": activeTab() === tab.id,
                "text-white/40 hover:text-white/60 hover:bg-white/5": activeTab() !== tab.id,
              }}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              <Show when={tab.count}>
                <span class="ml-1 text-white/30">({tab.count!()})</span>
              </Show>
            </button>
          )}
        </For>
      </div>

      {/* Tab content */}
      <div class="flex-1 overflow-auto p-2">
        {/* Market Listings */}
        <Show when={activeTab() === "market"}>
          <div class="space-y-2">
            <div class="flex gap-1">
              <select
                class="flex-1 rounded border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-white/70 outline-none focus:border-white/20"
                value={sortBy()}
                onChange={(e) => setSortBy(e.currentTarget.value as SortOption)}
              >
                <option value="price-asc">Price: Low → High</option>
                <option value="price-desc">Price: High → Low</option>
                <option value="color">By Color</option>
                <option value="recent">Most Recent</option>
              </select>
              <select
                class="rounded border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-white/70 outline-none focus:border-white/20"
                value={filterColor() || "all"}
                onChange={(e) => setFilterColor(e.currentTarget.value === "all" ? null : e.currentTarget.value)}
              >
                <option value="all">All</option>
                <option value="red">Red</option>
                <option value="blue">Blue</option>
              </select>
            </div>

            <For
              each={marketListings()}
              fallback={
                <div class="flex flex-col items-center gap-2 rounded-lg border border-dashed border-white/10 bg-white/5 p-6 text-center">
                  <div class="text-2xl opacity-30">🏪</div>
                  <p class="text-[10px] text-white/30">
                    {filterColor() ? "Try clearing your color filter" : "No votes listed yet"}
                  </p>
                </div>
              }
            >
              {(vote) => (
                <div class="group flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 transition-all hover:border-amber-400/30 hover:bg-white/10">
                  <div class="flex items-center gap-2">
                    {colorDot(vote.color)}
                    <div>
                      <div class="text-xs font-medium">Vote #{vote.id}</div>
                      <div class="text-[10px] text-white/30">{resolvePlayerName(vote.playerId, conn())}</div>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-bold text-amber-300">${vote.salePrice}</span>
                    <button
                      class="rounded bg-amber-500/80 px-2 py-0.5 text-[10px] font-semibold text-white transition-colors hover:bg-amber-400 disabled:opacity-30"
                      onClick={() => handleBuyVote(vote.id, vote.salePrice!)}
                      disabled={props.userWalletBalance < (vote.salePrice || 0)}
                    >
                      Buy
                    </button>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>

        {/* My Votes */}
        <Show when={activeTab() === "my-votes"}>
          <div class="space-y-2">
            <For
              each={myVotes()}
              fallback={
                <div class="flex flex-col items-center gap-2 rounded-lg border border-dashed border-white/10 bg-white/5 p-6 text-center">
                  <div class="text-2xl opacity-30">🗳️</div>
                  <p class="text-[10px] text-white/30">Your votes appear here when the game starts</p>
                </div>
              }
            >
              {(vote) => (
                <div class="rounded-lg border border-white/10 bg-white/5 p-2.5">
                  <div class="mb-1.5 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      {colorDot(vote.color)}
                      <div>
                        <div class="text-xs font-medium">Vote #{vote.id}</div>
                        <div class="text-[10px] text-white/30">
                          {vote.playerId === vote.originalOwner ? "Original" : "Purchased"}
                        </div>
                      </div>
                    </div>
                    <Show when={vote.isForSale}>
                      <span class="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300 border border-amber-500/30">
                        Listed: ${vote.salePrice}
                      </span>
                    </Show>
                  </div>

                  <Show when={!vote.isForSale}>
                    <div class="flex gap-1.5">
                      <input
                        type="number"
                        min="0.01"
                        step="0.5"
                        placeholder="Price..."
                        value={priceInputs()[vote.id] || ""}
                        onInput={(e) => setPriceInput(vote.id, parseFloat(e.currentTarget.value))}
                        class="flex-1 rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/80 outline-none placeholder:text-white/20 focus:border-white/20"
                      />
                      <button
                        class="rounded bg-green-600/70 px-2 py-1 text-[10px] font-semibold text-white hover:bg-green-500/80 disabled:opacity-30"
                        onClick={() => handleSetPrice(vote.id)}
                        disabled={!priceInputs()[vote.id] || priceInputs()[vote.id] <= 0}
                      >
                        List
                      </button>
                    </div>
                  </Show>

                  <Show when={vote.isForSale}>
                    <button
                      class="w-full rounded border border-white/10 bg-white/5 py-1 text-[10px] font-medium text-white/60 hover:bg-white/10 hover:text-white/80"
                      onClick={() => handleRemoveFromMarket(vote.id)}
                    >
                      Remove from Market
                    </button>
                  </Show>
                </div>
              )}
            </For>
          </div>
        </Show>

        {/* Guarantees */}
        <Show when={activeTab() === "guarantees"}>
          <GuaranteeMarket
            roomId={props.roomId}
            roundNumber={props.roundNumber}
            currentUserId={props.currentUserId}
            userWalletBalance={props.userWalletBalance}
            myVotes={myVotes()}
          />
        </Show>

        {/* Strategy */}
        <Show when={activeTab() === "strategy"}>
          <StrategyPanel
            roomId={props.roomId}
            roundNumber={props.roundNumber}
            currentUserId={props.currentUserId}
            players={props.players || []}
            votes={props.votes}
            transactions={props.transactions}
          />
        </Show>

        {/* Trends */}
        <Show when={activeTab() === "trends"}>
          <MarketTrends
            roomId={props.roomId}
            currentRound={props.roundNumber}
            transactions={props.transactions}
          />
        </Show>

        {/* History */}
        <Show when={activeTab() === "history"}>
          <div class="space-y-1.5">
            <For
              each={recentTrades()}
              fallback={
                <div class="flex flex-col items-center gap-2 rounded-lg border border-dashed border-white/10 bg-white/5 p-6 text-center">
                  <div class="text-2xl opacity-30">📜</div>
                  <p class="text-[10px] text-white/30">No transactions yet</p>
                </div>
              }
            >
              {(trade) => {
                const isIncoming = trade.toPlayer === props.currentUserId;
                const isOutgoing = trade.fromPlayer === props.currentUserId;

                return (
                  <div class="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5">
                    <div class="flex items-center gap-2">
                      <span class="text-sm">{getTransactionIcon(trade.transactionType)}</span>
                      <div>
                        <div class="flex items-center gap-1.5 text-[11px] font-medium">
                          {getTransactionLabel(trade.transactionType)}
                          <Show when={isIncoming && trade.transactionType === "vote_sale"}>
                            <span class="rounded bg-green-500/20 px-1 py-0.5 text-[9px] font-semibold text-green-400">Bought</span>
                          </Show>
                          <Show when={isOutgoing && trade.transactionType === "vote_sale"}>
                            <span class="rounded bg-amber-500/20 px-1 py-0.5 text-[9px] font-semibold text-amber-300">Sold</span>
                          </Show>
                          <Show when={isIncoming && trade.transactionType === "pot_distribution"}>
                            <span class="rounded bg-green-600/30 px-1 py-0.5 text-[9px] font-semibold text-green-400">Won</span>
                          </Show>
                        </div>
                        <div class="text-[9px] text-white/30">
                          {new Date(Number(trade.timestamp) / 1000).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    <span
                      class="text-xs font-bold"
                      classList={{
                        "text-green-400": isIncoming,
                        "text-red-400": isOutgoing && trade.transactionType !== "pot_distribution",
                        "text-white/60": !isIncoming && !isOutgoing,
                      }}
                    >
                      {isIncoming ? "+" : "-"}${trade.amount.toFixed(2)}
                    </span>
                  </div>
                );
              }}
            </For>
          </div>
        </Show>
      </div>
    </div>
  );
};

export default VoteMarketPanel;
