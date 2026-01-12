import { Page, Locator, expect } from '@playwright/test';

/**
 * Generate a unique room name to avoid conflicts between test runs
 */
export function uniqueRoomName(baseName: string): string {
  return `${baseName}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Page Object for the Vote Game interface
 * Provides reusable methods for common game actions
 */
export class VoteGamePage {
  readonly page: Page;
  
  // Connection status
  readonly connectionStatus: Locator;
  readonly identityDisplay: Locator;
  
  // Room management
  readonly createRoomButton: Locator;
  readonly roomNameInput: Locator;
  readonly buyinAmountInput: Locator;
  readonly submitCreateRoomButton: Locator;
  readonly cancelCreateRoomButton: Locator;
  
  // Ready system
  readonly readyButton: Locator;
  
  // Voting
  readonly voteRedButton: Locator;
  readonly voteBlueButton: Locator;
  readonly roundTimer: Locator;
  
  // Wallet/Bank
  readonly walletBalance: Locator;
  readonly bankBalance: Locator;
  readonly potDisplay: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Connection
    this.connectionStatus = page.locator('[data-testid="connection-status"], text=Connected');
    this.identityDisplay = page.locator('text=/Identity:/');
    
    // Room management
    this.createRoomButton = page.locator('button:has-text("Create Room")').first();
    this.roomNameInput = page.locator('input[placeholder="My Game Room"]');
    this.buyinAmountInput = page.locator('input[type="number"]');
    this.submitCreateRoomButton = page.locator('button:has-text("Create Room ($")');
    this.cancelCreateRoomButton = page.locator('button:has-text("Cancel")');
    
    // Ready system - use specific text to avoid matching room tabs
    this.readyButton = page.getByRole('button', { name: /Ready to Play|click to unready/i });
    
    // Voting
    this.voteRedButton = page.locator('[data-testid="vote-red"], button:has-text("Red")');
    this.voteBlueButton = page.locator('[data-testid="vote-blue"], button:has-text("Blue")');
    this.roundTimer = page.locator('[data-testid="round-timer"]');
    
    // Wallet/Bank
    this.walletBalance = page.locator('[data-testid="wallet-balance"]');
    this.bankBalance = page.locator('[data-testid="bank-balance"]');
    this.potDisplay = page.locator('text=/Pot/');
  }

  async goto() {
    await this.page.goto('/vote?multiuser=true');
  }

  async waitForConnection(timeout = 30000) {
    await this.page.waitForFunction(
      () => {
        const text = document.body.innerText;
        return text.includes('Connected') || text.includes('Identity:');
      },
      { timeout }
    );
  }

  async createRoom(name: string, buyinAmount: number = 10) {
    await this.createRoomButton.click();
    await this.roomNameInput.fill(name);
    await this.buyinAmountInput.fill(buyinAmount.toString());
    await this.submitCreateRoomButton.click();
    
    // Wait for room tab to appear (use first() to avoid strict mode issues with multiple matches)
    await expect(this.page.locator(`[role="tab"]:has-text("${name}")`).first()).toBeVisible({ timeout: 10000 });
  }

  async joinRoom(roomName: string) {
    // Click the room tab specifically
    await this.page.locator(`[role="tab"]:has-text("${roomName}")`).first().click();
  }

  async clickReady() {
    await this.readyButton.click();
  }

  async isReady(): Promise<boolean> {
    const readyIndicator = this.page.locator('text=/✓.*Ready|Ready.*click to unready/');
    return await readyIndicator.isVisible();
  }

  async voteRed() {
    await this.voteRedButton.click();
  }

  async voteBlue() {
    await this.voteBlueButton.click();
  }

  async getIdentity(): Promise<string> {
    const text = await this.identityDisplay.textContent();
    const match = text?.match(/Identity:\s*([a-f0-9]+)/i);
    return match?.[1] || '';
  }

  async getRoomTab(roomName: string): Locator {
    return this.page.locator(`[role="tab"]:has-text("${roomName}")`);
  }

  async waitForToast(message: string | RegExp, timeout = 5000) {
    await this.page.waitForSelector(`text=${message}`, { timeout });
  }

  async getPlayerCount(roomName: string): Promise<number> {
    const playersText = await this.page.locator(`text=/${roomName}.*player/`).textContent();
    const match = playersText?.match(/(\d+)\s*player/);
    return parseInt(match?.[1] || '0', 10);
  }
}

/**
 * Page Object for the Chat interface
 */
export class ChatPage {
  readonly page: Page;
  readonly chatInput: Locator;
  readonly sendButton: Locator;
  readonly chatMessages: Locator;

  constructor(page: Page) {
    this.page = page;
    this.chatInput = page.locator('[data-testid="chat-input"], input[placeholder*="message"], textarea[placeholder*="message"]');
    this.sendButton = page.locator('[data-testid="send-button"], button:has-text("Send")');
    this.chatMessages = page.locator('[data-testid="chat-messages"], .chat-messages');
  }

  async sendMessage(message: string) {
    await this.chatInput.fill(message);
    await this.sendButton.click();
  }

  async waitForMessage(message: string, timeout = 5000) {
    await this.page.waitForSelector(`text=${message}`, { timeout });
  }

  async getMessageCount(): Promise<number> {
    return await this.chatMessages.locator('.message, [data-testid="message"]').count();
  }
}

/**
 * Page Object for the Social/Friends interface
 */
export class SocialPage {
  readonly page: Page;
  
  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/social?multiuser=true');
  }

  async openSocialPanel() {
    await this.page.click('[data-testid="social-panel"], text=Social, text=Friends');
  }

  async sendFriendRequest(username: string) {
    await this.page.fill('[data-testid="friend-search"], input[placeholder*="friend"]', username);
    await this.page.click('button:has-text("Add"), button:has-text("Send Request")');
  }

  async acceptFriendRequest(username: string) {
    await this.page.click(`text=${username}`);
    await this.page.click('button:has-text("Accept")');
  }

  async rejectFriendRequest(username: string) {
    await this.page.click(`text=${username}`);
    await this.page.click('button:has-text("Reject")');
  }
}
