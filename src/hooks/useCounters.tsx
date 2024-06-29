import { createId } from "@paralleldrive/cuid2";
import { Component, ComponentProps, For, onMount, useContext } from "solid-js";
import { Flex } from "~/components/ui/flex";
import {
	clientSocket,
	CS_ComType,
	SC_ComType,
	SignalType,
} from "~/types/socket";
import { createStore, SetStoreFunction } from "solid-js/store";
import { showToast } from "~/components/ui/toast";
import { DEFAULT_REQUEST_TIMEOUT } from "~/lib/Client/socket";
import { InferCallbackData } from "~/types/socket-utils";
import { CounterHandlerArgs } from "~/lib/Server/counters";
import { SocketContext } from "~/app";

export const counterHandler =
	(
		counters: {
			[counterId: string]: number;
		},
		setCounters: SetStoreFunction<{
			[counterId: string]: number;
		}>
	) =>
	([type, comId, data]:
		| [
				type: SC_ComType.Approve,
				comId: string,
				data?:
					| [amount: number]
					| [counters: { [sigId: string]: number }]
		  ]
		| [type: SC_ComType.Reject, comId: string, data: [reason: string]]
		| [
				type: SC_ComType.Delta,
				comId: string,
				data: [sigId: string, amount: number]
		  ]
		| [
				type: SC_ComType.Set,
				comId: string,
				data: [sigId: string, amount: number]
		  ]) => {
		switch (type) {
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
				console.error(
					`Received unexpected signal type: ${SC_ComType[type]}`
				);
			}
		}
	};

export default function useSocketCounter(sigId: string) {
	const [counters, setCounters] = createStore<{
		[counterId: string]: number;
	}>({});

	const socket = useContext(SocketContext);
	socket.on(SignalType.Counter, counterHandler(counters, setCounters));

	const delta = (delt: number) => {
		const comId = createId();
		// const initialTs = performance.now();

		socket
			.timeout(DEFAULT_REQUEST_TIMEOUT)
			.emit(
				SignalType.Counter,
				CS_ComType.Delta,
				[comId, [sigId, delt]],
				(
					err: Error,
					response: InferCallbackData<
						CounterHandlerArgs,
						CS_ComType.Delta
					>
				) => {
					if (err) {
						showToast({
							title: "Error",
							description: err.message,
							variant: "error",
							duration: 5000,
						});
						return;
					}
					if (response[0] === SC_ComType.Reject) {
						showToast({
							title: "Error",
							description: response[2][0],
							variant: "error",
							duration: 5000,
						});
						return;
					}
					// console.log(
					// 	`Delta took ${performance.now() - initialTs}ms`
					// );
					setCounters({ [sigId]: counters[sigId] + delt });
				}
			);
	};

	const Counters: Component<ComponentProps<"div">> = (rawProps) => {
		onMount(() => {
			const comId = createId();
			socket
				.timeout(DEFAULT_REQUEST_TIMEOUT)
				.emit(
					SignalType.Counter,
					CS_ComType.Get,
					[comId],
					(
						err: Error,
						[returnType, comId, returnData]: InferCallbackData<
							CounterHandlerArgs,
							CS_ComType.Get
						>
					) => {
						if (err) {
							console.error(err);
							return;
						}
						if (returnType === SC_ComType.Reject) {
							console.error(returnData[0]);
							return;
						}
						const counters = returnData[0];

						setCounters(counters);
					}
				);

			const comId2 = createId();
			socket
				.timeout(DEFAULT_REQUEST_TIMEOUT)
				.emit(
					SignalType.Counter,
					CS_ComType.GetOrCreate,
					[comId2, [sigId]],
					(
						err: Error,
						[returnType, comId, returnData]: InferCallbackData<
							CounterHandlerArgs,
							CS_ComType.GetOrCreate
						>
					) => {
						if (err) {
							console.error(err);
							return;
						}
						if (returnType === SC_ComType.Reject) {
							console.error(returnData[0]);
							return;
						}
						const counter = returnData[0];
						setCounters({ [sigId]: counter });
					}
				);
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
							<h2 class="text-2xl font-thin text-gray-700 px-[2rem]">{`CounterId: ${id}, value: ${value}`}</h2>
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

	return { Counters, counters, setCounters, delta };
}
