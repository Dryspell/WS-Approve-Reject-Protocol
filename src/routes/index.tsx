import { createId } from "@paralleldrive/cuid2";
import { Component, ComponentProps, For, onMount } from "solid-js";
import { Flex } from "~/components/ui/flex";
import { socket } from "~/lib/socket";
import {
	clientSocket,
	ClientToServerEvents,
	CS_CommunicationType,
	SC_ComType,
	SignalType,
} from "~/types/socket";
import { createStore } from "solid-js/store";

const useSocketCounter = (socket: clientSocket, sigId: string) => {
	const [counters, setCounters] = createStore<{
		[counterId: string]: number;
	}>({});

	type Request = Parameters<ClientToServerEvents[SignalType.Counter]>[0];
	const cache = new Map<string, Request>();

	socket.on(SignalType.Counter, ([type, comId, data]) => {
		const request = cache.get(comId);

		if (!request) {
			switch (type) {
				case SC_ComType.Approve: {
					console.error("Received unexpected approve signal");
					break;
				}

				case SC_ComType.Reject: {
					console.error("Received unexpected reject signal");
					break;
				}

				case SC_ComType.Set: {
					const [sigId, amount] = data;
					setCounters({ [sigId]: amount });
					break;
				}

				case SC_ComType.Delta: {
					const [sigId, amount] = data;
					setCounters({ [sigId]: counters[sigId] + amount });
					break;
				}

				default: {
					console.error(`Received unexpected signal type: ${type}`);
				}
			}
		} else {
			switch (request[0]) {
				case CS_CommunicationType.Get: {
					const counters = data?.[0];
					if (typeof counters !== "object") {
						throw new Error(
							"Expected Unreachable: Invalid data received"
						);
					}
					setCounters(counters);
					break;
				}

				case CS_CommunicationType.GetOrCreate: {
					const [sigId] = request[2];
					const counter = data?.[0];
					if (typeof counter !== "number") return;
					setCounters({ [sigId]: counter });
					break;
				}

				case CS_CommunicationType.Delta: {
					const [sigId, delta] = request[2];
					setCounters({ [sigId]: counters[sigId] + delta });
					break;
				}
			}
		}
	});

	const delta = (d: number) => {
		const comId = createId();
		const request: Request = [
			CS_CommunicationType.Delta,
			comId,
			[sigId, d],
		];
		cache.set(comId, request);
		socket.emit(SignalType.Counter, request);
	};

	const Counters: Component<ComponentProps<"div">> = (rawProps) => {
		onMount(() => {
			const comId = createId();
			const request: Request = [CS_CommunicationType.Get, comId];
			cache.set(comId, request);
			socket.emit(SignalType.Counter, request);

			const comId2 = createId();
			const request2: Request = [
				CS_CommunicationType.GetOrCreate,
				comId2,
				[sigId],
			];
			cache.set(comId2, request2);
			socket.emit(SignalType.Counter, request2);
		});

		return (
			<Flex
				flexDirection="row"
				justifyContent="center"
				alignItems="center"
				{...rawProps}
			>
				<For each={Object.entries(counters)}>
					{([id, value]) => (
						<>
							<button
								class="w-[200px] rounded-full bg-gray-100 border-2 border-gray-300 focus:border-gray-400 active:border-gray-400 px-[2rem] py-[1rem]"
								onClick={() => delta(-1)}
							>
								Decrement
							</button>
							<h2 class="text-2xl font-thin text-gray-700 px-[2rem]">{`${id}: ${value}`}</h2>
							<button
								class="w-[200px] rounded-full bg-gray-100 border-2 border-gray-300 focus:border-gray-400 active:border-gray-400 px-[2rem] py-[1rem]"
								onClick={() => delta(1)}
							>
								Increment
							</button>
						</>
					)}
				</For>
			</Flex>
		);
	};

	return { Counters };
};

export default function Home() {
	socket.on("connect", () => {
		console.log("connected to server!!");
	});

	const { Counters } = useSocketCounter(socket, "1");

	return (
		<main class="text-center mx-auto text-gray-700 p-4">
			<h1 class="max-6-xs text-6xl text-sky-700 font-thin uppercase my-16">
				Hello world!
			</h1>
			<div>
				<Counters class="py-[1rem]" />
			</div>
		</main>
	);
}
