import { TRPCResponse } from "@trpc/server/rpc";
import { createRecursiveProxy } from "./createProxy";
import { DecorateRouterRecord } from "./utils";
import { AnyTRPCRouter } from "@trpc/server";
import { AppRouter } from "./router";

export const createTinyRPCClient = <TRouter extends AnyTRPCRouter>(
	baseUrl: string
) =>
	createRecursiveProxy(async (opts) => {
		const path = [...opts.path]; // e.g. ["post", "byId", "query"]
		const method = path.pop()! as "query" | "mutate";
		const dotPath = path.join("."); // "post.byId" - this is the path procedures have on the backend
		let uri = `${baseUrl}/${dotPath}`;

		const [input] = opts.args;
		const stringifiedInput = input !== undefined && JSON.stringify(input);
		let body: undefined | string = undefined;
		if (stringifiedInput !== false) {
			if (method === "query") {
				uri += `?input=${encodeURIComponent(stringifiedInput)}`;
			} else {
				body = stringifiedInput;
			}
		}

		const json: TRPCResponse = await fetch(uri, {
			method: method === "query" ? "GET" : "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body,
		}).then((res) => res.json());

		if ("error" in json) {
			throw new Error(`Error: ${json.error.message}`);
		}
		// No error - all good. Return the data.
		return json.result.data;
	}) as DecorateRouterRecord<TRouter["_def"]["record"]>;

const url = "http://localhost:3000/api/trpc";
const client = createTinyRPCClient<AppRouter>(url);

client.post.byId.query({ id: "1" });
