import { Page, Locator, expect } from '@playwright/test';
import { TID } from '../../src/lib/test-ids';

/**
 * Build a data-testid locator string from a TID constant.
 * Centralises the attribute format so tests never hardcode it.
 */
const tid = (id: string) => `[data-testid="${id}"]`;

export function uniqueRoomName(baseName: string): string {
  return `${baseName}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

// ─── Vote Game Page ──────────────────────────────────────────────────────────

export class VoteGamePage {
  readonly page: Page;

  // Connection
  readonly connectionStatus: Locator;
  readonly identityDisplay: Locator;

  // Room management
  readonly createRoomButton: Locator;
  readonly roomNameInput: Locator;
  readonly buyinAmountInput: Locator;
  readonly votesPerPlayerInput: Locator;
  readonly allowRebuyCheckbox: Locator;
  readonly allowMidgameJoinCheckbox: Locator;
  readonly submitCreateRoomButton: Locator;
  readonly cancelCreateRoomButton: Locator;
  readonly leaveRoomButton: Locator;

  // Lobby / Pre-start
  readonly readyButton: Locator;
  readonly lobbyHeader: Locator;

  // Game header
  readonly gameHeader: Locator;
  readonly roundTimer: Locator;
  readonly potAmount: Locator;
  readonly walletBalance: Locator;
  readonly profitLoss: Locator;

  // Voting
  readonly voteRedZone: Locator;
  readonly voteBlueZone: Locator;
  readonly endRoundBtn: Locator;
  readonly endRoundCount: Locator;

  // Chat (in-game panel)
  readonly chatTab: Locator;

  constructor(page: Page) {
    this.page = page;

    this.connectionStatus = page.locator(tid(TID.connectionStatus));
    this.identityDisplay = page.locator(tid(TID.identityDisplay));

    this.createRoomButton = page.locator(tid(TID.createRoomBtn));
    this.roomNameInput = page.locator(tid(TID.roomNameInput));
    this.buyinAmountInput = page.locator(tid(TID.buyinAmountInput));
    this.votesPerPlayerInput = page.locator(tid(TID.votesPerPlayerInput));
    this.allowRebuyCheckbox = page.locator(tid(TID.allowRebuyCheckbox));
    this.allowMidgameJoinCheckbox = page.locator(tid(TID.allowMidgameJoinCheckbox));
    this.submitCreateRoomButton = page.locator(tid(TID.submitCreateRoomBtn));
    this.cancelCreateRoomButton = page.locator(tid(TID.cancelCreateRoomBtn));
    this.leaveRoomButton = page.locator(tid(TID.leaveRoomBtn));

    this.readyButton = page.locator(tid(TID.readyButton));
    this.lobbyHeader = page.locator(tid(TID.lobbyHeader));

    this.gameHeader = page.locator(tid(TID.gameHeader));
    this.roundTimer = page.locator(tid(TID.roundTimer));
    this.potAmount = page.locator(tid(TID.potAmount));
    this.walletBalance = page.locator(tid(TID.walletBalance));
    this.profitLoss = page.locator(tid(TID.profitLoss));

    this.voteRedZone = page.locator(tid(TID.voteRed));
    this.voteBlueZone = page.locator(tid(TID.voteBlue));
    this.endRoundBtn = page.locator(tid(TID.endRoundBtn));
    this.endRoundCount = page.locator(tid(TID.endRoundCount));

    this.chatTab = page.locator(tid(TID.chatTab));
  }

  // ── Navigation ───────────────────────────────────────────

  async goto() {
    await this.page.goto('/vote?multiuser=true');
  }

  async waitForConnection(timeout = 30000) {
    await this.page.waitForFunction(
      (sel: string) => {
        const el = document.querySelector(sel);
        return el?.textContent?.includes('Connected');
      },
      tid(TID.connectionStatus),
      { timeout },
    );
  }

  // ── Room management ──────────────────────────────────────

  async createRoom(
    name: string,
    options: {
      buyinAmount?: number;
      votesPerPlayer?: number;
      allowRebuy?: boolean;
      allowMidgameJoin?: boolean;
    } = {},
  ) {
    const {
      buyinAmount = 10,
      votesPerPlayer = 5,
      allowRebuy = true,
      allowMidgameJoin = false,
    } = options;

    await expect(this.createRoomButton).toBeEnabled({ timeout: 15000 });
    await this.createRoomButton.click();
    await this.roomNameInput.fill(name);

    if (await this.buyinAmountInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.buyinAmountInput.fill(buyinAmount.toString());
    }
    if (await this.votesPerPlayerInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await this.votesPerPlayerInput.fill(votesPerPlayer.toString());
    }

    const rebuyChecked = await this.allowRebuyCheckbox.isChecked().catch(() => true);
    if (rebuyChecked !== allowRebuy) await this.allowRebuyCheckbox.click();

    const midgameChecked = await this.allowMidgameJoinCheckbox.isChecked().catch(() => false);
    if (midgameChecked !== allowMidgameJoin) await this.allowMidgameJoinCheckbox.click();

    await this.submitCreateRoomButton.click();
    await expect(this.roomTab(name)).toBeVisible({ timeout: 10000 });
  }

  roomTab(roomName: string): Locator {
    return this.page.locator(`[role="tab"]:has-text("${roomName}")`).first();
  }

  async joinRoom(roomName: string) {
    await this.roomTab(roomName).click();
  }

  async waitForRoomTab(roomName: string, timeout = 30000) {
    await expect(this.roomTab(roomName)).toBeVisible({ timeout });
  }

  async leaveRoom() {
    await expect(this.leaveRoomButton).toBeVisible({ timeout: 5000 });
    await this.leaveRoomButton.click();
  }

  // ── Ready / Lobby ────────────────────────────────────────

  async clickReady() {
    await expect(this.readyButton).toBeVisible({ timeout: 10000 });
    await expect(this.readyButton).toBeEnabled({ timeout: 5000 });
    await this.readyButton.click();
  }

  async isReady(): Promise<boolean> {
    const text = await this.readyButton.textContent().catch(() => '');
    return /unready/i.test(text || '');
  }

  // ── Voting ───────────────────────────────────────────────

  async voteRed() {
    await this.voteRedZone.click();
  }

  async voteBlue() {
    await this.voteBlueZone.click();
  }

  async vote(color: 'red' | 'blue') {
    if (color === 'red') await this.voteRed();
    else await this.voteBlue();
  }

  voteChip(id: number): Locator {
    return this.page.locator(tid(TID.voteChip(id)));
  }

  async clickEndRound() {
    if (await this.endRoundBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      if (await this.endRoundBtn.isEnabled()) {
        await this.endRoundBtn.click();
      }
    }
  }

  // ── Chat (in-game) ──────────────────────────────────────

  async openChat() {
    if (await this.chatTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.chatTab.click();
    }
  }

  async sendChat(message: string) {
    const input = this.page.locator(tid(TID.chatInput));
    const send = this.page.locator(tid(TID.sendButton));
    if (await input.isVisible({ timeout: 3000 }).catch(() => false)) {
      await input.fill(message);
      await send.click();
    }
  }

  // ── Identity ─────────────────────────────────────────────

  async getIdentity(): Promise<string> {
    const text = await this.identityDisplay.textContent();
    return text?.trim() || '';
  }

  // ── Game state queries ───────────────────────────────────

  async waitForGameStart(timeout = 15000) {
    await expect(this.potAmount).toBeVisible({ timeout });
  }

  playerCards(): Locator {
    return this.page.locator(tid(TID.playerCard));
  }
}

// ─── Chat Page ───────────────────────────────────────────────────────────────

export class ChatPage {
  readonly page: Page;
  readonly chatInput: Locator;
  readonly sendButton: Locator;
  readonly chatMessages: Locator;

  constructor(page: Page) {
    this.page = page;
    this.chatInput = page.locator(tid(TID.chatInput));
    this.sendButton = page.locator(tid(TID.sendButton));
    this.chatMessages = page.locator(tid(TID.chatMessages));
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

// ─── Social Page ─────────────────────────────────────────────────────────────

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
