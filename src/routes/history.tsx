import { clientOnly } from "@solidjs/start";

const MatchHistory = clientOnly(() => import("~/components/game/MatchHistory"));

export default function HistoryPage() {
  return (
    <main class="container mx-auto max-w-3xl p-4 space-y-4">
      <div class="flex items-center gap-3">
        <h1 class="text-2xl font-bold text-white">Match History</h1>
      </div>
      <MatchHistory />
    </main>
  );
}
