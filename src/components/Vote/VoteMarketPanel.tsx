import { Component, createSignal, For, Show } from "solid-js";
import type { Unit } from "~/module_bindings/unit_type";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { TextField, TextFieldLabel, TextFieldInput } from "~/components/ui/text-field";
import { ScrollArea } from "~/components/ui/scroll-area";

interface VoteMarketPanelProps {
  units: Unit[];
  currentUserId: string;
  onBuyVote: (unitId: number, price: number) => void;
  onSetPrice: (unitId: number, price: number | null) => void;
}

type SortOption = "price-asc" | "price-desc" | "color" | "recent";

const VoteMarketPanel: Component<VoteMarketPanelProps> = (props) => {
  const [sortBy, setSortBy] = createSignal<SortOption>("price-asc");
  const [filterColor, setFilterColor] = createSignal<string | null>(null);
  const [priceInputs, setPriceInputs] = createSignal<Record<number, number>>({});

  // Get units for sale (not owned by current user)
  const marketListings = () => {
    let listings = props.units.filter(
      (u) => u.votePrice !== null && u.voteOwner !== props.currentUserId
    );

    // Filter by color if selected
    if (filterColor()) {
      listings = listings.filter((u) => u.voteColor === filterColor());
    }

    // Sort
    const sorted = [...listings].sort((a, b) => {
      switch (sortBy()) {
        case "price-asc":
          return (a.votePrice || 0) - (b.votePrice || 0);
        case "price-desc":
          return (b.votePrice || 0) - (a.votePrice || 0);
        case "color":
          return (a.voteColor || "").localeCompare(b.voteColor || "");
        case "recent":
          return b.id - a.id; // Assuming higher IDs are more recent
        default:
          return 0;
      }
    });

    return sorted;
  };

  // Get user's units
  const myUnits = () => {
    return props.units.filter((u) => u.voteOwner === props.currentUserId);
  };

  // Get trade history (simplified - would need actual trade records)
  const recentTrades = () => {
    // Mock data - in real app, this would come from trade history table
    return props.units
      .filter((u) => u.votePrice !== null)
      .slice(0, 10)
      .map((u) => ({
        unitId: u.id,
        price: u.votePrice!,
        color: u.voteColor || "unknown",
        timestamp: Date.now() - Math.random() * 3600000, // Mock timestamp
      }));
  };

  const handleSetPrice = (unitId: number) => {
    const price = priceInputs()[unitId];
    if (price && price > 0) {
      props.onSetPrice(unitId, price);
    }
  };

  const handleRemoveFromMarket = (unitId: number) => {
    props.onSetPrice(unitId, null);
  };

  const setPriceInput = (unitId: number, value: number) => {
    setPriceInputs((prev) => ({ ...prev, [unitId]: value }));
  };

  const getColorDot = (color: string | null) => {
    return (
      <div
        class="h-3 w-3 rounded-full border border-gray-300"
        style={{ "background-color": color || "#ccc" }}
      />
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vote Market</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="market">
          <TabsList class="grid w-full grid-cols-3">
            <TabsTrigger value="market">
              Market ({marketListings().length})
            </TabsTrigger>
            <TabsTrigger value="my-units">
              My Units ({myUnits().length})
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
                <option value="red">Red</option>
                <option value="blue">Blue</option>
                <option value="green">Green</option>
                <option value="yellow">Yellow</option>
              </select>
            </div>

            {/* Listings */}
            <ScrollArea class="h-96">
              <div class="space-y-2 pr-4">
                <For
                  each={marketListings()}
                  fallback={
                    <div class="rounded border border-dashed p-8 text-center text-sm text-gray-500">
                      No units for sale matching your filters
                    </div>
                  }
                >
                  {(unit) => (
                    <div class="rounded-lg border p-3 transition-all hover:border-blue-300 hover:shadow-sm">
                      <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                          {getColorDot(unit.voteColor)}
                          <div>
                            <div class="font-medium">Unit #{unit.id}</div>
                            <div class="text-xs text-gray-500">
                              Color: {unit.voteColor || "None"}
                            </div>
                          </div>
                        </div>
                        <div class="flex items-center gap-2">
                          <Badge variant="outline" class="text-lg font-bold">
                            ${unit.votePrice}
                          </Badge>
                          <Button
                            size="sm"
                            onClick={() => props.onBuyVote(unit.id, unit.votePrice!)}
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

          {/* My Units Tab */}
          <TabsContent value="my-units" class="space-y-3">
            <ScrollArea class="h-96">
              <div class="space-y-2 pr-4">
                <For
                  each={myUnits()}
                  fallback={
                    <div class="rounded border border-dashed p-8 text-center text-sm text-gray-500">
                      You don't own any units yet
                    </div>
                  }
                >
                  {(unit) => (
                    <div class="rounded-lg border p-3">
                      <div class="mb-2 flex items-center justify-between">
                        <div class="flex items-center gap-2">
                          {getColorDot(unit.voteColor)}
                          <div>
                            <div class="font-medium">Unit #{unit.id}</div>
                            <div class="text-xs text-gray-500">
                              Color: {unit.voteColor || "None"}
                            </div>
                          </div>
                        </div>
                        <Show when={unit.votePrice !== null}>
                          <Badge variant="secondary">Listed: ${unit.votePrice}</Badge>
                        </Show>
                      </div>

                      <Show when={unit.votePrice === null}>
                        {/* Not listed - show price input */}
                        <div class="flex gap-2">
                          <TextField class="flex-1">
                            <TextFieldInput
                              type="number"
                              min="1"
                              placeholder="Set price..."
                              value={priceInputs()[unit.id] || ""}
                              onInput={(e) =>
                                setPriceInput(unit.id, parseInt(e.currentTarget.value, 10))
                              }
                            />
                          </TextField>
                          <Button
                            size="sm"
                            onClick={() => handleSetPrice(unit.id)}
                            disabled={!priceInputs()[unit.id] || priceInputs()[unit.id] <= 0}
                          >
                            List for Sale
                          </Button>
                        </div>
                      </Show>

                      <Show when={unit.votePrice !== null}>
                        {/* Listed - show remove button */}
                        <Button
                          size="sm"
                          variant="outline"
                          class="w-full"
                          onClick={() => handleRemoveFromMarket(unit.id)}
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
                  {(trade) => (
                    <div class="rounded-lg border p-3">
                      <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                          {getColorDot(trade.color)}
                          <div>
                            <div class="text-sm font-medium">Unit #{trade.unitId}</div>
                            <div class="text-xs text-gray-500">
                              {new Date(trade.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline">${trade.price}</Badge>
                      </div>
                    </div>
                  )}
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

