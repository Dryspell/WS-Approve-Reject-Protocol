import { socket } from "~/lib/socket";
import useSocketCounter from "~/hooks/useSocketCounter";
import { SignalType } from "~/types/socket";
import useDataFetching from "~/hooks/useDataFetching";
import Serialization from "~/components/Serialization";

export default function Home() {
	socket.on("connect", () => {
		console.log("connected to server!!");
	});

	const { Counters } = useSocketCounter(socket, "1");
	const { Interface: PokemonFetcher } = useDataFetching(
		socket,
		SignalType.Pokemon
	);

	return (
		<main class="mx-auto text-gray-700 p-4">
			<div class="text-center">
				<h1 class="max-6-xs text-6xl text-sky-700 font-thin uppercase my-16">
					Hello world!
				</h1>
			</div>
			{/* <Serialization /> */}
			<div>
				<PokemonFetcher />
				<Counters class="py-[1rem]" />
			</div>
		</main>
	);
}
