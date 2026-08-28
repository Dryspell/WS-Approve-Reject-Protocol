import { Component, createSignal, createEffect, onCleanup, For, Show } from "solid-js";
import type { Guarantee, GuaranteePurchase, Vote } from "~/module_bindings/types";
import { useSpacetimeDB } from "~/hooks/useSpacetimeDB";
import { ToastHelper } from "~/lib/toast-helpers";
import { sounds } from "~/lib/sounds";

interface GuaranteeMarketProps {
  roomId: number;
  roundNumber: number;
  currentUserId: string;
  userWalletBalance: number;
  myVotes: Vote[];
}

const GuaranteeMarket: Component<GuaranteeMarketProps> = (props) => {
  const { conn } = useSpacetimeDB();
  const [guarantees, setGuarantees] = createSignal<Guarantee[]>([]);
  const [purchases, setPurchases] = createSignal<GuaranteePurchase[]>([]);

  // Load + live-subscribe guarantee data. The `guarantee` / `guarantee_purchase`
  // tables are already subscribed globally in useSpacetimeDB; this panel just
  // mirrors them into local signals (previously these signals were never
  // populated, so the whole guarantee market rendered empty).
  createEffect(() => {
    const connection = conn();
    if (!connection) return;

    const refreshGuarantees = () =>
      setGuarantees(Array.from(connection.db.guarantee.iter()));
    const refreshPurchases = () =>
      setPurchases(Array.from(connection.db.guarantee_purchase.iter()));

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

  const [createColor, setCreateColor] = createSignal<"red" | "blue">("red");
  const [createPrice, setCreatePrice] = createSignal<number>(5);
  const [createType, setCreateType] = createSignal<"public" | "private">("public");
  const [selectedVoteId, setSelectedVoteId] = createSignal<number | null>(null);

  const activeGuarantees = () =>
    guarantees().filter(
      (g) => g.isActive && g.roomId === props.roomId && g.roundNumber === props.roundNumber
    );

  const myGuarantees = () =>
    guarantees().filter(
      (g) => g.sellerId === props.currentUserId && g.roomId === props.roomId
    );

  const myPurchases = () =>
    purchases().filter((p) => p.buyerId === props.currentUserId);

  const availableVotesForGuarantee = () => {
    const guaranteedVoteIds = new Set(
      guarantees()
        .filter((g) => g.sellerId === props.currentUserId && g.isActive)
        .map((g) => g.voteId)
    );
    return props.myVotes.filter((v) => !guaranteedVoteIds.has(v.id));
  };

  const handleCreateGuarantee = async () => {
    const connection = conn();
    if (!connection) return;
    const voteId = selectedVoteId();
    if (voteId === null) {
      ToastHelper.warning("Select a Vote", "Pick which vote to guarantee");
      return;
    }
    try {
      await connection.reducers.createGuarantee({
        roomId: props.roomId,
        roundNumber: props.roundNumber,
        voteId,
        color: createColor(),
        price: createPrice(),
        guaranteeType: createType(),
      });
      ToastHelper.success("Guarantee Created", `Vote #${voteId} locked to ${createColor()} — cannot be sold or recast`);
      sounds.guaranteePurchased();
      setCreatePrice(5);
      setSelectedVoteId(null);
    } catch (error: any) {
      ToastHelper.error(error?.message || "Failed to create guarantee");
      sounds.error();
    }
  };

  const handleCancelGuarantee = async (guaranteeId: number) => {
    const connection = conn();
    if (!connection) return;
    try {
      await connection.reducers.cancelGuarantee({ guaranteeId });
      ToastHelper.success("Guarantee cancelled", "That vote can be recast or sold again");
    } catch (error: any) {
      ToastHelper.error(error?.message || "Failed to cancel guarantee");
      sounds.error();
    }
  };

  const handlePurchaseGuarantee = async (guaranteeId: number, price: number) => {
    const connection = conn();
    if (!connection) return;
    if (props.userWalletBalance < price) {
      ToastHelper.warning("Insufficient Funds", `You need $${price} but have $${props.userWalletBalance.toFixed(2)}`);
      return;
    }
    try {
      await connection.reducers.purchaseGuarantee({ guaranteeId });
      ToastHelper.success("Guarantee Purchased", `You paid $${price} -- this vote is now locked`);
      sounds.guaranteePurchased();
    } catch (error: any) {
      ToastHelper.error(error?.message || "Failed to purchase guarantee");
      sounds.error();
    }
  };

  const colorDot = (color: string) => (
    <div class="h-3 w-3 rounded-full" classList={{ "bg-red-500": color === "red", "bg-blue-500": color === "blue" }} />
  );

  return (
    <div class="space-y-3 text-white/90">
      {/* Create Guarantee Form */}
      <div class="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2.5">
        <p class="text-xs font-semibold text-white/80">Sell a Guarantee</p>

        {/* Vote Selector */}
        <div class="space-y-1">
          <p class="text-[10px] text-white/40">Select which vote to guarantee:</p>
          <Show
            when={availableVotesForGuarantee().length > 0}
            fallback={
              <div class="rounded border border-dashed border-white/10 p-2 text-center text-[10px] text-white/30">
                All your votes already have guarantees
              </div>
            }
          >
            <div class="flex flex-wrap gap-1">
              <For each={availableVotesForGuarantee()}>
                {(vote) => (
                  <button
                    class="rounded border px-1.5 py-0.5 text-[10px] font-medium transition-all"
                    classList={{
                      "border-amber-400/60 bg-amber-500/20 text-amber-300": selectedVoteId() === vote.id,
                      "border-white/10 bg-white/5 text-white/50 hover:bg-white/10": selectedVoteId() !== vote.id,
                    }}
                    onClick={() => setSelectedVoteId(vote.id)}
                  >
                    #{vote.id}
                    <span class="ml-0.5">
                      {vote.color === "red" ? "🔴" : vote.color === "blue" ? "🔵" : "⚪"}
                    </span>
                  </button>
                )}
              </For>
            </div>
          </Show>
        </div>

        {/* Color selector */}
        <div class="grid grid-cols-2 gap-1.5">
          <button
            class="flex items-center justify-center gap-1 rounded border py-1 text-[10px] font-semibold transition-all"
            classList={{
              "border-red-400/60 bg-red-500/20 text-red-300": createColor() === "red",
              "border-white/10 bg-white/5 text-white/40 hover:bg-white/10": createColor() !== "red",
            }}
            onClick={() => setCreateColor("red")}
          >
            {colorDot("red")} Red
          </button>
          <button
            class="flex items-center justify-center gap-1 rounded border py-1 text-[10px] font-semibold transition-all"
            classList={{
              "border-blue-400/60 bg-blue-500/20 text-blue-300": createColor() === "blue",
              "border-white/10 bg-white/5 text-white/40 hover:bg-white/10": createColor() !== "blue",
            }}
            onClick={() => setCreateColor("blue")}
          >
            {colorDot("blue")} Blue
          </button>
        </div>

        {/* Price */}
        <div class="space-y-0.5">
          <label class="text-[10px] text-white/40">Price ($)</label>
          <input
            type="number"
            min="0.01"
            step="0.5"
            value={createPrice()}
            onInput={(e) => setCreatePrice(parseFloat(e.currentTarget.value))}
            class="w-full rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/80 outline-none placeholder:text-white/20 focus:border-white/20"
          />
        </div>

        {/* Type */}
        <div class="space-y-1">
          <p class="text-[10px] text-white/40">Type:</p>
          <div class="grid grid-cols-2 gap-1.5">
            <button
              class="rounded border py-1 text-[10px] font-medium transition-all"
              classList={{
                "border-amber-400/40 bg-amber-500/15 text-amber-300": createType() === "public",
                "border-white/10 bg-white/5 text-white/40 hover:bg-white/10": createType() !== "public",
              }}
              onClick={() => setCreateType("public")}
            >
              Public
            </button>
            <button
              class="rounded border py-1 text-[10px] font-medium transition-all"
              classList={{
                "border-amber-400/40 bg-amber-500/15 text-amber-300": createType() === "private",
                "border-white/10 bg-white/5 text-white/40 hover:bg-white/10": createType() !== "private",
              }}
              onClick={() => setCreateType("private")}
            >
              Private
            </button>
          </div>
          <p class="text-[9px] text-white/25">
            {createType() === "public"
              ? "One buyer only (removed after purchase)"
              : "Multiple buyers can each purchase"}
          </p>
        </div>

        <button
          onClick={handleCreateGuarantee}
          class="w-full rounded bg-green-600/70 py-1.5 text-[10px] font-semibold text-white transition-colors hover:bg-green-500/80 disabled:opacity-30"
          disabled={selectedVoteId() === null || availableVotesForGuarantee().length === 0}
        >
          Guarantee Vote #{selectedVoteId() ?? "?"} {createColor()} (${createPrice().toFixed(2)})
        </button>

        <div class="rounded border border-amber-500/20 bg-amber-500/5 px-2 py-1.5 text-[9px] text-amber-300/70">
          🔒 <strong>Binding:</strong> This vote is locked to the color now and cannot be sold.
        </div>
      </div>

      {/* Available Guarantees */}
      <div>
        <p class="mb-1.5 text-xs font-semibold text-white/70">
          Available ({activeGuarantees().length})
        </p>
        <div class="max-h-52 space-y-1.5 overflow-auto pr-1">
          <For
            each={activeGuarantees()}
            fallback={
              <div class="rounded-lg border border-dashed border-white/10 bg-white/5 p-4 text-center text-[10px] text-white/30">
                No guarantees available yet
              </div>
            }
          >
            {(guarantee) => {
              const isMine = () => guarantee.sellerId === props.currentUserId;
              const hasPurchased = () => myPurchases().some((p) => p.guaranteeId === guarantee.id);

              return (
                <div
                  class="rounded-lg border bg-white/5 px-3 py-2 transition-all"
                  classList={{
                    "border-green-500/30": hasPurchased(),
                    "border-white/10 hover:border-white/20": !hasPurchased(),
                  }}
                >
                  <div class="flex items-start justify-between">
                    <div class="flex items-center gap-2">
                      {colorDot(guarantee.color)}
                      <div>
                        <div class="text-[11px] font-semibold capitalize">{guarantee.color} Guarantee</div>
                        <div class="text-[9px] text-white/30">
                          {guarantee.guaranteeType === "public" ? "Public" : "Private"} · Vote #{guarantee.voteId} ·{" "}
                          {isMine() ? "You" : guarantee.sellerId.slice(0, 8) + "..."}
                        </div>
                      </div>
                    </div>
                    <div class="flex flex-col items-end gap-1">
                      <span class="text-xs font-bold text-amber-300">${guarantee.price.toFixed(2)}</span>
                      <Show when={hasPurchased()}>
                        <span class="rounded bg-green-600/30 px-1 py-0.5 text-[9px] font-semibold text-green-400">
                          ✓ Purchased
                        </span>
                      </Show>
                      <Show when={!isMine() && !hasPurchased()}>
                        <button
                          class="rounded bg-amber-500/80 px-2 py-0.5 text-[10px] font-semibold text-white transition-colors hover:bg-amber-400 disabled:opacity-30"
                          onClick={() => handlePurchaseGuarantee(guarantee.id, guarantee.price)}
                          disabled={props.userWalletBalance < guarantee.price}
                        >
                          Buy
                        </button>
                      </Show>
                    </div>
                  </div>
                </div>
              );
            }}
          </For>
        </div>
      </div>

      {/* Your Guarantees */}
      <Show when={myGuarantees().length > 0}>
        <div>
          <p class="mb-1.5 text-xs font-semibold text-white/70">
            Your Guarantees ({myGuarantees().length})
          </p>
          <div class="max-h-40 space-y-1.5 overflow-auto pr-1">
            <For each={myGuarantees()}>
              {(guarantee) => {
                const purchaseCount = () => purchases().filter((p) => p.guaranteeId === guarantee.id).length;
                return (
                  <div class="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                    <div class="flex items-center gap-2">
                      {colorDot(guarantee.color)}
                      <div>
                        <div class="text-[11px] font-medium capitalize">
                          Vote #{guarantee.voteId} → {guarantee.color} · ${guarantee.price}
                        </div>
                        <div class="text-[9px] text-white/30">
                          {guarantee.guaranteeType} · {purchaseCount()} purchase{purchaseCount() !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </div>
                    <div class="flex items-center gap-1.5">
                      <Show when={guarantee.isActive && purchaseCount() === 0}>
                        <button
                          class="rounded px-1.5 py-0.5 text-[9px] font-semibold text-white/50 hover:bg-white/10 hover:text-white/80"
                          onClick={() => handleCancelGuarantee(guarantee.id)}
                        >
                          Cancel
                        </button>
                      </Show>
                      <span
                        class="rounded px-1.5 py-0.5 text-[9px] font-semibold"
                        classList={{
                          "bg-green-600/30 text-green-400": guarantee.isActive && purchaseCount() > 0,
                          "bg-amber-500/20 text-amber-300": guarantee.isActive && purchaseCount() === 0,
                          "bg-white/10 text-white/40": !guarantee.isActive,
                        }}
                      >
                        {guarantee.isActive ? (purchaseCount() > 0 ? "🔒 Locked" : "Active") : "Sold"}
                      </span>
                    </div>
                  </div>
                );
              }}
            </For>
          </div>
        </div>
      </Show>

      {/* Info */}
      <div class="rounded-lg border border-blue-400/15 bg-blue-500/5 p-2.5 text-[9px] text-blue-300/60">
        <p class="font-semibold text-blue-300/80">How Guarantees Work</p>
        <ul class="ml-3 mt-1 list-disc space-y-0.5">
          <li>Each guarantee locks one specific vote to a color — it cannot be broken</li>
          <li>A guaranteed vote cannot be sold or transferred</li>
          <li><strong>Public:</strong> One buyer only, then removed from the market</li>
          <li><strong>Private:</strong> Multiple different buyers can each purchase</li>
        </ul>
      </div>
    </div>
  );
};

export default GuaranteeMarket;
