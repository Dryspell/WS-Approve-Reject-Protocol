import { describe, it, expect } from "vitest";
import { encodeWhisper, parseWhisper, WHISPER_PREFIX } from "../src/lib/whisper";

describe("whisper encoding", () => {
  it("round-trips a private message", () => {
    const encoded = encodeWhisper("abc123", "want to buy your blue?");
    expect(encoded.startsWith(WHISPER_PREFIX)).toBe(true);
    expect(parseWhisper(encoded)).toEqual({
      toPlayerId: "abc123",
      body: "want to buy your blue?",
    });
  });

  it("returns null for ordinary chat", () => {
    expect(parseWhisper("hello everyone")).toBeNull();
  });

  it("rejects a malformed prefix payload", () => {
    expect(parseWhisper(`${WHISPER_PREFIX}nocolon`)).toBeNull();
  });
});
