import { TRPCResponse } from "@trpc/server/rpc";
import { createRecursiveProxy } from "./createProxy";
import { DecorateRouterRecord } from "./utils";
import { AnyTRPCRouter } from "@trpc/server";
import {
	AppRouter,
	inferProcedureInput,
	inferProcedureOutput,
	ProcedureNames,
	Procedures,
} from "./router";
import { clientSocket } from "~/types/socket";
import { DEFAULT_REQUEST_TIMEOUT } from "~/lib/Client/socket";
import { socket } from "~/lib/Client/socket";

export const createTinyRPCClient = <TRouter extends AnyTRPCRouter>(
	socket: clientSocket
) =>
	createRecursiveProxy(async (opts) => {
		const path = [...opts.path]; // e.g. ["post", "byId", "query"]
		const method = path.pop()! as "query" | "mutate";
		const dotPath = path.join(".") as keyof Procedures; // "post.byId" - this is the path procedures have on the backend

		const [input] = opts.args as [inferProcedureInput<typeof dotPath>];

		socket
			.timeout(DEFAULT_REQUEST_TIMEOUT)
			.emit(
				dotPath,
				input,
				(
					err: Error,
					response: inferProcedureOutput<typeof dotPath>
				) => {
					if (err) {
						throw new Error(`Error: ${err}`);
					}

					// No error - all good. Return the data.
					return response;
				}
			);
	}) as DecorateRouterRecord<TRouter["_def"]["record"]>;

socket.on("connect", () => {
	console.log("connected to server!!");
});

const client = createTinyRPCClient<AppRouter>(socket);

const x = client.counter.get.query(["123"]);
