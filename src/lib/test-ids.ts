/**
 * Shared test identifiers used by both UI components and E2E tests.
 *
 * RULES:
 *  - UI components apply these via `data-testid={TID.xxx}`.
 *  - E2E page objects build locators from these constants.
 *  - When a selector changes, update it HERE once — everything follows.
 */

export const TID = {
  // ── Connection ────────────────────────────────────────────
  connectionStatus: 'connection-status',
  identityDisplay: 'identity-display',

  // ── Room management ──────────────────────────────────────
  createRoomBtn: 'create-room-btn',
  roomNameInput: 'room-name-input',
  buyinAmountInput: 'buyin-amount-input',
  votesPerPlayerInput: 'votes-per-player-input',
  allowRebuyCheckbox: 'allow-rebuy-checkbox',
  allowMidgameJoinCheckbox: 'allow-midgame-join-checkbox',
  submitCreateRoomBtn: 'submit-create-room-btn',
  cancelCreateRoomBtn: 'cancel-create-room-btn',
  leaveRoomBtn: 'leave-room-btn',

  // ── Lobby / Pre-start ────────────────────────────────────
  readyButton: 'ready-button',
  lobbyHeader: 'lobby-header',
  playerCard: 'player-card',

  // ── Game header ──────────────────────────────────────────
  gameHeader: 'game-header',
  roundTimer: 'round-timer',
  potAmount: 'pot-amount',
  walletDisplay: 'wallet-display',
  walletBalance: 'wallet-balance',
  profitLoss: 'profit-loss',

  // ── Voting ───────────────────────────────────────────────
  voteRed: 'vote-red',
  voteBlue: 'vote-blue',
  /** Dynamic: `vote-chip-${id}` */
  voteChip: (id: number) => `vote-chip-${id}` as const,
  endRoundBtn: 'end-round-btn',
  endRoundCount: 'end-round-count',

  // ── Chat ─────────────────────────────────────────────────
  chatMessages: 'chat-messages',
  chatInput: 'chat-input',
  sendButton: 'send-button',
  chatTab: 'chat-tab',

  // ── Tabs (game-phase panels) ─────────────────────────────
  guaranteesTab: 'guarantees-tab',
  myVotesTab: 'my-votes-tab',
  marketTab: 'market-tab',
} as const;
