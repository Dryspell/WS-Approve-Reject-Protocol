import { Component, createSignal } from "solid-js";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { useSpacetimeDB } from "~/hooks/useSpacetimeDB";
import { showToast } from "~/components/ui/toast";
import type { User } from "~/module_bindings/user_type";
import type { GameRoom } from "~/module_bindings/game_room_type";

interface RebuyModalProps {
  user: User;
  room: GameRoom;
  onClose: () => void;
  onSuccess: () => void;
}

export const RebuyModal: Component<RebuyModalProps> = (props) => {
  const { conn } = useSpacetimeDB();
  const [isProcessing, setIsProcessing] = createSignal(false);

  const rebuyCost = () => props.room.buyinAmount * 3.0;
  const canAfford = () => props.user.walletBalance >= rebuyCost();

  const handleRebuy = async () => {
    const connection = conn();
    if (!connection) return;

    if (!canAfford()) {
      showToast({
        title: "Insufficient Funds",
        description: `You need $${rebuyCost().toFixed(2)} to re-buy. Current balance: $${props.user.walletBalance.toFixed(2)}`,
        variant: "error",
      });
      return;
    }

    setIsProcessing(true);

    try {
      await connection.reducers.rebuyIntoGame(props.room.id);
      showToast({
        title: "Welcome Back!",
        description: `You've re-entered the game for $${rebuyCost().toFixed(2)}`,
        variant: "default",
      });
      props.onSuccess();
      props.onClose();
    } catch (error) {
      console.error('Re-buy failed:', error);
      showToast({
        title: "Re-buy Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "error",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <Card class="w-[500px]">
        <CardHeader>
          <div class="flex items-center justify-between">
            <CardTitle>🎮 Re-Enter Game</CardTitle>
            <Button size="sm" variant="ghost" onClick={props.onClose}>
              ✕
            </Button>
          </div>
        </CardHeader>

        <CardContent class="space-y-4">
          {/* Elimination Notice */}
          <div class="rounded border border-red-200 bg-red-50 p-4 text-center">
            <div class="text-3xl">❌</div>
            <div class="mt-2 text-lg font-semibold text-red-900">
              You've Been Eliminated
            </div>
            <div class="mt-1 text-sm text-red-700">
              But you can re-enter the game for a premium!
            </div>
          </div>

          {/* Re-buy Details */}
          <div class="space-y-3">
            <div class="flex justify-between rounded border p-3">
              <span class="text-gray-600">Original Buy-in</span>
              <span class="font-semibold">${props.room.buyinAmount.toFixed(2)}</span>
            </div>

            <div class="flex justify-between rounded border border-blue-200 bg-blue-50 p-3">
              <span class="font-semibold text-blue-900">Re-buy Cost (3x)</span>
              <span class="text-xl font-bold text-blue-900">
                ${rebuyCost().toFixed(2)}
              </span>
            </div>

            <div class="flex justify-between rounded border p-3">
              <span class="text-gray-600">Your Wallet Balance</span>
              <span class="font-semibold" classList={{
                'text-green-600': canAfford(),
                'text-red-600': !canAfford(),
              }}>
                ${props.user.walletBalance.toFixed(2)}
              </span>
            </div>

            <div class="flex justify-between rounded border p-3">
              <span class="text-gray-600">Current Pot</span>
              <span class="font-semibold text-purple-600">
                ${props.room.potSize.toFixed(2)}
              </span>
            </div>
          </div>

          {/* What You Get */}
          <div class="rounded border border-green-200 bg-green-50 p-3">
            <div class="font-semibold text-green-900">What You'll Get:</div>
            <ul class="ml-4 mt-1 list-disc space-y-1 text-sm text-green-700">
              <li>Re-enter the current game immediately</li>
              <li>Receive 1 new vote for the current round</li>
              <li>80% of your re-buy goes to the pot (${(rebuyCost() * 0.8).toFixed(2)})</li>
              <li>20% house fee (${(rebuyCost() * 0.2).toFixed(2)})</li>
            </ul>
          </div>

          {/* Info Box */}
          <div class="rounded border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-700">
            <p class="font-semibold">⚠️ Important:</p>
            <ul class="ml-4 mt-1 list-disc space-y-1">
              <li>The re-buy cost is 3x the original buy-in to maintain fairness</li>
              <li>You'll start with 1 vote - same as everyone who started</li>
              <li>You can trade and compete just like before</li>
              <li>This is your chance to turn things around!</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div class="flex gap-2">
            <Button
              class="flex-1"
              onClick={handleRebuy}
              disabled={!canAfford() || isProcessing()}
              variant={canAfford() ? 'default' : 'destructive'}
            >
              {isProcessing() 
                ? 'Processing...' 
                : canAfford() 
                  ? `🎮 Re-Enter for $${rebuyCost().toFixed(2)}`
                  : 'Insufficient Funds'
              }
            </Button>
            <Button class="flex-1" variant="outline" onClick={props.onClose}>
              No Thanks
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RebuyModal;

