import { TRPCResponse } from "@trpc/server/rpc";
import { createRecursiveProxy } from "./createProxy";
import { DecorateRouterRecord } from "./utils";
import { AnyTRPCRouter } from "@trpc/server";
import { AppRouter, ProcedureNames } from "./router";
import { clientSocket } from "~/types/socket";
import { DEFAULT_REQUEST_TIMEOUT } from "~/lib/Client/socket";
import { socket } from "~/lib/Client/socket";

export const createTinyRPCClient = <TRouter extends AnyTRPCRouter>(
	socket: clientSocket
) =>
	createRecursiveProxy(async (opts) => {
		const path = [...opts.path]; // e.g. ["post", "byId", "query"]
		const method = path.pop()! as "query" | "mutate";
		const dotPath = path.join(".") as ProcedureNames; // "post.byId" - this is the path procedures have on the backend

		const [input] = opts.args;

		let [socketErr, responseData] = [undefined, undefined];
		socket
			.timeout(DEFAULT_REQUEST_TIMEOUT)
			.emit(dotPath, input, (err, response) => {
				socketErr = err;
				responseData = response;
			});

		if ("error" in responseData) {
			throw new Error(`Error: ${responseData.error.message}`);
		}
		// No error - all good. Return the data.
		return responseData.result.data;
	}) as DecorateRouterRecord<TRouter["_def"]["record"]>;

socket.on("connect", () => {
	console.log("connected to server!!");
});

const client = createTinyRPCClient<AppRouter>(socket);

client.counter.get.query(["123"]);
