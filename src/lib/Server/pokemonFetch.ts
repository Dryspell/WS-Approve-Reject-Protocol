import {
	CS_ComType,
	SC_ComType,
	serverSocket,
	SignalType,
} from "~/types/socket";
import Axios from "axios";
import { setupCache } from "axios-cache-interceptor";
import { PokemonApiResponse } from "~/hooks/useDataFetching";

const instance = Axios.create();
const axios = setupCache(instance);

export type PokemonFetchHandlerArgs = [
	type: CS_ComType.Get,
	request: [comId: string, data: [id: number]],
	callback: (
		returnData:
			| [
					returnType: SC_ComType.Approve,
					comId: string,
					returnData: PokemonApiResponse
			  ]
			| [
					returnType: SC_ComType.Reject,
					comId: string,
					returnData: [reason: string]
			  ]
	) => void
];

export default function pokemonFetch() {
	const handler =
		(socket: serverSocket) =>
		(...[type, request, callback]: PokemonFetchHandlerArgs) => {
			switch (type) {
				case CS_ComType.Get: {
					const [comId, data] = request;
					axios({
						url: `https://pokeapi.co/api/v2/pokemon/${data[0]}`,
						method: "GET",
					}).then((response) => {
						if (response.status === 200) {
							callback([
								SC_ComType.Approve,
								comId,
								response.data,
							]);
						} else {
							callback([
								SC_ComType.Reject,
								comId,
								["Pokemon not found"],
							]);
						}
					});

					break;
				}
			}
		};

	return { handler };
}
