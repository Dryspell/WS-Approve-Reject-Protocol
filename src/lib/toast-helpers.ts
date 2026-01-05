// Enhanced toast notification helpers for contextual feedback
import { showToast } from "~/components/ui/toast";
import { DEFAULT_TOAST_DURATION } from "~/lib/timeout-constants";

export const ToastHelper = {
  // ===== Resource Management =====
  resourceGathered: (resourceType: string, amount: number) => {
    const emoji = getResourceEmoji(resourceType);
    showToast({
      title: "Resource Gathered",
      description: `${emoji} +${amount} ${resourceType}`,
      duration: DEFAULT_TOAST_DURATION,
    });
  },

  inventoryFull: (unitId: number) => {
    showToast({
      title: "Inventory Full",
      description: `Unit #${unitId} inventory is at capacity. Transfer resources to storage.`,
      variant: "error",
      duration: DEFAULT_TOAST_DURATION,
    });
  },

  resourceTransferred: (resourceType: string, amount: number, target: string = "storage") => {
    const emoji = getResourceEmoji(resourceType);
    showToast({
      title: "Transfer Complete",
      description: `${emoji} Transferred ${amount} ${resourceType} to ${target}`,
      duration: DEFAULT_TOAST_DURATION,
    });
  },

  resourceDepleted: (resourceType: string) => {
    const emoji = getResourceEmoji(resourceType);
    showToast({
      title: "Resource Depleted",
      description: `${emoji} ${resourceType} node is depleted and regenerating`,
      variant: "error",
      duration: DEFAULT_TOAST_DURATION * 1.5,
    });
  },

  // ===== Crafting =====
  craftingStarted: (recipeName: string, time: number) => {
    showToast({
      title: "Crafting Started",
      description: `🔨 ${recipeName} (${time}s)`,
      duration: DEFAULT_TOAST_DURATION,
    });
  },

  craftingComplete: (recipeName: string) => {
    showToast({
      title: "Crafting Complete",
      description: `✨ ${recipeName} has been crafted!`,
      duration: DEFAULT_TOAST_DURATION,
    });
  },

  craftingFailed: (reason: string) => {
    showToast({
      title: "Crafting Failed",
      description: `❌ ${reason}`,
      variant: "error",
      duration: DEFAULT_TOAST_DURATION,
    });
  },

  // ===== Units & Tasks =====
  taskQueued: (taskType: string, unitId: number) => {
    const emoji = getTaskEmoji(taskType);
    showToast({
      title: "Task Queued",
      description: `${emoji} Unit #${unitId}: ${taskType}`,
      duration: DEFAULT_TOAST_DURATION * 0.8,
    });
  },

  taskCompleted: (taskType: string, unitId: number) => {
    const emoji = getTaskEmoji(taskType);
    showToast({
      title: "Task Complete",
      description: `${emoji} Unit #${unitId} finished ${taskType}`,
      duration: DEFAULT_TOAST_DURATION,
    });
  },

  unitIdle: (unitId: number) => {
    showToast({
      title: "Unit Idle",
      description: `😴 Unit #${unitId} has no tasks. Assign a new task!`,
      variant: "error",
      duration: DEFAULT_TOAST_DURATION * 1.2,
    });
  },

  // ===== Voting & Market =====
  voteColorChanged: (unitId: number, color: string) => {
    showToast({
      title: "Vote Color Set",
      description: `🎨 Unit #${unitId} → ${color}`,
      duration: DEFAULT_TOAST_DURATION,
    });
  },

  voteSold: (unitId: number, price: number) => {
    showToast({
      title: "Vote Listed",
      description: `💰 Unit #${unitId} listed for $${price}`,
      duration: DEFAULT_TOAST_DURATION,
    });
  },

  votePurchased: (unitId: number, price: number) => {
    showToast({
      title: "Vote Purchased",
      description: `🎟️ Unit #${unitId} bought for $${price}`,
      duration: DEFAULT_TOAST_DURATION,
    });
  },

  tradeCancelled: (unitId: number) => {
    showToast({
      title: "Listing Removed",
      description: `Unit #${unitId} removed from market`,
      duration: DEFAULT_TOAST_DURATION,
    });
  },

  // ===== Game Events =====
  roundStarting: (roundNumber: number, timeRemaining: number) => {
    showToast({
      title: "Round Starting",
      description: `🎮 Round ${roundNumber} begins in ${timeRemaining}s`,
      duration: DEFAULT_TOAST_DURATION * 1.5,
    });
  },

  roundEnding: (roundNumber: number) => {
    showToast({
      title: "Round Ending Soon",
      description: `⏰ Round ${roundNumber} - Less than 30 seconds remaining!`,
      variant: "error",
      duration: DEFAULT_TOAST_DURATION * 2,
    });
  },

  roundComplete: (roundNumber: number, survived: boolean) => {
    showToast({
      title: survived ? "Round Survived!" : "Units Eliminated",
      description: survived 
        ? `🎉 Your units survived Round ${roundNumber}!` 
        : `💀 Some units were eliminated in Round ${roundNumber}`,
      variant: survived ? "default" : "error",
      duration: DEFAULT_TOAST_DURATION * 1.5,
    });
  },

  // ===== Buildings =====
  buildingCreated: (buildingType: string) => {
    showToast({
      title: "Building Created",
      description: `🏗️ ${buildingType} has been constructed`,
      duration: DEFAULT_TOAST_DURATION,
    });
  },

  buildingUpgraded: (buildingType: string, level: number) => {
    showToast({
      title: "Building Upgraded",
      description: `⬆️ ${buildingType} upgraded to level ${level}`,
      duration: DEFAULT_TOAST_DURATION,
    });
  },

  // ===== Connection & Errors =====
  connected: () => {
    showToast({
      title: "Connected",
      description: "✅ Connected to SpacetimeDB",
      duration: DEFAULT_TOAST_DURATION,
    });
  },

  disconnected: () => {
    showToast({
      title: "Connection Lost",
      description: "🔌 Attempting to reconnect...",
      variant: "error",
      duration: DEFAULT_TOAST_DURATION * 2,
    });
  },

  reconnected: () => {
    showToast({
      title: "Reconnected",
      description: "✅ Connection restored",
      duration: DEFAULT_TOAST_DURATION,
    });
  },

  error: (message: string) => {
    showToast({
      title: "Error",
      description: `❌ ${message}`,
      variant: "error",
      duration: DEFAULT_TOAST_DURATION * 1.5,
    });
  },

  // ===== Generic =====
  success: (title: string, description: string) => {
    showToast({
      title,
      description: `✅ ${description}`,
      duration: DEFAULT_TOAST_DURATION,
    });
  },

  warning: (title: string, description: string) => {
    showToast({
      title,
      description: `⚠️ ${description}`,
      variant: "error",
      duration: DEFAULT_TOAST_DURATION,
    });
  },

  info: (title: string, description: string) => {
    showToast({
      title,
      description: `ℹ️ ${description}`,
      duration: DEFAULT_TOAST_DURATION,
    });
  },
};

// Helper functions for emojis
function getResourceEmoji(resourceType: string): string {
  const emojiMap: Record<string, string> = {
    wood: "🪵",
    stone: "🪨",
    metalOre: "⛏️",
    metal_ore: "⛏️",
    coal: "⚫",
    gems: "💎",
    fiber: "🌾",
    hide: "🦌",
    sand: "🏖️",
    food: "🍎",
    gold: "💰",
  };
  return emojiMap[resourceType] || "📦";
}

function getTaskEmoji(taskType: string): string {
  const emojiMap: Record<string, string> = {
    gather: "⛏️",
    move: "🚶",
    craft: "🔨",
    build: "🏗️",
    trade: "💱",
    transfer: "📦",
  };
  return emojiMap[taskType] || "⚙️";
}

