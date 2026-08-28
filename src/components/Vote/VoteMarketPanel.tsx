import { Component, createSignal, createEffect, onCleanup, For, Show } from "solid-js";
import type { Vote, Transaction, User, Guarantee, GuaranteePurchase } from "~/module_bindings/types";
import GuaranteeMarket from "./GuaranteeMarket";
import StrategyPanel from "./StrategyPanel";
import MarketTrends from "./MarketTrends";
import { useSpacetimeDB } from "~/hooks/useSpacetimeDB";
import { resolvePlayerName } from "~/lib/game-utils";
import { buyListedVote, listVote, unlistVote } from "~/lib/vote-trading";
import { isVoteGuaranteed } from "~/lib/guarantees";
import { suggestedListPrice, visibleVoteColor } from "~/lib/vote-tally";
import { TID } from "~/lib/test-ids";

interface VoteMarketPanelProps {
  votes: Vote[];
  transactions: Transaction[];
  roomId: number;
  roundNumber: number;
  currentUserId: string;
  userWalletBalance: number;
  players?: User[];
  votesRevealed?: boolean;
}

type SortOption = "price-asc" | "price-desc" | "color" | "recent";

const VoteMarketPanel: Component<VoteMarketPanelProps> = (props) => {
  const { conn } = useSpacetimeDB();
  const [sortBy, setSortBy] = createSignal<SortOption>("price-asc");
  const [filterColor, setFilterColor] = createSignal<string | null>(null);
  const [priceInputs, setPriceInputs] = createSignal<Record<number, number>>({});
  const [activeTab, setActiveTab] = createSignal<"market" | "my-votes" | "guarantees" | "history" | "strategy" | "trends">("market");
  const [guarantees, setGuarantees] = createSignal<Guarantee[]>([]);
  const [guaranteePurchases, setGuaranteePurchases] = createSignal<GuaranteePurchase[]>([]);

  createEffect(() => {
    const connection = conn();
    if (!connection) return;
    const refreshGuarantees = () => setGuarantees(Array.from(connection.db.guarantee.iter()));
    const refreshPurchases = () => setGuaranteePurchases(Array.from(connection.db.guarantee_purchase.iter()));
    refreshGuarantees();
    refreshPurchases();
    connection.db.guarantee.onInsert(refreshGuarantees);
    connection.db.guarantee.onUpdate(refreshGuarantees);
    connection.db.guarantee.onDelete(refreshGuarantees);
    connection.db.guarantee_purchase.onInsert(refreshPurchases);
    connection.db.guarantee_purchase.onUpdate(refreshPurchases);
    connection.db.guarantee_purchase.onDelete(refreshPurchases);
    onCleanup(() => {
      connection.db.guarantee.removeOnInsert(refreshGuarantees);
      connection.db.guarantee.removeOnUpdate(refreshGuarantees);
      connection.db.guarantee.removeOnDelete(refreshGuarantees);
      connection.db.guarantee_purchase.removeOnInsert(refreshPurchases);
      connection.db.guarantee_purchase.removeOnUpdate(refreshPurchases);
      connection.db.guarantee_purchase.removeOnDelete(refreshPurchases);
    });
  });

  const voteGuaranteed = (voteId: number) =>
    isVoteGuaranteed(voteId, guarantees(), guaranteePurchases());

  const marketListings = () => {
    let listings = props.votes.filter(
      (v) =>
        v.isForSale &&
        !voteGuaranteed(v.id) &&
        v.playerId !== props.currentUserId &&
        v.roomId === props.roomId
    );
    if (filterColor() && props.votesRevealed) {
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

  const handleBuyVote = (voteId: number, price: number) => {
    buyListedVote(conn(), {
      voteId,
      buyerId: props.currentUserId,
      price,
      walletBalance: props.userWalletBalance,
    });
  };

  const handleSetPrice = (voteId: number) => {
    const typed = priceInputs()[voteId];
    listVote(conn(), voteId, typed > 0 ? typed : defaultListPrice());
  };

  const handleRemoveFromMarket = (voteId: number) => {
    unlistVote(conn(), voteId);
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

  const lastSale = () =>
    props.transactions
      .filter((t) => t.roomId === props.roomId && t.transactionType === "vote_sale")
      .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))[0];

  const lowestAsk = () => {
    const prices = marketListings()
      .map((v) => v.salePrice || 0)
      .filter((p) => p > 0);
    return prices.length ? Math.min(...prices) : null;
  };

  const defaultListPrice = () => suggestedListPrice(lastSale()?.amount ?? null, lowestAsk());

  const tabs = [
    { id: "market" as const, label: "Buy", count: () => marketListings().length, testId: TID.marketTab },
    { id: "my-votes" as const, label: "Sell", count: () => myVotes().filter((v) => v.isForSale).length, testId: TID.myVotesTab },
    { id: "guarantees" as const, label: "Guar.", count: undefined, testId: TID.guaranteesTab },
    { id: "strategy" as const, label: "Strategy", count: undefined, testId: undefined },
    { id: "trends" as const, label: "Trends", count: undefined, testId: undefined },
    { id: "history" as const, label: "History", count: undefined, testId: undefined },
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
              data-testid={tab.testId}
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
            <div class="rounded-md border border-amber-400/20 bg-amber-500/5 px-2.5 py-1.5 text-[10px] leading-snug text-amber-100/70">
              <span class="font-semibold text-amber-200">Buy a vote</span> and it becomes yours — recast it Red or Blue. Last trade:{" "}
              <span class="font-semibold text-white">
                {lastSale() ? `$${lastSale()!.amount.toFixed(2)}` : "none yet"}
              </span>
            </div>
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
              <Show when={props.votesRevealed}>
              <select
                class="rounded border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-white/70 outline-none focus:border-white/20"
                value={filterColor() || "all"}
                onChange={(e) => setFilterColor(e.currentTarget.value === "all" ? null : e.currentTarget.value)}
              >
                <option value="all">All</option>
                <option value="red">Red</option>
                <option value="blue">Blue</option>
              </select>
              </Show>
            </div>

            <For
              each={marketListings()}
              fallback={
                <div class="flex flex-col items-center gap-2 rounded-lg border border-dashed border-white/10 bg-white/5 p-6 text-center">
                  <div class="text-2xl opacity-30">🏪</div>
                  <p class="text-[11px] font-medium text-white/40">
                    {filterColor() ? "No votes match that color filter" : "Nobody is selling yet"}
                  </p>
                  <p class="text-[10px] text-white/25">
                    {filterColor()
                      ? "Try clearing the filter above"
                      : "Open the Sell tab to list one of yours — or wait for another player."}
                  </p>
                </div>
              }
            >
              {(vote) => {
                const short = props.userWalletBalance < (vote.salePrice || 0);
                const shown = visibleVoteColor(
                  vote.playerId,
                  vote.color,
                  props.currentUserId,
                  !!props.votesRevealed,
                );
                return (
                  <div class="group flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 transition-all hover:border-amber-400/30 hover:bg-white/10">
                    <div class="flex items-center gap-2">
                      {colorDot(shown)}
                      <div>
                        <div class="text-xs font-medium">
                          Vote #{vote.id}
                          <span class="ml-1 text-[10px] font-normal capitalize text-white/40">
                            {shown || (props.votesRevealed ? "unplaced" : "hidden")}
                          </span>
                        </div>
                        <div class="text-[10px] text-white/30">
                          {resolvePlayerName(vote.playerId, conn())} · becomes yours
                        </div>
                      </div>
                    </div>
                    <div class="flex flex-col items-end gap-1">
                      <div class="flex items-center gap-2">
                        <span class="text-sm font-bold text-amber-300">${vote.salePrice}</span>
                        <button
                          class="rounded bg-amber-500/80 px-2 py-0.5 text-[10px] font-semibold text-white transition-colors hover:bg-amber-400 disabled:opacity-30"
                          onClick={() => handleBuyVote(vote.id, vote.salePrice!)}
                          disabled={short}
                          title={short ? `Need $${((vote.salePrice || 0) - props.userWalletBalance).toFixed(2)} more` : "Buy this vote and recast it"}
                        >
                          Buy
                        </button>
                      </div>
                      <Show when={short}>
                        <span class="text-[9px] text-rose-300/80">Need ${((vote.salePrice || 0) - props.userWalletBalance).toFixed(2)} more</span>
                      </Show>
                    </div>
                  </div>
                );
              }}
            </For>
          </div>
        </Show>

        {/* My Votes */}
        <Show when={activeTab() === "my-votes"}>
          <div class="space-y-2">
            <div class="rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-[10px] leading-snug text-white/50">
              <span class="font-semibold text-white/70">List a vote</span> at a fixed price. The buyer takes it and can recast it; you keep the cash (minus a 1% fee to the pot). Guaranteed votes cannot be listed. Suggested:{" "}
              <span class="font-semibold text-amber-200">${defaultListPrice().toFixed(2)}</span>
            </div>
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
                    <Show when={voteGuaranteed(vote.id)}>
                      <span class="rounded bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-violet-300 border border-violet-500/30">
                        Guaranteed
                      </span>
                    </Show>
                    <Show when={vote.isForSale && !voteGuaranteed(vote.id)}>
                      <span class="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300 border border-amber-500/30">
                        Listed: ${vote.salePrice}
                      </span>
                    </Show>
                  </div>

                  <Show when={voteGuaranteed(vote.id)}>
                    <p class="text-[10px] text-violet-300/70">Locked by a guarantee — cannot be sold.</p>
                  </Show>

                  <Show when={!vote.isForSale && !voteGuaranteed(vote.id)}>
                    <div class="flex gap-1.5">
                      <input
                        type="number"
                        min="0.01"
                        step="0.5"
                        placeholder={`$${defaultListPrice().toFixed(0)}`}
                        value={priceInputs()[vote.id] || ""}
                        onInput={(e) => setPriceInput(vote.id, parseFloat(e.currentTarget.value))}
                        class="flex-1 rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/80 outline-none placeholder:text-white/20 focus:border-white/20"
                      />
                      <button
                        class="rounded bg-green-600/70 px-2 py-1 text-[10px] font-semibold text-white hover:bg-green-500/80 disabled:opacity-30"
                        onClick={() => handleSetPrice(vote.id)}
                        disabled={(priceInputs()[vote.id] || defaultListPrice()) <= 0}
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
            votesRevealed={!!props.votesRevealed}
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
