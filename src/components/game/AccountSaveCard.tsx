import { Component, Show, createMemo, createSignal, createEffect } from "solid-js";
import type { DbConnection } from "~/module_bindings/index";
import {
  applyAuthToken,
  decryptToken,
  encryptToken,
  getStoredAuthToken,
  validatePassphrase,
  validateUsername,
} from "~/lib/account-save";
import { showToast } from "../ui/toast";

export default function AccountSaveCard(props: {
  conn: () => DbConnection | null;
  identityHex: string;
  compact?: boolean;
}) {
  const [tick, setTick] = createSignal(0);
  const [username, setUsername] = createSignal("");
  const [passphrase, setPassphrase] = createSignal("");
  const [restoreUser, setRestoreUser] = createSignal("");
  const [restorePass, setRestorePass] = createSignal("");
  const [recoveryCode, setRecoveryCode] = createSignal("");
  const [busy, setBusy] = createSignal(false);
  const [showRecovery, setShowRecovery] = createSignal(false);
  const token = () => getStoredAuthToken();

  createEffect(() => {
    const c = props.conn();
    if (!c) return;
    const bump = () => setTick((n) => n + 1);
    c.db.account_bind.onInsert(bump);
    c.db.account_bind.onUpdate(bump);
    c.db.account_bind.onDelete(bump);
    bump();
  });

  const bound = createMemo(() => {
    tick();
    const c = props.conn();
    const hex = props.identityHex;
    if (!c || !hex) return undefined;
    return Array.from(c.db.account_bind.iter()).find((row) => row.identityHex === hex);
  });

  const copyRecovery = async () => {
    const value = token();
    if (!value) {
      showToast({ title: "No recovery code", description: "Connect first so this browser has a save.", variant: "error", duration: 3000 });
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      showToast({ title: "Recovery code copied", description: "Keep it private. It restores this exact save.", variant: "success", duration: 3000 });
    } catch {
      showToast({ title: "Copy failed", description: "Select the code and copy it yourself.", variant: "error", duration: 3000 });
    }
  };

  const createAccount = async (e: Event) => {
    e.preventDefault();
    const connection = props.conn();
    const value = token();
    if (!connection || !value) {
      showToast({ title: "Cannot bind yet", description: "This browser has no save token.", variant: "error", duration: 3000 });
      return;
    }
    setBusy(true);
    try {
      const name = validateUsername(username());
      validatePassphrase(passphrase());
      const sealed = await encryptToken(value, passphrase());
      await connection.reducers.bindAccount({
        username: name,
        saltB64: sealed.saltB64,
        nonceB64: sealed.nonceB64,
        cipherB64: sealed.cipherB64,
      });
      setPassphrase("");
      showToast({ title: "Account saved", description: `Restore with ${name} and your passphrase on any browser.`, variant: "success", duration: 4000 });
    } catch (err) {
      showToast({ title: "Could not create account", description: String(err), variant: "error", duration: 4000 });
    } finally {
      setBusy(false);
    }
  };

  const restoreAccount = async (e: Event) => {
    e.preventDefault();
    const connection = props.conn();
    setBusy(true);
    try {
      if (recoveryCode().trim()) {
        applyAuthToken(recoveryCode());
        return;
      }
      const name = validateUsername(restoreUser());
      validatePassphrase(restorePass());
      const row = connection
        ? Array.from(connection.db.account_bind.iter()).find((b) => b.username === name)
        : undefined;
      if (!row) {
        throw new Error("No account with that username");
      }
      const restored = await decryptToken(restorePass(), row.saltB64, row.nonceB64, row.cipherB64);
      applyAuthToken(restored);
    } catch (err) {
      showToast({ title: "Could not restore", description: String(err), variant: "error", duration: 4000 });
      setBusy(false);
    }
  };

  return (
    <div class="rounded-lg border border-white/10 bg-white/5 p-3 text-left">
      <div class="mb-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">
        Keep this save
      </div>
      <p class="text-[11px] text-white/55">
        Roster and stash already sit on this identity. Skipping only keeps them in this browser until storage is cleared.
      </p>
      <Show when={bound()}>
        <p class="mt-2 text-[11px] text-emerald-300/80">
          Bound as <span class="font-semibold">{bound()!.username}</span>. Use that name and passphrase on another browser.
        </p>
      </Show>
      <div class="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          class="rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] text-white/70 hover:bg-white/10"
          onClick={copyRecovery}
        >
          Copy recovery code
        </button>
        <button
          type="button"
          class="rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] text-white/70 hover:bg-white/10"
          onClick={() => setShowRecovery((v) => !v)}
        >
          {showRecovery() ? "Hide code" : "Show code"}
        </button>
      </div>
      <Show when={showRecovery() && token()}>
        <p class="mt-2 break-all rounded bg-black/40 px-2 py-1.5 font-mono text-[10px] text-white/50">
          {token()}
        </p>
      </Show>
      <Show when={!bound()}>
        <form class="mt-3 space-y-2" onSubmit={createAccount}>
          <div class="text-[10px] font-semibold uppercase tracking-wider text-white/35">Create account</div>
          <input
            class="w-full rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-[12px] text-white placeholder-white/30"
            placeholder="Username"
            maxlength={24}
            value={username()}
            onInput={(e) => setUsername(e.currentTarget.value)}
          />
          <input
            type="password"
            class="w-full rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-[12px] text-white placeholder-white/30"
            placeholder="Passphrase (6+ characters)"
            value={passphrase()}
            onInput={(e) => setPassphrase(e.currentTarget.value)}
          />
          <button
            type="submit"
            disabled={busy()}
            class="w-full rounded-md bg-emerald-600/80 px-2 py-1.5 text-[12px] font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            Bind this save
          </button>
        </form>
      </Show>
      <Show when={!props.compact}>
        <form class="mt-3 space-y-2 border-t border-white/10 pt-3" onSubmit={restoreAccount}>
          <div class="text-[10px] font-semibold uppercase tracking-wider text-white/35">Restore another save</div>
          <input
            class="w-full rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-[12px] text-white placeholder-white/30"
            placeholder="Username"
            value={restoreUser()}
            onInput={(e) => setRestoreUser(e.currentTarget.value)}
          />
          <input
            type="password"
            class="w-full rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-[12px] text-white placeholder-white/30"
            placeholder="Passphrase"
            value={restorePass()}
            onInput={(e) => setRestorePass(e.currentTarget.value)}
          />
          <input
            class="w-full rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-[12px] text-white placeholder-white/30"
            placeholder="Or paste a recovery code"
            value={recoveryCode()}
            onInput={(e) => setRecoveryCode(e.currentTarget.value)}
          />
          <button
            type="submit"
            disabled={busy()}
            class="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-[12px] text-white/80 hover:bg-white/10 disabled:opacity-50"
          >
            Restore and reload
          </button>
        </form>
      </Show>
    </div>
  );
}
