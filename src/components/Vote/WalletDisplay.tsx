import { Component, createSignal, Show, For } from "solid-js";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Progress } from "~/components/ui/progress";
import { ScrollArea } from "~/components/ui/scroll-area";
import type { User } from "~/module_bindings/user_type";
import type { Transaction } from "~/module_bindings/transaction_type";

interface WalletDisplayProps {
  user: User;
  transactions?: Transaction[];
  buyinAmount?: number;
}

const WalletDisplay: Component<WalletDisplayProps> = (props) => {
  const [showTransactions, setShowTransactions] = createSignal(false);

  const profitLoss = () => {
    if (!props.buyinAmount) return props.user.totalProfitLoss;
    return props.user.walletBalance - props.buyinAmount;
  };

  const profitLossPercent = () => {
    if (!props.buyinAmount || props.buyinAmount === 0) return 0;
    return (profitLoss() / props.buyinAmount) * 100;
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "vote_sale":
        return "🎫";
      case "guarantee_purchase":
        return "🤝";
      case "pot_distribution":
        return "💰";
      default:
        return "💸";
    }
  };

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case "vote_sale":
        return "Vote Sale";
      case "guarantee_purchase":
        return "Guarantee";
      case "pot_distribution":
        return "Pot Win";
      default:
        return "Transaction";
    }
  };

  return (
    <Card class="w-full">
      <CardHeader>
        <CardTitle class="flex items-center justify-between">
          <span>💵 Wallet</span>
          <Badge
            variant={profitLoss() >= 0 ? "default" : "destructive"}
            class="text-sm"
          >
            {profitLoss() >= 0 ? "+" : ""}${profitLoss().toFixed(2)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        {/* Current Balance */}
        <div>
          <div class="mb-1 flex justify-between text-sm text-gray-600">
            <span>Available Balance</span>
            <span class="font-semibold">${props.user.walletBalance.toFixed(2)}</span>
          </div>
          <Show when={props.buyinAmount}>
            <Progress
              value={
                ((props.user.walletBalance / (props.buyinAmount! * 2)) * 100)
              }
              class="h-2"
            />
          </Show>
        </div>

        {/* Bank Account */}
        <Show when={props.user.bankAccount > 0}>
          <div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Bank Account</span>
              <span class="font-semibold">${props.user.bankAccount.toFixed(2)}</span>
            </div>
          </div>
        </Show>

        {/* Lifetime Stats */}
        <div class="border-t pt-3">
          <div class="mb-2 text-sm font-semibold text-gray-700">
            Lifetime Stats
          </div>
          <div class="space-y-1 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-600">Total P/L</span>
              <span
                class="font-semibold"
                classList={{
                  "text-green-600": props.user.totalProfitLoss >= 0,
                  "text-red-600": props.user.totalProfitLoss < 0,
                }}
              >
                {props.user.totalProfitLoss >= 0 ? "+" : ""}$
                {props.user.totalProfitLoss.toFixed(2)}
              </span>
            </div>
            <Show when={props.buyinAmount}>
              <div class="flex justify-between">
                <span class="text-gray-600">This Game</span>
                <span
                  class="font-semibold"
                  classList={{
                    "text-green-600": profitLoss() >= 0,
                    "text-red-600": profitLoss() < 0,
                  }}
                >
                  {profitLoss() >= 0 ? "+" : ""}${profitLoss().toFixed(2)} (
                  {profitLossPercent() >= 0 ? "+" : ""}
                  {profitLossPercent().toFixed(1)}%)
                </span>
              </div>
            </Show>
          </div>
        </div>

        {/* Transaction History */}
        <Show when={props.transactions && props.transactions.length > 0}>
          <div class="border-t pt-3">
            <button
              onClick={() => setShowTransactions(!showTransactions())}
              class="mb-2 flex w-full items-center justify-between text-sm font-semibold text-gray-700"
            >
              <span>Transaction History ({props.transactions?.length || 0})</span>
              <span>{showTransactions() ? "▼" : "▶"}</span>
            </button>

            <Show when={showTransactions()}>
              <ScrollArea class="h-48">
                <div class="space-y-2 pr-2">
                  <For each={props.transactions}>
                    {(tx) => {
                      const isReceiving = tx.toPlayer === props.user.identity.toHexString();
                      return (
                        <div class="rounded border p-2 text-xs">
                          <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2">
                              <span class="text-base">
                                {getTransactionIcon(tx.transactionType)}
                              </span>
                              <span class="font-medium">
                                {getTransactionLabel(tx.transactionType)}
                              </span>
                            </div>
                            <Badge
                              variant={isReceiving ? "default" : "outline"}
                              class="text-xs"
                            >
                              {isReceiving ? "+" : "-"}${tx.amount.toFixed(2)}
                            </Badge>
                          </div>
                          <div class="mt-1 text-gray-500">
                            {isReceiving ? "From" : "To"}:{" "}
                            {(isReceiving ? tx.fromPlayer : tx.toPlayer).slice(0, 8)}...
                          </div>
                        </div>
                      );
                    }}
                  </For>
                </div>
              </ScrollArea>
            </Show>
          </div>
        </Show>

        {/* Info Box */}
        <div class="rounded border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700">
          <p class="font-semibold">💡 Wallet Info</p>
          <ul class="ml-4 mt-1 list-disc space-y-1">
            <li>Use wallet balance to buy votes and guarantees</li>
            <li>Profits from sales go to your wallet</li>
            <li>Win the pot to boost your balance!</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default WalletDisplay;

