/**
 * Client-side vote tally + personal-fate helpers.
 *
 * Mirrors `process_round_votes` in `server/src/lib.rs`:
 *   • At lock, unset tickets are auto-assigned (even split per player;
 *     odd leftovers fill the smaller color). Live HUD still shows unset
 *     until the timer hits.
 *   • Equal red/blue (with at least one cast vote) is a tie — game ends,
 *     pot splits by vote count. 0–0 is undecided, not a tie.
 *   • Majority minions fight in the arena. A player who still holds a vote
 *     survives the vote only with a minority-colored ticket.
 *   • A sold-out hand is not judged by the tally. At end of round, no tickets
 *     remaining means you are out.
 */

export type VoteColor = "red" | "blue";
export type TallyOutcome = VoteColor | "tie" | "undecided";
export type PlayerFate = "survive" | "eliminated" | "tie" | "undecided" | "no_tickets";

export interface TallyVote {
  id?: number;
  color?: string | null;
  playerId?: string;
}

/**
 * Same rule the server uses at lock: each player's unplaced tickets split
 * evenly red/blue. A leftover ticket fills whichever color is behind; a
 * true tie uses the ticket id.
 */
export function applyUnsetAutoAssign(votes: TallyVote[]): TallyVote[] {
  const out = votes.map((v) => ({ ...v }));
  const byPlayer = new Map<string, number[]>();
  out.forEach((vote, index) => {
    if (vote.color === "red" || vote.color === "blue") return;
    const playerId = vote.playerId ?? "";
    const list = byPlayer.get(playerId) ?? [];
    list.push(index);
    byPlayer.set(playerId, list);
  });

  const leftovers: number[] = [];
  for (const indices of byPlayer.values()) {
    indices.sort((a, b) => (out[a].id ?? a) - (out[b].id ?? b));
    const half = Math.floor(indices.length / 2);
    for (let i = 0; i < half; i++) out[indices[i]].color = "red";
    for (let i = 0; i < half; i++) out[indices[half + i]].color = "blue";
    if (indices.length % 2 === 1) leftovers.push(indices[indices.length - 1]);
  }

  leftovers.sort((a, b) => (out[a].id ?? a) - (out[b].id ?? b));
  for (const index of leftovers) {
    let red = 0;
    let blue = 0;
    for (const vote of out) {
      if (vote.color === "red") red++;
      else if (vote.color === "blue") blue++;
    }
    if (red < blue) out[index].color = "red";
    else if (blue < red) out[index].color = "blue";
    else out[index].color = ((out[index].id ?? index) % 2 === 0) ? "red" : "blue";
  }
  return out;
}

export function tallyVotesAtLock(votes: TallyVote[]): VoteTally {
  return tallyVotes(applyUnsetAutoAssign(votes));
}

export interface VoteTally {
  red: number;
  blue: number;
  unset: number;
  totalCast: number;
  /** Color currently in the minority (survives), or tie/undecided. */
  minority: TallyOutcome;
  /** Color currently in the majority (eliminated), or tie/undecided. */
  majority: TallyOutcome;
  isTie: boolean;
  redShare: number;
  blueShare: number;
}

export function tallyVotes(votes: TallyVote[]): VoteTally {
  let red = 0;
  let blue = 0;
  let unset = 0;
  for (const v of votes) {
    if (v.color === "red") red++;
    else if (v.color === "blue") blue++;
    else unset++;
  }
  const totalCast = red + blue;
  const isTie = totalCast > 0 && red === blue;
  let minority: TallyOutcome = "undecided";
  let majority: TallyOutcome = "undecided";
  if (isTie) {
    minority = "tie";
    majority = "tie";
  } else if (red > 0 || blue > 0) {
    minority = red < blue ? "red" : "blue";
    majority = red > blue ? "red" : "blue";
  }
  const denom = Math.max(totalCast, 1);
  return {
    red,
    blue,
    unset,
    totalCast,
    minority,
    majority,
    isTie,
    redShare: red / denom,
    blueShare: blue / denom,
  };
}

/**
 * What happens to this player if the round locked right now.
 * Matches the server: unset tickets are assigned first, then you need a
 * ticket on the minority color.
 */
export function playerFate(playerVotes: TallyVote[], tally: VoteTally): PlayerFate {
  if (playerVotes.length === 0) return "no_tickets";
  const assigned = applyUnsetAutoAssign(playerVotes);
  if (tally.totalCast === 0) return "undecided";
  if (tally.isTie) return "tie";

  const minority = tally.minority as VoteColor;
  const hasMinorityTicket = assigned.some((v) => v.color === minority);
  return hasMinorityTicket ? "survive" : "eliminated";
}

/** Fate against a full room ballot, including how unset tickets will lock. */
export function playerFateAtLock(playerVotes: TallyVote[], roomVotes: TallyVote[]): PlayerFate {
  if (playerVotes.length === 0) return "no_tickets";
  const assignedRoom = applyUnsetAutoAssign(roomVotes);
  const tally = tallyVotes(assignedRoom);
  const playerIds = new Set(playerVotes.map((v) => v.playerId).filter((id): id is string => !!id));
  const playerVoteIds = new Set(playerVotes.map((v) => v.id).filter((id): id is number => id != null));
  const mine = assignedRoom.filter((v) =>
    (v.id != null && playerVoteIds.has(v.id)) || (v.playerId != null && playerIds.has(v.playerId) && playerVoteIds.size === 0),
  );
  const mineOrFallback = mine.length > 0 ? mine : applyUnsetAutoAssign(playerVotes);
  return playerFate(mineOrFallback, tally);
}

export function fateLabel(fate: PlayerFate): string {
  switch (fate) {
    case "survive":
      return "You survive";
    case "eliminated":
      return "You're out";
    case "tie":
      return "Tie — pot splits";
    case "undecided":
      return "Cast a vote to see your fate";
    case "no_tickets":
      return "No votes — buy one before the round ends";
  }
}

export function colorStance(color: VoteColor, tally: VoteTally): "majority" | "minority" | "tie" | "none" {
  if (tally.totalCast === 0) return "none";
  if (tally.isTie) return "tie";
  if (tally.majority === color) return "majority";
  if (tally.minority === color) return "minority";
  return "none";
}

export function stanceLabel(stance: ReturnType<typeof colorStance>): string {
  switch (stance) {
    case "majority":
      return "Majority · eliminated";
    case "minority":
      return "Minority · survives";
    case "tie":
      return "Tied · pot splits";
    case "none":
      return "No votes yet";
  }
}

/**
 * Other players' vote colors stay secret until the round is resolved.
 * Your own votes are always visible so you can recast and trade them.
 */
export function visibleVoteColor(
  ownerId: string | undefined | null,
  color: string | null | undefined,
  currentUserId: string,
  revealed: boolean,
): string | null {
  if (revealed || (!!ownerId && ownerId === currentUserId)) {
    return color ?? null;
  }
  return null;
}

/** Sensible default list price: last trade, else lowest ask, else $5. */
export function suggestedListPrice(lastTrade: number | null, lowestAsk: number | null): number {
  if (lastTrade && lastTrade > 0) return Math.round(lastTrade * 100) / 100;
  if (lowestAsk && lowestAsk > 0) return Math.round(lowestAsk * 100) / 100;
  return 5;
}
