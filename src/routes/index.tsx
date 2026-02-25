import { Show } from "solid-js";
import { useSpacetimeDB } from "~/hooks/useSpacetimeDB";
import { resolvePlayerName } from "~/lib/game-utils";

export default function Home() {
  const { identity, connected, conn } = useSpacetimeDB();

  return (
    <main class="w-full space-y-2 p-4">
      <Show when={connected()} fallback={<h2>Connecting to SpacetimeDB...</h2>}>
        <h2 class="text-3xl font-bold">
          Hello {identity() ? resolvePlayerName(identity()!.toHexString(), conn()) : ""}
        </h2>
        <h3 class="text-xl font-bold">Welcome to Socket Signals</h3>
        <p class="text-sm text-gray-600">
          Your Identity: {identity() ? resolvePlayerName(identity()!.toHexString(), conn()) : ""}
        </p>
      </Show>
    </main>
  );
}
