import type {
	AnyTRPCProcedure,
	inferProcedureInput,
	inferProcedureOutput,
	AnyTRPCQueryProcedure,
	AnyTRPCMutationProcedure,
} from "@trpc/server";
import type { TRPCRouterRecord } from "@trpc/server";

type Resolver<TProcedure extends AnyTRPCProcedure> = (
	input: inferProcedureInput<TProcedure>
) => Promise<inferProcedureOutput<TProcedure>>;

type DecorateProcedure<TProcedure> = TProcedure extends AnyTRPCQueryProcedure
	? {
			query: Resolver<TProcedure>;
	  }
	: TProcedure extends AnyTRPCMutationProcedure
	? {
			mutate: Resolver<TProcedure>;
	  }
	: never;

export type DecorateRouterRecord<TRecord extends TRPCRouterRecord> = {
	[TKey in keyof TRecord]: TRecord[TKey] extends infer $Value
		? $Value extends TRPCRouterRecord
			? DecorateRouterRecord<$Value>
			: $Value extends AnyTRPCProcedure
			? DecorateProcedure<$Value>
			: never
		: never;
};
