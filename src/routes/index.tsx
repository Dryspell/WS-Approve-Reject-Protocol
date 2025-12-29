import { Show } from "solid-js";
import { useSpacetimeDB } from "~/hooks/useSpacetimeDB";

export default function Home() {
  const { identity, connected } = useSpacetimeDB();

  return (
    <main class="w-full space-y-2 p-4">
      <Show when={connected()} fallback={<h2>Connecting to SpacetimeDB...</h2>}>
        <h2 class="text-3xl font-bold">
          Hello {identity()?.toHexString().slice(0, 8)}...
        </h2>
        <h3 class="text-xl font-bold">Welcome to Socket Signals</h3>
        <p class="text-sm text-gray-600">
          Your Identity: {identity()?.toHexString()}
        </p>
      </Show>
    </main>
  );
}
