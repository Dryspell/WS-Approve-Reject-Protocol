import { SignalType } from "~/types/socket";
import useDataFetching from "~/hooks/useDataFetching";
import { socket } from "~/lib/Client/socket";

export default function PokemonFetchPage() {
	socket.on("connect", () => {
		console.log("connected to server!!");
	});

	const { Interface: PokemonFetcher } = useDataFetching(
		socket,
		SignalType.Pokemon
	);

	return (
		<main class="mx-auto text-gray-700 p-4">
			<div>
				<PokemonFetcher />
			</div>
		</main>
	);
}
