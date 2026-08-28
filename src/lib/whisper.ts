/** In-room whisper encoding. Stored as a normal chat row; the UI only
 *  renders it for the sender and the named recipient. */

export const WHISPER_PREFIX = "__nf_w__:";

export function encodeWhisper(toPlayerId: string, text: string): string {
  return `${WHISPER_PREFIX}${toPlayerId}:${text}`;
}

export function parseWhisper(text: string): { toPlayerId: string; body: string } | null {
  if (!text.startsWith(WHISPER_PREFIX)) return null;
  const rest = text.slice(WHISPER_PREFIX.length);
  const idx = rest.indexOf(":");
  if (idx < 1) return null;
  return { toPlayerId: rest.slice(0, idx), body: rest.slice(idx + 1) };
}
