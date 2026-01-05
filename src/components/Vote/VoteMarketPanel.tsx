import { Component, createSignal, For, Show } from "solid-js";
import type { Vote } from "~/module_bindings/vote_type";
import type { Transaction } from "~/module_bindings/transaction_type";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { TextField, TextFieldLabel, TextFieldInput } from "~/components/ui/text-field";
import { ScrollArea } from "~/components/ui/scroll-area";
import GuaranteeMarket from "./GuaranteeMarket";
import { useSpacetimeDB } from "~/hooks/useSpacetimeDB";
import { ToastHelper } from "~/lib/toast-helpers";

interface VoteMarketPanelProps {
  votes: Vote[];
  transactions: Transaction[];
  roomId: number;
  roundNumber: number;
  currentUserId: string;
  userWalletBalance: number;
}

type SortOption = "price-asc" | "price-desc" | "color" | "recent";

const VoteMarketPanel: Component<VoteMarketPanelProps> = (props) => {
  const { conn } = useSpacetimeDB();
  const [sortBy, setSortBy] = createSignal<SortOption>("price-asc");
  const [filterColor, setFilterColor] = createSignal<string | null>(null);
  const [priceInputs, setPriceInputs] = createSignal<Record<number, number>>({});

  // Get votes for sale (not owned by current user)
  const marketListings = () => {
    let listings = props.votes.filter(
      (v) => v.isForSale && v.playerId !== props.currentUserId && v.roomId === props.roomId
    );

    // Filter by color if selected
    if (filterColor()) {
      listings = listings.filter((v) => v.color === filterColor());
    }

    // Sort
    const sorted = [...listings].sort((a, b) => {
      switch (sortBy()) {
        case "price-asc":
          return (a.salePrice || 0) - (b.salePrice || 0);
        case "price-desc":
          return (b.salePrice || 0) - (a.salePrice || 0);
        case "color":
          return (a.color || "").localeCompare(b.color || "");
        case "recent":
          return b.id - a.id; // Assuming higher IDs are more recent
        default:
          return 0;
      }
    });

    return sorted;
  };

  // Get user's votes
  const myVotes = () => {
    return props.votes.filter((v) => v.playerId === props.currentUserId && v.roomId === props.roomId);
  };

  // Get trade history
  const recentTrades = () => {
    return props.transactions
      .filter((t) => t.roomId === props.roomId && t.transactionType === "vote_sale")
      .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
      .slice(0, 20);
  };

  const handleBuyVote = async (voteId: number, price: number) => {
    const connection = conn();
    if (!connection) return;

    if (props.userWalletBalance < price) {
      ToastHelper.warning("Insufficient Funds", `You need $${price} but have $${props.userWalletBalance.toFixed(2)}`);
      return;
    }

    try {
      connection.reducers.transferVoteOwnership(voteId, props.currentUserId, price);
      ToastHelper.success("Vote Purchased", `You bought vote #${voteId} for $${price}`);
    } catch (error) {
      ToastHelper.error("Failed to purchase vote");
    }
  };

  const handleSetPrice = async (voteId: number) => {
    const connection = conn();
    if (!connection) return;

    const price = priceInputs()[voteId];
    if (price && price > 0) {
      try {
        connection.reducers.setVoteForSale(voteId, price);
        ToastHelper.success("Vote Listed", `Vote #${voteId} is now listed for $${price}`);
      } catch (error) {
        ToastHelper.error("Failed to list vote");
      }
    }
  };

  const handleRemoveFromMarket = async (voteId: number) => {
    const connection = conn();
    if (!connection) return;

    try {
      connection.reducers.removeVoteFromSale(voteId);
      ToastHelper.success("Vote Unlisted", `Vote #${voteId} removed from market`);
    } catch (error) {
      ToastHelper.error("Failed to remove vote");
    }
  };

  const setPriceInput = (voteId: number, value: number) => {
    setPriceInputs((prev) => ({ ...prev, [voteId]: value }));
  };

  const getColorIcon = (color: string | null) => {
    switch (color) {
      case "red":
        return "🔴";
      case "blue":
        return "🔵";
      default:
        return "⚪";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Market</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="market">
          <TabsList class="grid w-full grid-cols-4">
            <TabsTrigger value="market">
              Votes ({marketListings().length})
            </TabsTrigger>
            <TabsTrigger value="my-votes">
              Mine ({myVotes().length})
            </TabsTrigger>
            <TabsTrigger value="guarantees">
              Guarantees
            </TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {/* Market Listings Tab */}
          <TabsContent value="market" class="space-y-3">
            {/* Filters and Sorting */}
            <div class="flex gap-2">
              <select
                class="flex-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm"
                value={sortBy()}
                onChange={(e) => setSortBy(e.currentTarget.value as SortOption)}
              >
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="color">Sort by Color</option>
                <option value="recent">Most Recent</option>
              </select>

              <select
                class="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm"
                value={filterColor() || "all"}
                onChange={(e) =>
                  setFilterColor(e.currentTarget.value === "all" ? null : e.currentTarget.value)
                }
              >
                <option value="all">All Colors</option>
                <option value="red">🔴 Red</option>
                <option value="blue">🔵 Blue</option>
              </select>
            </div>

            {/* Listings */}
            <ScrollArea class="h-96">
              <div class="space-y-2 pr-4">
                <For
                  each={marketListings()}
                  fallback={
                    <div class="rounded border border-dashed p-8 text-center text-sm text-gray-500">
                      No votes for sale matching your filters
                    </div>
                  }
                >
                  {(vote) => (
                    <div class="rounded-lg border p-3 transition-all hover:border-blue-300 hover:shadow-sm">
                      <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                          <span class="text-2xl">{getColorIcon(vote.color)}</span>
                          <div>
                            <div class="font-medium">Vote #{vote.id}</div>
                            <div class="text-xs text-gray-500">
                              From: {vote.playerId.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                        <div class="flex items-center gap-2">
                          <Badge variant="outline" class="text-base font-bold">
                            ${vote.salePrice}
                          </Badge>
                          <Button
                            size="sm"
                            onClick={() => handleBuyVote(vote.id, vote.salePrice!)}
                            disabled={props.userWalletBalance < (vote.salePrice || 0)}
                          >
                            Buy
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* My Votes Tab */}
          <TabsContent value="my-votes" class="space-y-3">
            <ScrollArea class="h-96">
              <div class="space-y-2 pr-4">
                <For
                  each={myVotes()}
                  fallback={
                    <div class="rounded border border-dashed p-8 text-center text-sm text-gray-500">
                      You don't own any votes yet
                    </div>
                  }
                >
                  {(vote) => (
                    <div class="rounded-lg border p-3">
                      <div class="mb-2 flex items-center justify-between">
                        <div class="flex items-center gap-2">
                          <span class="text-2xl">{getColorIcon(vote.color)}</span>
                          <div>
                            <div class="font-medium">Vote #{vote.id}</div>
                            <div class="text-xs text-gray-500">
                              {vote.playerId === vote.originalOwner ? "Original" : "Purchased"}
                            </div>
                          </div>
                        </div>
                        <Show when={vote.isForSale}>
                          <Badge variant="secondary">Listed: ${vote.salePrice}</Badge>
                        </Show>
                      </div>

                      <Show when={!vote.isForSale}>
                        {/* Not listed - show price input */}
                        <div class="flex gap-2">
                          <TextField class="flex-1">
                            <TextFieldInput
                              type="number"
                              min="0.01"
                              step="0.5"
                              placeholder="Set price..."
                              value={priceInputs()[vote.id] || ""}
                              onInput={(e) =>
                                setPriceInput(vote.id, parseFloat(e.currentTarget.value))
                              }
                            />
                          </TextField>
                          <Button
                            size="sm"
                            onClick={() => handleSetPrice(vote.id)}
                            disabled={!priceInputs()[vote.id] || priceInputs()[vote.id] <= 0}
                          >
                            List for Sale
                          </Button>
                        </div>
                      </Show>

                      <Show when={vote.isForSale}>
                        {/* Listed - show remove button */}
                        <Button
                          size="sm"
                          variant="outline"
                          class="w-full"
                          onClick={() => handleRemoveFromMarket(vote.id)}
                        >
                          Remove from Market
                        </Button>
                      </Show>
                    </div>
                  )}
                </For>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Guarantees Tab */}
          <TabsContent value="guarantees">
            <GuaranteeMarket
              roomId={props.roomId}
              roundNumber={props.roundNumber}
              currentUserId={props.currentUserId}
              userWalletBalance={props.userWalletBalance}
            />
          </TabsContent>

          {/* Trade History Tab */}
          <TabsContent value="history" class="space-y-3">
            <ScrollArea class="h-96">
              <div class="space-y-2 pr-4">
                <For
                  each={recentTrades()}
                  fallback={
                    <div class="rounded border border-dashed p-8 text-center text-sm text-gray-500">
                      No recent trades
                    </div>
                  }
                >
                  {(trade) => {
                    const isBuyer = trade.toPlayer === props.currentUserId;
                    const isSeller = trade.fromPlayer === props.currentUserId;
                    
                    return (
                      <div class="rounded-lg border p-3">
                        <div class="flex items-center justify-between">
                          <div class="flex-1">
                            <div class="flex items-center gap-2">
                              <span class="text-lg">🎫</span>
                              <div>
                                <div class="text-sm font-medium">
                                  Vote Sale
                                  {isBuyer && <Badge variant="default" class="ml-2 text-xs">You bought</Badge>}
                                  {isSeller && <Badge variant="secondary" class="ml-2 text-xs">You sold</Badge>}
                                </div>
                                <div class="text-xs text-gray-500">
                                  {new Date(Number(trade.timestamp) / 1000).toLocaleTimeString()}
                                </div>
                              </div>
                            </div>
                          </div>
                          <Badge variant="outline" class="text-sm font-bold">
                            ${trade.amount.toFixed(2)}
                          </Badge>
                        </div>
                      </div>
                    );
                  }}
                </For>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default VoteMarketPanel;

