import { SignalType } from "~/types/socket";
import useDataFetching from "~/hooks/useDataFetching";

export default function PokemonFetchPage() {
  const { Interface: PokemonFetcher } = useDataFetching(SignalType.Pokemon);

  return (
    <main class="mx-auto p-4 text-gray-700">
      <div>
        <PokemonFetcher />
      </div>
    </main>
  );
}
