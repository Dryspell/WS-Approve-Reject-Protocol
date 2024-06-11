import { createId } from "@paralleldrive/cuid2";
import { Component, ComponentProps, For, onMount } from "solid-js";
import { Flex } from "~/components/ui/flex";
import { socket } from "~/lib/socket";
import {
	clientSocket,
	ClientToServerEvents,
	CS_ComType,
	SC_ComType,
	SignalType,
} from "~/types/socket";
import { createStore } from "solid-js/store";
import { JSONObject } from "~/types/utils";

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
	TSuccessData extends JSONObject,
	TSignalType extends SignalType.Pokemon
>(socket: clientSocket, signalType: TSignalType) {
	type Request = Parameters<ClientToServerEvents[TSignalType]>[0];
	const cache = new Map<string, Request>();

	const [pokemons, setPokemons] = createStore<{
		[pokemonId: string]:
			| {
					status: QueryStatus.Success;
					data: TSuccessData;
			  }
			| { status: QueryStatus.Error; error: string }
			| { status: QueryStatus.Loading };
	}>({});

	socket.on(signalType as SignalType.Pokemon, ([type, comId, data]) => {
		const request = cache.get(comId);

		if (!request) {
			console.error(
				`Received unexpected signal: ${SC_ComType[type]}, ${comId}, ${data}`
			);
			return;
		} else {
			switch (request[0]) {
				case CS_ComType.Get: {
					const [pokemonId] = request[2];

					switch (type) {
						case SC_ComType.Approve: {
							setPokemons({
								[pokemonId]: {
									status: QueryStatus.Success,
									data: data as unknown as TSuccessData,
								},
							});
							break;
						}

						case SC_ComType.Reject: {
							const [reason] = data;
							setPokemons({
								[pokemonId]: {
									status: QueryStatus.Error,
									error: reason,
								},
							});
							break;
						}

						case SC_ComType.Loading: {
							setPokemons({
								[pokemonId]: {
									status: QueryStatus.Loading,
								},
							});
							break;
						}

						case SC_ComType.Error: {
							const [reason] = data;
							setPokemons({
								[pokemonId]: {
									status: QueryStatus.Error,
									error: reason,
								},
							});
							break;
						}

						default: {
							console.error(
								`Received unexpected signal type: ${type}`
							);
						}
					}

					break;
				}

				default: {
					console.error(
						`Received unexpected request type: ${
							CS_ComType[request[0]]
						}`
					);
				}
			}
		}
	});

	function fetchPokemon(pokemonId: number) {
		const comId = createId();
		cache.set(comId, [CS_ComType.Get, comId, [pokemonId]]);
		socket.emit(signalType as SignalType.Pokemon, [
			CS_ComType.Get,
			comId,
			[pokemonId],
		]);
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
					<For each={Object.entries(pokemons)}>
						{([pokemonId, pokemon]) => (
							<>
								{pokemon.status === QueryStatus.Loading ? (
									<div>Loading...</div>
								) : pokemon.status === QueryStatus.Error ? (
									<div>Error: {pokemon.error}</div>
								) : (
									<pre>
										{JSON.stringify(pokemon.data, null, 2)}
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
		pokemons,
		setPokemons,
		cache,
	};
}