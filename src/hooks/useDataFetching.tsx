import { createId } from "@paralleldrive/cuid2";
import { Component, ComponentProps, For, useContext } from "solid-js";
import {
	clientSocket,
	ClientToServerEvents,
	CS_ComType,
	SC_ComType,
	SignalType,
} from "~/types/socket";
import { createStore } from "solid-js/store";
import { JSONObject } from "~/types/utils";
import { InferCallbackData } from "~/types/socket-utils";
import { DEFAULT_REQUEST_TIMEOUT } from "~/lib/Client/socket";
import { PokemonFetchHandlerArgs } from "~/lib/Server/pokemonFetch";
import { SocketContext } from "~/app";

const enum QueryStatus {
	Idle,
	Loading,
	Success,
	Error,
}

export type PokemonApiResponse = {
	id: number;
	name: string;
} & JSONObject;

export default function useDataFetching<
	TSuccessData,
	TSignalType extends keyof ClientToServerEvents & SignalType
>(signalType: TSignalType) {
	const socket = useContext(SocketContext);

	const [queryData, setQueryData] = createStore<
		Record<
			string, // queryKey (pokemonId)
			| {
					queryStatus: QueryStatus.Success;
					data?: PokemonApiResponse;
			  }
			| {
					queryStatus: QueryStatus.Loading;
			  }
			| {
					queryStatus: QueryStatus.Error;
					error: string;
			  }
		>
	>({});

	function fetchPokemon(pokemonId: number) {
		const comId = createId();
		setQueryData({ [pokemonId]: { queryStatus: QueryStatus.Loading } });
		socket
			.timeout(DEFAULT_REQUEST_TIMEOUT)
			.emit(
				signalType as SignalType.Pokemon,
				CS_ComType.Get,
				[comId, [pokemonId]],
				(
					err: Error,
					[returnType, comId, returnData]: InferCallbackData<
						PokemonFetchHandlerArgs,
						CS_ComType.Get
					>
				) => {
					if (err) {
						setQueryData({
							[pokemonId]: {
								queryStatus: QueryStatus.Error,
								error: err.message,
							},
						});
						return;
					}

					if (returnType === SC_ComType.Reject) {
						setQueryData({
							[pokemonId]: {
								queryStatus: QueryStatus.Error,
								error: returnData[0],
							},
						});
						return;
					}

					if (returnType === SC_ComType.Approve) {
						setQueryData({
							[pokemonId]: {
								queryStatus: QueryStatus.Success,
								data: returnData,
							},
						});
						return;
					}
				}
			);
	}

	const Interface: Component<ComponentProps<"div">> = (rawProps) => {
		return (
			<div class="text-gray-700 p-4" {...rawProps}>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						const formData = new FormData(
							e.target as HTMLFormElement
						);
						console.log(
							formData.get("pokemonId"),
							typeof formData.get("pokemonId")
						);
						const pokemonId = !Number.isNaN(
							parseInt(formData.get("pokemonId") as string)
						)
							? parseInt(formData.get("pokemonId") as string)
							: 1;
						fetchPokemon(pokemonId);
					}}
					class="max-6-xs text-6xl text-sky-700 font-thin uppercase my-16 grid grid-cols-2 gap-4"
				>
					<div>
						<label for="pokemonId">Pokemon ID:</label>
						<input
							name="pokemonId"
							type="number"
							min="1"
							max="898"
							class="border border-gray-300 rounded-md p-2"
						/>
					</div>
					<button
						type="submit"
						class="border border-gray-300 rounded-md p-2"
					>
						Fetch Pokemon
					</button>
				</form>
				<div>
					<For each={Object.entries(queryData)}>
						{([queryKey, queryData]) => (
							<>
								{queryData.queryStatus ===
								QueryStatus.Loading ? (
									<div>Loading...</div>
								) : queryData.queryStatus ===
								  QueryStatus.Error ? (
									<div>Error: {queryData.error}</div>
								) : (
									<pre>
										{JSON.stringify(
											queryData.data,
											null,
											2
										)}
									</pre>
								)}
							</>
						)}
					</For>
				</div>
			</div>
		);
	};

	return {
		Interface,
		fetchPokemon,
		queryData,
		setQueryData,
	};
}
