import { describe, it, expect } from "vitest";
import { isVoteGuaranteed } from "../src/lib/guarantees";

describe("isVoteGuaranteed", () => {
  it("is false when the vote has no guarantee", () => {
    expect(isVoteGuaranteed(1, [], [])).toBe(false);
    expect(isVoteGuaranteed(1, [{ id: 9, voteId: 2, isActive: true }], [])).toBe(false);
  });

  it("is true for an active listing even with no buyer", () => {
    expect(isVoteGuaranteed(1, [{ id: 9, voteId: 1, isActive: true }], [])).toBe(true);
  });

  it("is true after a public sale deactivates the listing", () => {
    expect(
      isVoteGuaranteed(
        1,
        [{ id: 9, voteId: 1, isActive: false }],
        [{ guaranteeId: 9 }],
      ),
    ).toBe(true);
  });

  it("is false for an inactive listing with no purchases", () => {
    expect(isVoteGuaranteed(1, [{ id: 9, voteId: 1, isActive: false }], [])).toBe(false);
  });
});
