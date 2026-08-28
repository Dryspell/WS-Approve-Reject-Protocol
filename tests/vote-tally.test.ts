import { describe, it, expect } from "vitest";
import {
  tallyVotes,
  tallyVotesAtLock,
  applyUnsetAutoAssign,
  playerFate,
  playerFateAtLock,
  colorStance,
  suggestedListPrice,
  visibleVoteColor,
  type TallyVote,
} from "../src/lib/vote-tally";

const v = (color: string | null, playerId = "me"): TallyVote => ({ color, playerId });

describe("tallyVotes", () => {
  it("counts red, blue, and unset separately", () => {
    const t = tallyVotes([v("red"), v("red"), v("blue"), v(null)]);
    expect(t.red).toBe(2);
    expect(t.blue).toBe(1);
    expect(t.unset).toBe(1);
    expect(t.totalCast).toBe(3);
    expect(t.majority).toBe("red");
    expect(t.minority).toBe("blue");
    expect(t.isTie).toBe(false);
  });

  it("treats equal red/blue as a tie once any vote is cast", () => {
    const t = tallyVotes([v("red"), v("blue")]);
    expect(t.isTie).toBe(true);
    expect(t.majority).toBe("tie");
    expect(t.minority).toBe("tie");
  });

  it("is undecided when nobody has cast", () => {
    const t = tallyVotes([v(null), v(null)]);
    expect(t.totalCast).toBe(0);
    expect(t.majority).toBe("undecided");
    expect(t.isTie).toBe(false);
  });
});

describe("playerFate", () => {
  it("survives with at least one minority vote (split)", () => {
    const tally = tallyVotes([v("red", "a"), v("red", "a"), v("red", "a"), v("blue", "me"), v("red", "me")]);
    expect(tally.majority).toBe("red");
    expect(playerFate([v("blue"), v("red")], tally)).toBe("survive");
  });

  it("is eliminated when every vote is on the majority", () => {
    const tally = tallyVotes([v("red"), v("red"), v("red"), v("blue")]);
    expect(playerFate([v("red"), v("red")], tally)).toBe("eliminated");
  });

  it("hedges an unset leftover onto the minority color", () => {
    const tally = tallyVotes([v("red"), v("red"), v("blue")]);
    expect(playerFate([v("red", "me"), v(null, "me")], tally)).toBe("survive");
  });

  it("splits two uncast tickets so the player keeps a minority vote", () => {
    const room = [v("red", "a"), v("red", "a"), v("blue", "b"), v(null, "me"), v(null, "me")];
    expect(playerFateAtLock([v(null, "me"), v(null, "me")], room)).toBe("survive");
  });

  it("is not judged by the tally after selling every ticket", () => {
    const tally = tallyVotes([v("red", "a"), v("red", "a"), v("blue", "b")]);
    expect(playerFate([], tally)).toBe("no_tickets");
  });

  it("reports tie when the board is tied", () => {
    const tally = tallyVotes([v("red"), v("blue")]);
    expect(playerFate([v("red")], tally)).toBe("tie");
  });
});

describe("applyUnsetAutoAssign", () => {
  it("splits a player's uncast tickets evenly", () => {
    const assigned = applyUnsetAutoAssign([
      { id: 1, color: null, playerId: "me" },
      { id: 2, color: null, playerId: "me" },
    ]);
    const colors = assigned.map((v) => v.color).sort();
    expect(colors).toEqual(["blue", "red"]);
  });

  it("sends a leftover ticket to the smaller color", () => {
    const assigned = applyUnsetAutoAssign([
      { id: 1, color: "red", playerId: "a" },
      { id: 2, color: "red", playerId: "a" },
      { id: 3, color: null, playerId: "me" },
    ]);
    expect(assigned.find((v) => v.id === 3)?.color).toBe("blue");
  });

  it("counts auto-assigned tickets in the lock tally", () => {
    const t = tallyVotesAtLock([v(null, "a"), v(null, "a"), v(null, "b")]);
    expect(t.totalCast).toBe(3);
    expect(t.unset).toBe(0);
    expect(t.isTie).toBe(false);
  });
});

describe("colorStance", () => {
  it("labels the leading color as majority", () => {
    const t = tallyVotes([v("red"), v("red"), v("blue")]);
    expect(colorStance("red", t)).toBe("majority");
    expect(colorStance("blue", t)).toBe("minority");
  });
});

describe("visibleVoteColor", () => {
  it("always shows your own color", () => {
    expect(visibleVoteColor("me", "red", "me", false)).toBe("red");
  });

  it("hides another player's color until the round is revealed", () => {
    expect(visibleVoteColor("them", "blue", "me", false)).toBeNull();
    expect(visibleVoteColor("them", "blue", "me", true)).toBe("blue");
  });
});

describe("suggestedListPrice", () => {
  it("prefers last trade, then lowest ask, then $5", () => {
    expect(suggestedListPrice(8, 3)).toBe(8);
    expect(suggestedListPrice(null, 3.5)).toBe(3.5);
    expect(suggestedListPrice(null, null)).toBe(5);
  });
});
