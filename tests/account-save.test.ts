import { describe, it, expect } from "vitest";
import { decryptToken, encryptToken, normalizeUsername, validateUsername } from "../src/lib/account-save";

describe("account-save", () => {
  it("normalizes and validates usernames", () => {
    expect(normalizeUsername("  Ada_1 ")).toBe("ada_1");
    expect(validateUsername("Ada_1")).toBe("ada_1");
    expect(() => validateUsername("ab")).toThrow(/3–24/);
    expect(() => validateUsername("not valid")).toThrow(/letters/);
  });

  it("round-trips a token through passphrase encryption", async () => {
    const sealed = await encryptToken("tok_secret_value", "hunter2");
    expect(sealed.saltB64.length).toBeGreaterThan(8);
    expect(sealed.cipherB64.length).toBeGreaterThan(8);
    await expect(decryptToken("hunter2", sealed.saltB64, sealed.nonceB64, sealed.cipherB64)).resolves.toBe(
      "tok_secret_value",
    );
    await expect(decryptToken("wrong-pass", sealed.saltB64, sealed.nonceB64, sealed.cipherB64)).rejects.toThrow(
      /Wrong passphrase/,
    );
  });
});
