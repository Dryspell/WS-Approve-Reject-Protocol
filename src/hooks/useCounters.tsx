import { createId } from "@paralleldrive/cuid2";
import { Component, ComponentProps, For, onMount } from "solid-js";
import { Flex } from "~/components/ui/flex";
import {
	clientSocket,
	ClientToServerEvents,
	CS_ComType,
	SC_ComType,
	SignalType,
} from "~/types/socket";
import { createStore, SetStoreFunction } from "solid-js/store";
import { InferRequestData } from "~/types/socket-utils";

type RequestData = InferRequestData<SignalType.Counter>;

export const counterHandler =
	(
		cache: Map<string, RequestData>,
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
		const request = cache.get(comId);

		if (!request) {
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
		}
	};

export default function useSocketCounter(socket: clientSocket, sigId: string) {
	const [counters, setCounters] = createStore<{
		[counterId: string]: number;
	}>({});

	const cache = new Map<string, RequestData>();

	socket.on(SignalType.Counter, counterHandler(cache, counters, setCounters));

	const delta = (d: number) => {
		const comId = createId();
		const request: RequestData = [comId, [sigId, d]];
		cache.set(comId, request);

		socket
			.timeout(5000)
			.emit(
				SignalType.Counter,
				CS_ComType.Delta,
				request,
				(
					err: Error,
					response:
						| [SC_ComType.Approve, string]
						| [SC_ComType.Reject, string, [reason: string]]
				) => {
					if (err) {
						console.error(err);
						return;
					}

					setCounters({ [sigId]: counters[sigId] + d });
				}
			);
	};

	const Counters: Component<ComponentProps<"div">> = (rawProps) => {
		onMount(() => {
			const comId = createId();
			const requestData: RequestData = [comId];
			cache.set(comId, requestData);
			socket
				.timeout(5000)
				.emit(
					SignalType.Counter,
					CS_ComType.Get,
					requestData,
					(
						err: Error,
						[resType, resComId, resData]:
							| [
									SC_ComType.Approve,
									string,
									{ [k: string]: number }[]
							  ]
							| [SC_ComType.Reject, string, [reason: string]]
					) => {
						if (err) {
							console.error(err);
							return;
						}
						const counters = resData?.[0];
						if (typeof counters !== "object") {
							throw new Error(
								"Expected Unreachable: Invalid data received"
							);
						}
						setCounters(counters);
					}
				);

			const comId2 = createId();
			const request2: RequestData = [comId2, [sigId]];
			cache.set(comId2, request2);
			socket
				.timeout(5000)
				.emit(
					SignalType.Counter,
					CS_ComType.GetOrCreate,
					request2,
					(
						err: Error,
						response:
							| [SC_ComType.Approve, string, [number]]
							| [SC_ComType.Reject, string, [reason: string]]
					) => {
						if (err) {
							console.error(err);
							return;
						}
						const counter = response?.[2][0];
						if (typeof counter !== "number") return;
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

	return { Counters, counters, setCounters, delta, cache };
}
