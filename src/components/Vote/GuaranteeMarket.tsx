import { Component, createSignal, For, Show } from "solid-js";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { TextField, TextFieldLabel, TextFieldInput } from "~/components/ui/text-field";
import { ScrollArea } from "~/components/ui/scroll-area";
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
  
  const [createColor, setCreateColor] = createSignal<"red" | "blue">("red");
  const [createPrice, setCreatePrice] = createSignal<number>(5);
  const [createType, setCreateType] = createSignal<"public" | "private">("public");
  const [selectedVoteId, setSelectedVoteId] = createSignal<number | null>(null);

  const activeGuarantees = () => {
    return guarantees().filter(
      (g) => g.isActive && g.roomId === props.roomId && g.roundNumber === props.roundNumber
    );
  };

  const myGuarantees = () => {
    return guarantees().filter(
      (g) => g.sellerId === props.currentUserId && g.roomId === props.roomId
    );
  };

  const myPurchases = () => {
    return purchases().filter((p) => p.buyerId === props.currentUserId);
  };

  // Votes that don't already have an active guarantee
  const availableVotesForGuarantee = () => {
    const guaranteedVoteIds = new Set(
      guarantees()
        .filter(g => g.sellerId === props.currentUserId && g.isActive)
        .map(g => g.voteId)
    );
    return props.myVotes.filter(v => !guaranteedVoteIds.has(v.id));
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
      
      ToastHelper.success(
        "Guarantee Created",
        `Vote #${voteId} locked to ${createColor()} at $${createPrice()}`
      );
      sounds.guaranteePurchased();
      setCreatePrice(5);
      setSelectedVoteId(null);
    } catch (error: any) {
      ToastHelper.error(error?.message || "Failed to create guarantee");
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

  return (
    <div class="space-y-4">
      {/* Create Guarantee Form */}
      <Card>
        <CardContent class="space-y-3 p-4">
          <p class="text-sm font-semibold">Sell a Guarantee</p>

          {/* Vote Selector */}
          <div class="space-y-1">
            <p class="text-xs text-gray-600">Select which vote to guarantee:</p>
            <Show when={availableVotesForGuarantee().length > 0} fallback={
              <div class="rounded border border-dashed p-2 text-center text-xs text-gray-500">
                All your votes already have guarantees
              </div>
            }>
              <div class="flex flex-wrap gap-1">
                <For each={availableVotesForGuarantee()}>
                  {(vote) => (
                    <Button
                      size="sm"
                      variant={selectedVoteId() === vote.id ? "default" : "outline"}
                      onClick={() => setSelectedVoteId(vote.id)}
                      class="text-xs"
                    >
                      Vote #{vote.id}
                      {vote.color ? (vote.color === "red" ? " 🔴" : " 🔵") : " ⚪"}
                    </Button>
                  )}
                </For>
              </div>
            </Show>
          </div>
          
          <div class="grid grid-cols-2 gap-2">
            <Button
              variant={createColor() === "red" ? "default" : "outline"}
              onClick={() => setCreateColor("red")}
              class={createColor() === "red" ? "bg-red-500 hover:bg-red-600" : ""}
            >
              🔴 Red
            </Button>
            <Button
              variant={createColor() === "blue" ? "default" : "outline"}
              onClick={() => setCreateColor("blue")}
              class={createColor() === "blue" ? "bg-blue-500 hover:bg-blue-600" : ""}
            >
              🔵 Blue
            </Button>
          </div>

          <TextField>
            <TextFieldLabel class="text-xs">Price ($)</TextFieldLabel>
            <TextFieldInput
              type="number"
              min="0.01"
              step="0.5"
              value={createPrice()}
              onInput={(e) => setCreatePrice(parseFloat(e.currentTarget.value))}
            />
          </TextField>

          <div class="space-y-2">
            <p class="text-xs text-gray-600">Type:</p>
            <div class="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant={createType() === "public" ? "default" : "outline"}
                onClick={() => setCreateType("public")}
              >
                Public
              </Button>
              <Button
                size="sm"
                variant={createType() === "private" ? "default" : "outline"}
                onClick={() => setCreateType("private")}
              >
                Private
              </Button>
            </div>
            <p class="text-xs text-gray-500">
              {createType() === "public" 
                ? "One buyer only (removed after purchase)"
                : "Multiple different buyers can each purchase"}
            </p>
          </div>

          <Button
            onClick={handleCreateGuarantee}
            class="w-full"
            disabled={selectedVoteId() === null || availableVotesForGuarantee().length === 0}
          >
            Lock Vote #{selectedVoteId() ?? '?'} to {createColor()} ($${createPrice().toFixed(2)})
          </Button>

          <div class="rounded border border-blue-200 bg-blue-50 p-2 text-xs text-blue-700">
            🔒 <strong>Enforced:</strong> Your vote will be locked to this color once a buyer purchases this guarantee.
          </div>
        </CardContent>
      </Card>

      {/* Available Guarantees */}
      <div>
        <p class="mb-2 text-sm font-semibold">
          Available Guarantees ({activeGuarantees().length})
        </p>
        <ScrollArea class="h-64">
          <div class="space-y-2 pr-2">
            <For
              each={activeGuarantees()}
              fallback={
                <div class="rounded border border-dashed p-4 text-center text-sm text-gray-500">
                  No guarantees available. Be the first to create one!
                </div>
              }
            >
              {(guarantee) => {
                const isMine = () => guarantee.sellerId === props.currentUserId;
                const hasPurchased = () => myPurchases().some(p => p.guaranteeId === guarantee.id);

                return (
                  <Card classList={{ "border-green-300": hasPurchased() }}>
                    <CardContent class="p-3">
                      <div class="flex items-start justify-between">
                        <div class="flex-1">
                          <div class="flex items-center gap-2">
                            <span class="text-2xl">
                              {guarantee.color === "red" ? "🔴" : "🔵"}
                            </span>
                            <div>
                              <div class="font-semibold capitalize">
                                {guarantee.color} Guarantee
                              </div>
                              <div class="text-xs text-gray-500">
                                {guarantee.guaranteeType === "public" ? "Public" : "Private"} •
                                Vote #{guarantee.voteId} •
                                By {isMine() ? "You" : guarantee.sellerId.slice(0, 8) + "..."}
                              </div>
                            </div>
                          </div>
                          
                          <Show when={hasPurchased()}>
                            <Badge variant="default" class="mt-2 text-xs bg-green-600">
                              ✓ Purchased
                            </Badge>
                          </Show>
                        </div>

                        <div class="flex flex-col items-end gap-2">
                          <Badge variant="outline" class="text-sm font-bold">
                            ${guarantee.price.toFixed(2)}
                          </Badge>
                          
                          <Show when={!isMine() && !hasPurchased()}>
                            <Button
                              size="sm"
                              onClick={() => handlePurchaseGuarantee(guarantee.id, guarantee.price)}
                              disabled={props.userWalletBalance < guarantee.price}
                            >
                              Buy
                            </Button>
                          </Show>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              }}
            </For>
          </div>
        </ScrollArea>
      </div>

      {/* Your Guarantees */}
      <Show when={myGuarantees().length > 0}>
        <div>
          <p class="mb-2 text-sm font-semibold">
            Your Guarantees ({myGuarantees().length})
          </p>
          <ScrollArea class="h-48">
            <div class="space-y-2 pr-2">
              <For each={myGuarantees()}>
                {(guarantee) => {
                  const purchaseCount = () => purchases().filter(
                    p => p.guaranteeId === guarantee.id
                  ).length;

                  return (
                    <Card>
                      <CardContent class="p-3">
                        <div class="flex items-center justify-between">
                          <div class="flex items-center gap-2">
                            <span class="text-xl">
                              {guarantee.color === "red" ? "🔴" : "🔵"}
                            </span>
                            <div>
                              <div class="font-medium capitalize text-sm">
                                Vote #{guarantee.voteId} → {guarantee.color} • ${guarantee.price}
                              </div>
                              <div class="text-xs text-gray-500">
                                {guarantee.guaranteeType} • {purchaseCount()} purchase{purchaseCount() !== 1 ? "s" : ""}
                              </div>
                            </div>
                          </div>
                          <Badge variant={guarantee.isActive ? "default" : "secondary"}>
                            {guarantee.isActive ? (purchaseCount() > 0 ? "🔒 Locked" : "Active") : "Sold"}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  );
                }}
              </For>
            </div>
          </ScrollArea>
        </div>
      </Show>

      {/* Info */}
      <div class="rounded border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700">
        <p class="font-semibold">💡 How Guarantees Work</p>
        <ul class="ml-4 mt-1 list-disc space-y-1">
          <li><strong>Per-vote:</strong> Each guarantee locks one specific vote to a color</li>
          <li><strong>Enforced:</strong> Once purchased, the server locks the vote -- the seller cannot change it</li>
          <li><strong>Public:</strong> One buyer only, then the guarantee is removed</li>
          <li><strong>Private:</strong> Multiple different buyers can each purchase (but not the same buyer twice)</li>
          <li><strong>Strategy:</strong> Buyers can bluff others about what guarantees they hold</li>
        </ul>
      </div>
    </div>
  );
};

export default GuaranteeMarket;
