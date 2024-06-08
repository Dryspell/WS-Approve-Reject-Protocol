import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "./trpc";
import { z } from "zod";
import { createId } from "@paralleldrive/cuid2";
import { AnyRouter } from "@trpc/server/unstable-core-do-not-import";
import { CS_ComType, SignalType } from "~/types/socket";

const appRouter = router({
	[SignalType.Counter]: router({
		[CS_ComType.Get]: publicProcedure
			.input(
				z.tuple([
					z.string(), // comId
				])
			)
			.query(({ input }) => {
				console.log(
					`Received ${CS_ComType.Get} signal with comId: ${input[0]}`
				);
				console.error("Not implemented");
			}),
		[CS_ComType.GetOrCreate]: publicProcedure
			.input(z.object({ title: z.string() }))
			.query(({ input }) => {
				console.log(`Received ${CS_ComType.GetOrCreate} signal`);
				console.error("Not implemented");
			}),
		[CS_ComType.Delta]: publicProcedure
			.input(z.object({ title: z.string() }))
			.mutation(({ input }) => {
				console.log(`Received ${CS_ComType.Delta} signal`);
				console.error("Not implemented");
			}),
	}),
	[SignalType.Pokemon]: router({
		[CS_ComType.Get]: publicProcedure
			.input(z.object({ id: z.string() }))
			.mutation(({ input }) => {
				console.log(`Received ${CS_ComType.Get} signal`);
				console.error("Not implemented");
			}),
	}),
});

// Export type router type signature,
// NOT the router itself.
export type AppRouter = typeof appRouter;

type inferNestedKeys<T extends Record<string, unknown>> = {
	[P in keyof T]-?: T[P] extends string | object
		? {
				[K in keyof T[P]]-?: K extends string
					? [P, K]
					: // `${P}.${K}`
					  never;
		  }[keyof T[P]]
		: never;
}[keyof T];

type inferProcedures<TRouter extends AnyRouter> = inferNestedKeys<
	Omit<TRouter, "_def">
>;

export type Procedures = inferProcedures<AppRouter>;

export const routerPaths = Object.keys(appRouter._def.procedures).map((k) =>
	k.split(".")
) as Procedures[];

export const topLevelRouterPaths = Object.keys(appRouter).filter(
	(key) => !["_def", "createCaller"].includes(key)
) as (keyof Omit<AppRouter, "_def" | "createCaller">)[];
