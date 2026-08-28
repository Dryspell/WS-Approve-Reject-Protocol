export const AUTH_TOKEN_KEY = "stdb_auth_token";

const PBKDF2_ITERATIONS = 100_000;
const KEY_BITS = 256;

export function getStoredAuthToken(): string | null {
  if (typeof localStorage === "undefined") return null;
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  return token && token.trim() ? token : null;
}

export function applyAuthToken(token: string): void {
  const trimmed = token.trim();
  if (!trimmed) throw new Error("Paste a recovery code first");
  localStorage.setItem(AUTH_TOKEN_KEY, trimmed);
  window.location.reload();
}

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateUsername(raw: string): string {
  const name = normalizeUsername(raw);
  if (name.length < 3 || name.length > 24) {
    throw new Error("Username must be 3–24 characters");
  }
  if (!/^[a-z0-9_]+$/.test(name)) {
    throw new Error("Username can only use letters, numbers, and underscore");
  }
  return name;
}

export function validatePassphrase(passphrase: string): void {
  if (passphrase.length < 6) {
    throw new Error("Passphrase must be at least 6 characters");
  }
}

function bytesToB64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function b64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: KEY_BITS },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptToken(
  token: string,
  passphrase: string,
): Promise<{ saltB64: string; nonceB64: string; cipherB64: string }> {
  validatePassphrase(passphrase);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce },
    key,
    new TextEncoder().encode(token),
  );
  return {
    saltB64: bytesToB64(salt),
    nonceB64: bytesToB64(nonce),
    cipherB64: bytesToB64(new Uint8Array(cipher)),
  };
}

export async function decryptToken(
  passphrase: string,
  saltB64: string,
  nonceB64: string,
  cipherB64: string,
): Promise<string> {
  const key = await deriveKey(passphrase, b64ToBytes(saltB64));
  try {
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: b64ToBytes(nonceB64) as BufferSource },
      key,
      b64ToBytes(cipherB64) as BufferSource,
    );
    return new TextDecoder().decode(plain);
  } catch {
    throw new Error("Wrong passphrase or damaged save");
  }
}
