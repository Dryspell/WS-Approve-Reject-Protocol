import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "./trpc";
import { z } from "zod";
import { createId } from "@paralleldrive/cuid2";

type Post = { id: string; title: string };
const posts: Post[] = [];

const appRouter = router({
	post: router({
		byId: publicProcedure
			.input(z.object({ id: z.string() }))
			.query(({ input }) => {
				const post = posts.find((p) => p.id === input.id);
				if (!post) throw new TRPCError({ code: "NOT_FOUND" });
				return post;
			}),
		byTitle: publicProcedure
			.input(z.object({ title: z.string() }))
			.query(({ input }) => {
				const post = posts.find((p) => p.title === input.title);
				if (!post) throw new TRPCError({ code: "NOT_FOUND" });
				return post;
			}),
		create: publicProcedure
			.input(z.object({ title: z.string() }))
			.mutation(({ input }) => {
				const post = { id: createId(), ...input };
				posts.push(post);
				return post;
			}),
	}),
});

// Export type router type signature,
// NOT the router itself.
export type AppRouter = typeof appRouter;
