import { clientOnly } from "@solidjs/start";

const Leaderboard = clientOnly(() => import("~/components/game/Leaderboard"));

export default function LeaderboardPage() {
  return (
    <main class="container mx-auto p-4">
      <Leaderboard />
    </main>
  );
}

