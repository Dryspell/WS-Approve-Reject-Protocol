import { SignalType } from "~/types/socket";
import useDataFetching from "~/hooks/useDataFetching";

export default function PokemonFetchPage() {
	const { Interface: PokemonFetcher } = useDataFetching(SignalType.Pokemon);

	return (
		<main class="mx-auto text-gray-700 p-4">
			<div>
				<PokemonFetcher />
			</div>
		</main>
	);
}
