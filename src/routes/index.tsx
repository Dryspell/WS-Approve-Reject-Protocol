import { createId } from "@paralleldrive/cuid2";
import { Component, ComponentProps, createSignal } from "solid-js";
import { Flex } from "~/components/ui/flex";
import { socket } from "~/lib/socket";
import {
	CA,
	clientSocket,
	CS_Communication,
	CS_CommunicationType,
	SC_ComType,
} from "~/types/socket";

type IncrementRequest = [
	CA.Increment,
	CS_Communication,
	[signalId: string, amount: number]
];
type DecrementRequest = [
	CA.Decrement,
	CS_Communication,
	[signalId: string, amount: number]
];
type Request = IncrementRequest | DecrementRequest;

const useSocketCounter = (
	socket: clientSocket,
	signalId: string,
	defaultValue: number
) => {
	const [count, setCount] = createSignal(defaultValue);

	const cache = new Map<string, Request>();

	const increment = (amount: number) => {
		const comId = createId();
		const request: Request = [
			CA.Increment,
			[CS_CommunicationType.Request, comId],
			[signalId, amount],
		];
		cache.set(comId, request);
		socket.emit(...request);
		// console.info("Increment request sent", request);
	};

	socket.on(CA.Increment, ([type, communicationId]) => {
		if (!communicationId) return;
		const request = cache.get(communicationId);
		if (!request) return;

		const [, , [sigId, amount]] = request;

		cache.delete(communicationId);
		if (type === SC_ComType.Approve) {
			// console.info("Increment request approved", request);
			setCount(count() + amount);
		} else {
			console.error("Increment request rejected");
		}
	});

	const decrement = (amount: number) => {
		const comId = createId();
		const request: Request = [
			CA.Decrement,
			[CS_CommunicationType.Request, comId],
			[signalId, amount],
		];
		cache.set(comId, request);
		socket.emit(...request);
		// console.info("Decrement request sent", request);
	};

	socket.on(CA.Decrement, ([type, communicationId]) => {
		if (!communicationId) return;
		const request = cache.get(communicationId);
		if (!request) return;

		const [, , [sigId, amount]] = request;

		cache.delete(communicationId);
		if (type === SC_ComType.Approve) {
			// console.info("Decrement request approved", request);
			setCount(count() - amount);
		} else {
			console.error("Decrement request rejected");
		}
	});

	const Counter: Component<ComponentProps<"div">> = (rawProps) => {
		return (
			<Flex
				flexDirection="row"
				justifyContent="center"
				alignItems="center"
				{...rawProps}
			>
				<button
					class="w-[200px] rounded-full bg-gray-100 border-2 border-gray-300 focus:border-gray-400 active:border-gray-400 px-[2rem] py-[1rem]"
					onClick={() => decrement(1)}
				>
					Decrement
				</button>
				<h2 class="text-2xl font-thin text-gray-700 px-[2rem]">
					Clicks: {count()}
				</h2>
				<button
					class="w-[200px] rounded-full bg-gray-100 border-2 border-gray-300 focus:border-gray-400 active:border-gray-400 px-[2rem] py-[1rem]"
					onClick={() => increment(1)}
				>
					Increment
				</button>
			</Flex>
		);
	};

	return { increment, decrement, count, Counter };
};

export default function Home() {
	socket.on("connect", () => {
		console.log("connected to server!!");
	});

	const { Counter: Counter1 } = useSocketCounter(socket, "1", 0);
	const { Counter: Counter2 } = useSocketCounter(socket, "2", 0);

	return (
		<main class="text-center mx-auto text-gray-700 p-4">
			<h1 class="max-6-xs text-6xl text-sky-700 font-thin uppercase my-16">
				Hello world!
			</h1>
			<div>
				<Counter1 class="py-[1rem]" />
				<Counter2 class="py-[1rem]" />
			</div>
		</main>
	);
}
