import { Component, createSignal, Show } from "solid-js";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { TextField, TextFieldInput, TextFieldLabel } from "~/components/ui/text-field";
import { Badge } from "~/components/ui/badge";
import { useSpacetimeDB } from "~/hooks/useSpacetimeDB";
import { showToast } from "~/components/ui/toast";
import type { User } from "~/module_bindings/types";

interface BankTransferModalProps {
  user: User;
  onClose: () => void;
}

export const BankTransferModal: Component<BankTransferModalProps> = (props) => {
  const { conn } = useSpacetimeDB();
  const [amount, setAmount] = createSignal(0);
  const [direction, setDirection] = createSignal<'to-bank' | 'from-bank'>('to-bank');
  const [isProcessing, setIsProcessing] = createSignal(false);

  const handleTransfer = async () => {
    const connection = conn();
    if (!connection) return;

    const transferAmount = amount();
    if (transferAmount <= 0) {
      showToast({
        title: "Invalid Amount",
        description: "Please enter a positive amount",
        variant: "error",
      });
      return;
    }

    // Validate available balance
    if (direction() === 'to-bank' && transferAmount > props.user.walletBalance) {
      showToast({
        title: "Insufficient Funds",
        description: "You don't have enough in your wallet",
        variant: "error",
      });
      return;
    }

    if (direction() === 'from-bank' && transferAmount > props.user.bankAccount) {
      showToast({
        title: "Insufficient Funds",
        description: "You don't have enough in your bank account",
        variant: "error",
      });
      return;
    }

    setIsProcessing(true);

    try {
      if (direction() === 'to-bank') {
        await connection.reducers.transferToBank({ amount: transferAmount });
        showToast({
          title: "Transfer Successful",
          description: `$${transferAmount.toFixed(2)} deposited to bank`,
          variant: "default",
        });
      } else {
        await connection.reducers.withdrawFromBank({ amount: transferAmount });
        showToast({
          title: "Withdrawal Successful",
          description: `$${transferAmount.toFixed(2)} withdrawn to wallet`,
          variant: "default",
        });
      }
      props.onClose();
    } catch (error) {
      console.error('Transfer failed:', error);
      showToast({
        title: "Transfer Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "error",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const quickAmount = (percent: number) => {
    if (direction() === 'to-bank') {
      setAmount(props.user.walletBalance * percent);
    } else {
      setAmount(props.user.bankAccount * percent);
    }
  };

  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <Card class="w-[500px]">
        <CardHeader>
          <div class="flex items-center justify-between">
            <CardTitle>🏦 Bank Transfer</CardTitle>
            <Button size="sm" variant="ghost" onClick={props.onClose}>
              ✕
            </Button>
          </div>
        </CardHeader>

        <CardContent class="space-y-4">
          {/* Current Balances */}
          <div class="grid grid-cols-2 gap-4">
            <div class="rounded border p-3">
              <div class="text-sm text-gray-500">Wallet Balance</div>
              <div class="text-xl font-bold">${props.user.walletBalance.toFixed(2)}</div>
            </div>
            <div class="rounded border p-3">
              <div class="text-sm text-gray-500">Bank Balance</div>
              <div class="text-xl font-bold text-blue-600">
                ${props.user.bankAccount.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Direction Toggle */}
          <div class="flex gap-2">
            <Button
              class="flex-1"
              variant={direction() === 'to-bank' ? 'default' : 'outline'}
              onClick={() => {
                setDirection('to-bank');
                setAmount(0);
              }}
            >
              💰 → 🏦 Deposit to Bank
            </Button>
            <Button
              class="flex-1"
              variant={direction() === 'from-bank' ? 'default' : 'outline'}
              onClick={() => {
                setDirection('from-bank');
                setAmount(0);
              }}
            >
              🏦 → 💰 Withdraw to Wallet
            </Button>
          </div>

          {/* Amount Input */}
          <TextField>
            <TextFieldLabel>
              Amount to {direction() === 'to-bank' ? 'Deposit' : 'Withdraw'}
            </TextFieldLabel>
            <TextFieldInput
              type="number"
              min="0"
              step="0.01"
              value={amount()}
              onInput={(e) => setAmount(parseFloat(e.currentTarget.value) || 0)}
              placeholder="0.00"
            />
          </TextField>

          {/* Quick Amount Buttons */}
          <div class="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => quickAmount(0.25)}>
              25%
            </Button>
            <Button size="sm" variant="outline" onClick={() => quickAmount(0.5)}>
              50%
            </Button>
            <Button size="sm" variant="outline" onClick={() => quickAmount(0.75)}>
              75%
            </Button>
            <Button size="sm" variant="outline" onClick={() => quickAmount(1)}>
              All
            </Button>
          </div>

          {/* Info Box */}
          <div class="rounded border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700">
            <p class="font-semibold">💡 About Bank Accounts:</p>
            <ul class="ml-4 mt-1 list-disc space-y-1">
              <li>
                <strong>Wallet:</strong> Used for trading votes and guarantees during games
              </li>
              <li>
                <strong>Bank:</strong> Safe storage for long-term savings
              </li>
              <li>Money in your bank cannot be lost during games</li>
              <li>Transfer freely between wallet and bank anytime</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div class="flex gap-2">
            <Button
              class="flex-1"
              onClick={handleTransfer}
              disabled={amount() <= 0 || isProcessing()}
            >
              {isProcessing() ? 'Processing...' : `Transfer $${amount().toFixed(2)}`}
            </Button>
            <Button class="flex-1" variant="outline" onClick={props.onClose}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BankTransferModal;

