import { socket } from "~/lib/socket";
import useSocketCounter from "~/hooks/useSocketCounter";
import { SignalType } from "~/types/socket";
import useDataFetching from "~/hooks/useDataFetching";
import { deepClone, serialize } from "~/types/utils";
import { deserialize } from "../types/utils";

export default function Home() {
	socket.on("connect", () => {
		console.log("connected to server!!");
	});

	const { Counters } = useSocketCounter(socket, "1");
	const { Interface: PokemonFetcher } = useDataFetching(
		socket,
		SignalType.Pokemon
	);

	const testSerialObject = {
		greeting: "Welcome to quicktype!",
		instructions: [
			"Type or paste JSON here",
			"Or choose a sample above",
			"quicktype will generate code in your",
			"chosen language to parse the sample data",
		],
		sampleNest: {
			language: "TypeScript",
			sample: {
				"Hello, world!": {
					language: "TypeScript",
					source: 'console.log("Hello, world!")',
				},
			},
		},
	};

	const serialized = serialize(deepClone(testSerialObject));
	const deserialized = deserialize(
		deepClone(serialized),
		deepClone(testSerialObject)
	);

	return (
		<main class="mx-auto text-gray-700 p-4">
			<div class="text-center">
				<h1 class="max-6-xs text-6xl text-sky-700 font-thin uppercase my-16">
					Hello world!
				</h1>
			</div>
			<div class="grid grid-cols-3 gap-4">
				<pre>{JSON.stringify(testSerialObject, null, 2)}</pre>
				<pre>{JSON.stringify(serialized, null, 2)}</pre>
				<pre>{JSON.stringify(deserialized, null, 2)}</pre>
			</div>
			<div>
				<PokemonFetcher />
				<Counters class="py-[1rem]" />
			</div>
		</main>
	);
}
