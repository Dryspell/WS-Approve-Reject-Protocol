import { Component, createSignal, Show, For } from "solid-js";

interface TournamentPanelProps {
  tournaments: any[];
  currentUserId: string;
  onJoin: (tournamentId: number) => void;
  onCreate: (
    name: string,
    entryFee: number,
    maxParticipants: number,
    bracketType: string
  ) => void;
}

function statusColor(status: string): string {
  switch (status) {
    case "registration":
      return "text-amber-400";
    case "active":
      return "text-emerald-400";
    case "completed":
      return "text-white/50";
    default:
      return "text-white/60";
  }
}

function statusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

const TournamentPanel: Component<TournamentPanelProps> = (props) => {
  const [showCreateForm, setShowCreateForm] = createSignal(false);
  const [name, setName] = createSignal("");
  const [entryFee, setEntryFee] = createSignal("0");
  const [maxParticipants, setMaxParticipants] = createSignal("8");
  const [bracketType, setBracketType] = createSignal("single_elimination");

  const handleCreate = () => {
    const n = name().trim();
    const fee = parseFloat(entryFee());
    const max = parseInt(maxParticipants(), 10);
    const bracket = bracketType();
    if (n && !isNaN(fee) && fee >= 0 && !isNaN(max) && max >= 2 && bracket) {
      props.onCreate(n, fee, max, bracket);
      setName("");
      setEntryFee("0");
      setMaxParticipants("8");
      setBracketType("single_elimination");
      setShowCreateForm(false);
    }
  };

  const isParticipant = (tournament: any) =>
    tournament.participantIds?.includes(props.currentUserId) ?? false;

  return (
    <div class="rounded-xl border border-white/10 bg-black/60 p-4 text-white backdrop-blur-xl">
      <div class="mb-3 flex items-center justify-between border-b border-white/10 pb-2">
        <h3 class="text-sm font-semibold text-amber-400">Tournaments</h3>
        <button
          class="rounded-lg bg-amber-600/80 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-500/90"
          onClick={() => setShowCreateForm((v) => !v)}
        >
          Create Tournament
        </button>
      </div>

      {/* Create form */}
      <Show when={showCreateForm()}>
        <div class="mb-4 rounded-lg border border-white/10 bg-white/5 p-3">
          <div class="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
            New Tournament
          </div>
          <div class="space-y-2">
            <input
              type="text"
              placeholder="Name"
              value={name()}
              onInput={(e) => setName(e.currentTarget.value)}
              class="w-full rounded border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white placeholder:text-white/30"
            />
            <div class="flex gap-2">
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Entry fee"
                value={entryFee()}
                onInput={(e) => setEntryFee(e.currentTarget.value)}
                class="flex-1 rounded border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white placeholder:text-white/30"
              />
              <input
                type="number"
                min="2"
                placeholder="Max"
                value={maxParticipants()}
                onInput={(e) => setMaxParticipants(e.currentTarget.value)}
                class="w-16 rounded border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white placeholder:text-white/30"
              />
            </div>
            <select
              value={bracketType()}
              onChange={(e) => setBracketType(e.currentTarget.value)}
              class="w-full rounded border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white"
            >
              <option value="single_elimination">Single Elimination</option>
              <option value="double_elimination">Double Elimination</option>
              <option value="round_robin">Round Robin</option>
            </select>
            <div class="flex gap-2 pt-1">
              <button
                class="flex-1 rounded-lg bg-amber-600/80 py-1.5 text-xs font-medium text-white hover:bg-amber-500/90"
                onClick={handleCreate}
              >
                Create
              </button>
              <button
                class="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 hover:bg-white/5"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </Show>

      {/* Tournament list */}
      <div class="space-y-2">
        <Show
          when={props.tournaments.length > 0}
          fallback={
            <p class="text-xs text-white/40">No tournaments available</p>
          }
        >
          <For each={props.tournaments}>
            {(t) => (
              <div class="rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
                <div class="mb-1.5 flex items-center justify-between">
                  <span class="text-xs font-medium text-white">{t.name}</span>
                  <span
                    class={`text-[10px] ${statusColor(
                      t.status ?? "registration"
                    )}`}
                  >
                    {statusLabel(t.status ?? "registration")}
                  </span>
                </div>
                <div class="mb-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-white/50">
                  <span>Entry: {t.entryFee ?? 0}</span>
                  <span>Prize: {t.prizePool ?? 0}</span>
                  <span>
                    {t.participantIds?.length ?? 0} / {t.maxParticipants ?? 8}{" "}
                    participants
                  </span>
                </div>
                <Show
                  when={
                    (t.status === "registration") &&
                    !isParticipant(t) &&
                    (t.participantIds?.length ?? 0) < (t.maxParticipants ?? 8)
                  }
                >
                  <button
                    class="w-full rounded bg-amber-600/60 py-1 text-[11px] font-medium text-white hover:bg-amber-600/80"
                    onClick={() => props.onJoin(t.id)}
                  >
                    Join
                  </button>
                </Show>
                <Show when={isParticipant(t)}>
                  <div class="text-[10px] text-emerald-400/80">You are registered</div>
                </Show>
              </div>
            )}
          </For>
        </Show>
      </div>
    </div>
  );
};

export default TournamentPanel;
