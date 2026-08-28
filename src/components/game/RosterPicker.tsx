import { Accessor, For, Show, createMemo, createSignal, createEffect } from "solid-js";
import type { Identity } from "spacetimedb";
import type { DbConnection } from "~/module_bindings/index";
import type { OwnedEquipment, OwnedLaborer, PlayerStash } from "~/module_bindings/types";
import { doubleChancePercent } from "~/lib/skills";
import { showToast } from "../ui/toast";

const ORIGIN_LABEL: Record<string, string> = {
  sent_home: "Sent home",
  arena: "Arena",
  match_end: "Survived",
};

function stashBits(stash: PlayerStash | undefined): { label: string; n: number }[] {
  if (!stash) return [];
  return [
    { label: "Wood", n: stash.wood },
    { label: "Stone", n: stash.stone },
    { label: "Ore", n: stash.metalOre },
    { label: "Planks", n: stash.lumber },
    { label: "Blocks", n: stash.cutStone },
    { label: "Ingots", n: stash.metalIngot },
  ].filter((r) => r.n > 0);
}

export default function RosterPicker(props: {
  conn: Accessor<DbConnection | null>;
  identity: Accessor<Identity | undefined>;
  roomId: number;
  votesPerPlayer: number;
}) {
  const me = createMemo(() => props.identity()?.toHexString());
  const [tick, setTick] = createSignal(0);

  createEffect(() => {
    const c = props.conn();
    if (!c) return;
    const bump = () => setTick((n) => n + 1);
    c.db.owned_laborer.onInsert(bump);
    c.db.owned_laborer.onDelete(bump);
    c.db.owned_equipment.onInsert(bump);
    c.db.owned_equipment.onDelete(bump);
    c.db.roster_pick.onInsert(bump);
    c.db.roster_pick.onDelete(bump);
    c.db.player_stash.onInsert(bump);
    c.db.player_stash.onUpdate(bump);
    bump();
  });

  const veterans = createMemo<OwnedLaborer[]>(() => {
    tick();
    const c = props.conn();
    const id = me();
    if (!c || !id) return [];
    return Array.from(c.db.owned_laborer.iter())
      .filter((lab) => lab.ownerId === id)
      .sort((a, b) => b.woodcuttingLevel + b.miningLevel + b.craftingLevel - (a.woodcuttingLevel + a.miningLevel + a.craftingLevel));
  });

  const pickedIds = createMemo<Set<number>>(() => {
    tick();
    const c = props.conn();
    const id = me();
    if (!c || !id) return new Set();
    return new Set(
      Array.from(c.db.roster_pick.iter())
        .filter((p) => p.roomId === props.roomId && p.playerId === id)
        .map((p) => p.laborerId),
    );
  });

  const stash = createMemo<PlayerStash | undefined>(() => {
    tick();
    const c = props.conn();
    const id = me();
    if (!c || !id) return undefined;
    return Array.from(c.db.player_stash.iter()).find((s) => s.playerId === id);
  });

  const gearByLaborer = createMemo<Map<number, OwnedEquipment[]>>(() => {
    tick();
    const c = props.conn();
    const map = new Map<number, OwnedEquipment[]>();
    if (!c) return map;
    for (const item of c.db.owned_equipment.iter()) {
      const list = map.get(item.laborerId) ?? [];
      list.push(item);
      map.set(item.laborerId, list);
    }
    return map;
  });

  const recruits = () => Math.max(0, props.votesPerPlayer - pickedIds().size);

  const toggle = (laborerId: number) => {
    const c = props.conn();
    if (!c) return;
    const next = new Set(pickedIds());
    if (next.has(laborerId)) next.delete(laborerId);
    else {
      if (next.size >= props.votesPerPlayer) {
        showToast({ title: "Party full", description: `You can bring ${props.votesPerPlayer} veterans.`, variant: "error", duration: 2500 });
        return;
      }
      next.add(laborerId);
    }
    try {
      c.reducers.setRosterPicks({ roomId: props.roomId, laborerIds: [...next] });
    } catch (e) {
      showToast({ title: "Could not set roster", description: String(e), variant: "error", duration: 3000 });
    }
  };

  return (
    <div class="rounded-xl border border-white/10 bg-black/50 backdrop-blur-md p-3 text-white">
      <div class="mb-2 flex items-center justify-between">
        <div>
          <div class="text-xs font-semibold uppercase tracking-wider text-white/50">Expedition party</div>
          <p class="text-[11px] text-white/40">
            {pickedIds().size} veteran{pickedIds().size === 1 ? "" : "s"} · {recruits()} recruit{recruits() === 1 ? "" : "s"}
          </p>
          <p class="mt-1 text-[10px] text-white/30">
            Veterans sent home during a match stay out of that expedition. They only return here in the next lobby.
          </p>
        </div>
        <Show when={stashBits(stash()).length > 0}>
          <div class="flex flex-wrap gap-1 justify-end">
            <For each={stashBits(stash())}>
              {(bit) => (
                <span class="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-white/50">
                  {bit.n} {bit.label}
                </span>
              )}
            </For>
          </div>
        </Show>
      </div>
      <Show
        when={veterans().length > 0}
        fallback={
          <p class="text-[11px] text-white/35">
            No veterans yet. Send a minion home or win a match and they will wait here for the next lobby.
          </p>
        }
      >
        <div class="max-h-40 space-y-1 overflow-y-auto">
          <For each={veterans()}>
            {(lab) => {
              const on = () => pickedIds().has(lab.id);
              return (
                <button
                  class="flex w-full items-center justify-between rounded-lg border px-2 py-1.5 text-left transition-all"
                  classList={{
                    "border-emerald-500/40 bg-emerald-500/15": on(),
                    "border-white/5 bg-white/[0.03] hover:bg-white/[0.06]": !on(),
                  }}
                  onClick={() => toggle(lab.id)}
                >
                  <div>
                    <div class="text-[11px] font-medium text-white/80">{lab.displayName}</div>
                    <div class="text-[10px] text-white/35">
                      {ORIGIN_LABEL[lab.origin] ?? lab.origin}
                      {" · "}W L{lab.woodcuttingLevel} {doubleChancePercent(lab.woodcuttingLevel)}%
                      {" · "}M L{lab.miningLevel}
                      {" · "}C L{lab.craftingLevel}
                    </div>
                    <Show when={(gearByLaborer().get(lab.id) ?? []).length > 0}>
                      <div class="text-[10px] text-amber-300/70">
                        {(gearByLaborer().get(lab.id) ?? []).map((g) => g.itemName).join(" · ")}
                      </div>
                    </Show>
                  </div>
                  <span class="text-[10px] text-white/40">{on() ? "Bringing" : "Leave"}</span>
                </button>
              );
            }}
          </For>
        </div>
      </Show>
    </div>
  );
}
