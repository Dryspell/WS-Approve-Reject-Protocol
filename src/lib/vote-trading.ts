/**
 * Unified vote-trading flow.
 *
 * The game historically exposed three *separate* ways to trade a vote, each
 * calling reducers directly with its own (inconsistent) toast/sound feedback:
 *   1. The Market panel (open listings: setVoteForSale / transferVoteOwnership)
 *   2. The in-game chat (direct offers: createTradeOffer / acceptTradeOffer)
 *   3. The 3D world trade billboards (a mix of both)
 *
 * This module is the single source of truth for all of them. There are two
 * underlying trade models — keep them straight:
 *
 *   • OPEN LISTING  — a vote is flagged `isForSale` at a fixed price; anyone can
 *                     buy it instantly. Backed by `setVoteForSale`,
 *                     `removeVoteFromSale`, `transferVoteOwnership`.
 *   • DIRECT OFFER  — a peer-to-peer proposal recorded in the `trade_offer`
 *                     table that the counterparty must accept. Backed by
 *                     `createTradeOffer`, `acceptTradeOffer`, `cancelTradeOffer`.
 *
 * Every surface calls these helpers so the feedback (toasts + sounds) and error
 * handling are identical everywhere.
 */

import type { DbConnection } from "~/module_bindings";
import { ToastHelper } from "~/lib/toast-helpers";
import { sounds } from "~/lib/sounds";

export type OfferType = "sell_vote" | "buy_vote";

type Conn = DbConnection | null | undefined;

/** Result helper so callers can branch (e.g. close a popup) on success. */
export type TradeResult = { ok: boolean; error?: string };

const ok = (): TradeResult => ({ ok: true });
const fail = (error: string): TradeResult => ({ ok: false, error });

// ── OPEN LISTING model ──────────────────────────────────────────────────────

/** List one of your votes on the open market at a fixed price. */
export function listVote(conn: Conn, voteId: number, price: number): TradeResult {
  if (!conn) return fail("Not connected");
  if (!(price > 0)) {
    ToastHelper.warning("Invalid Price", "Enter a price greater than $0");
    return fail("invalid-price");
  }
  try {
    conn.reducers.setVoteForSale({ voteId, price });
    ToastHelper.success("Vote Listed", `Vote #${voteId} listed for $${price}`);
    return ok();
  } catch (e: any) {
    ToastHelper.error(e?.message || "Failed to list vote");
    sounds.error();
    return fail(e?.message || "list-failed");
  }
}

/** Remove one of your votes from the open market. */
export function unlistVote(conn: Conn, voteId: number): TradeResult {
  if (!conn) return fail("Not connected");
  try {
    conn.reducers.removeVoteFromSale({ voteId });
    ToastHelper.success("Vote Unlisted", `Vote #${voteId} removed from market`);
    return ok();
  } catch (e: any) {
    ToastHelper.error(e?.message || "Failed to remove vote");
    sounds.error();
    return fail(e?.message || "unlist-failed");
  }
}

/** Buy a vote that is currently listed on the open market. */
export function buyListedVote(
  conn: Conn,
  args: { voteId: number; buyerId: string; price: number; walletBalance: number },
): TradeResult {
  if (!conn) return fail("Not connected");
  const { voteId, buyerId, price, walletBalance } = args;
  if (walletBalance < price) {
    ToastHelper.warning(
      "Insufficient Funds",
      `You need $${price.toFixed(2)} but have $${walletBalance.toFixed(2)}`,
    );
    return fail("insufficient-funds");
  }
  try {
    conn.reducers.transferVoteOwnership({ voteId, buyerId, price });
    ToastHelper.success("Vote Purchased", `You bought vote #${voteId} for $${price.toFixed(2)}`);
    sounds.tradeComplete();
    sounds.moneyReceived();
    return ok();
  } catch (e: any) {
    ToastHelper.error(e?.message || "Failed to purchase vote");
    sounds.error();
    return fail(e?.message || "buy-failed");
  }
}

// ── DIRECT OFFER model ──────────────────────────────────────────────────────

/**
 * Post a direct trade offer (peer-to-peer). For `sell_vote` a `voteId` is
 * required; for `buy_vote` it is left undefined (an open bid anyone holding a
 * matching vote can accept).
 */
export function makeOffer(
  conn: Conn,
  args: {
    roomId: number;
    roundNumber: number;
    offerType: OfferType;
    price: number;
    voteId?: number | null;
  },
): TradeResult {
  if (!conn) return fail("Not connected");
  const { roomId, roundNumber, offerType, price } = args;
  if (!(price > 0)) {
    ToastHelper.warning("Invalid Price", "Enter a price greater than $0");
    return fail("invalid-price");
  }
  if (offerType === "sell_vote" && (args.voteId === undefined || args.voteId === null)) {
    ToastHelper.warning("Select a Vote", "Pick which vote to sell");
    return fail("no-vote");
  }
  try {
    conn.reducers.createTradeOffer({
      roomId,
      roundNumber,
      offerType,
      voteId: args.voteId ?? undefined,
      price,
    });
    ToastHelper.success(
      "Offer Posted",
      offerType === "sell_vote"
        ? `Sell offer posted at $${price.toFixed(2)}`
        : `Buy offer posted at $${price.toFixed(2)}`,
    );
    return ok();
  } catch (e: any) {
    ToastHelper.error(e?.message || "Failed to create offer");
    sounds.error();
    return fail(e?.message || "offer-failed");
  }
}

/** Accept a direct trade offer addressed to / available to you. */
export function acceptOffer(conn: Conn, offerId: number): TradeResult {
  if (!conn) return fail("Not connected");
  try {
    conn.reducers.acceptTradeOffer({ offerId });
    ToastHelper.success("Trade Accepted", "The trade has been completed!");
    sounds.tradeComplete();
    sounds.moneyReceived();
    return ok();
  } catch (e: any) {
    ToastHelper.error(e?.message || "Could not complete trade");
    sounds.error();
    return fail(e?.message || "accept-failed");
  }
}

/** Cancel/decline a direct trade offer. */
export function cancelOffer(conn: Conn, offerId: number): TradeResult {
  if (!conn) return fail("Not connected");
  try {
    conn.reducers.cancelTradeOffer({ offerId });
    return ok();
  } catch (e: any) {
    // Only the creator can cancel; a non-creator declining just ignores it.
    return fail(e?.message || "cancel-failed");
  }
}
