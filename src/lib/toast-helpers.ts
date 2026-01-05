import { showToast } from "~/components/ui/toast";
import { DEFAULT_TOAST_DURATION } from "~/lib/timeout-constants";

export class ToastHelper {
  static success(title: string, description?: string) {
    showToast({
      title,
      description,
      variant: "default",
      duration: DEFAULT_TOAST_DURATION,
    });
  }

  static error(description: string, title: string = "Error") {
    showToast({
      title,
      description,
      variant: "error",
      duration: DEFAULT_TOAST_DURATION,
    });
  }

  static warning(title: string, description: string) {
    showToast({
      title,
      description,
      variant: "warning",
      duration: DEFAULT_TOAST_DURATION,
    });
  }

  static info(title: string, description: string) {
    showToast({
      title,
      description,
      variant: "default",
      duration: DEFAULT_TOAST_DURATION,
    });
  }

  // Vote-specific toasts
  static voteColorChanged(voteId: number, color: string) {
    const emoji = color === "red" ? "🔴" : "🔵";
    showToast({
      title: `${emoji} Vote Color Set`,
      description: `Vote #${voteId} is now ${color}`,
      duration: DEFAULT_TOAST_DURATION,
    });
  }

  static votePurchased(voteId: number, price: number) {
    showToast({
      title: "🎫 Vote Purchased",
      description: `You bought vote #${voteId} for $${price.toFixed(2)}`,
      duration: DEFAULT_TOAST_DURATION,
    });
  }

  static voteSold(voteId: number, price: number) {
    showToast({
      title: "💰 Vote Sold",
      description: `Your vote #${voteId} was sold for $${price.toFixed(2)}`,
      duration: DEFAULT_TOAST_DURATION,
    });
  }

  static guaranteeCreated(color: string, price: number) {
    const emoji = color === "red" ? "🔴" : "🔵";
    showToast({
      title: "🤝 Guarantee Created",
      description: `${emoji} guarantee created for $${price.toFixed(2)}`,
      duration: DEFAULT_TOAST_DURATION,
    });
  }

  static guaranteePurchased(price: number) {
    showToast({
      title: "✅ Guarantee Purchased",
      description: `You paid $${price.toFixed(2)} for this guarantee`,
      duration: DEFAULT_TOAST_DURATION,
    });
  }

  static roundStarted(roundNumber: number) {
    showToast({
      title: "🎮 Round Started",
      description: `Round ${roundNumber} has begun. Set your vote colors!`,
      duration: DEFAULT_TOAST_DURATION * 1.5,
    });
  }

  static roundEnded(winner: string, eliminated: string[]) {
    showToast({
      title: "⏰ Round Ended",
      description: `${eliminated.length} player(s) eliminated`,
      duration: DEFAULT_TOAST_DURATION * 2,
    });
  }

  static playerEliminated() {
    showToast({
      title: "☠️ You Were Eliminated",
      description: "You voted with the majority",
      variant: "error",
      duration: DEFAULT_TOAST_DURATION * 2,
    });
  }

  static playerSurvived() {
    showToast({
      title: "✅ You Survived",
      description: "You were in the minority!",
      variant: "default",
      duration: DEFAULT_TOAST_DURATION * 1.5,
    });
  }

  static gameWon(amount: number) {
    showToast({
      title: "🎉 You Won!",
      description: `You won $${amount.toFixed(2)}!`,
      duration: DEFAULT_TOAST_DURATION * 3,
    });
  }

  static insufficientFunds(required: number, available: number) {
    showToast({
      title: "💸 Insufficient Funds",
      description: `You need $${required.toFixed(2)} but only have $${available.toFixed(2)}`,
      variant: "warning",
      duration: DEFAULT_TOAST_DURATION,
    });
  }
}
