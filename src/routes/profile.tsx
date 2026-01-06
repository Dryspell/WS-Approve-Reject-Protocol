import { clientOnly } from "@solidjs/start";

const PlayerProfile = clientOnly(() => import("~/components/game/PlayerProfile"));

export default function ProfilePage() {
  return (
    <main class="container mx-auto p-4">
      <PlayerProfile isOwnProfile={true} />
    </main>
  );
}

