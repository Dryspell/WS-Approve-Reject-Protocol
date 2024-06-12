import { type APIEvent } from "@solidjs/start/server";
import { Server } from "socket.io";
import {
	CS_ComType,
	SC_ComType,
	serverSocket,
	SignalType,
	type SocketWithIO,
	type sServer,
} from "~/types/socket";
import Axios from "axios";
import { setupCache } from "axios-cache-interceptor";
import counters from "~/lib/Server/counters";

const instance = Axios.create();
const axios = setupCache(instance);

export default function pokemonFetch() {
	const handler =
		(socket: serverSocket) =>
		([type, comId, data]:
			| [type: CS_ComType.Get, comId: string, data: [id: number]]) => {
			switch (type) {
				case CS_ComType.Get: {
					socket.emit(SignalType.Pokemon, [
						SC_ComType.Loading,
						comId,
					]);

					axios({
						url: `https://pokeapi.co/api/v2/pokemon/${data[0]}`,
						method: "GET",
					}).then((response) => {
						if (response.status === 200) {
							socket.emit(SignalType.Pokemon, [
								SC_ComType.Approve,
								comId,
								response.data,
							]);
						} else {
							socket.emit(SignalType.Pokemon, [
								SC_ComType.Error,
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
