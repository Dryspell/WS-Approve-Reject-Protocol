import {
	AnyProcedure,
	AnyRootTypes,
	AnyRouter,
	BuiltRouter,
	createCallerFactory,
	CreateRouterOptions,
	DecorateCreateRouterOptions,
	defaultFormatter,
	defaultTransformer,
	mergeWithoutOverrides,
	omitPrototype,
	RootConfig,
	RouterRecord,
	ValueOf,
} from "@trpc/server/unstable-core-do-not-import";

function isRouter(
	procedureOrRouter: ValueOf<CreateRouterOptions>
): procedureOrRouter is AnyRouter {
	return procedureOrRouter._def && "router" in procedureOrRouter._def;
}

const emptyRouter = {
	_ctx: null as any,
	_errorShape: null as any,
	_meta: null as any,
	queries: {},
	mutations: {},
	subscriptions: {},
	errorFormatter: defaultFormatter,
	transformer: defaultTransformer,
};

/**
 * Reserved words that can't be used as router or procedure names
 */
const reservedWords = [
	/**
	 * Then is a reserved word because otherwise we can't return a promise that returns a Proxy
	 * since JS will think that `.then` is something that exists
	 */
	"then",
	/**
	 * `fn.call()` and `fn.apply()` are reserved words because otherwise we can't call a function using `.call` or `.apply`
	 */
	"call",
	"apply",
];

/**
 * @internal
 */
export function createRouterFactory<TRoot extends AnyRootTypes>(
	config: RootConfig<TRoot>
) {
	function createRouterInner<TInput extends RouterRecord>(
		input: TInput
	): BuiltRouter<TRoot, TInput>;
	function createRouterInner<TInput extends CreateRouterOptions>(
		input: TInput
	): BuiltRouter<TRoot, DecorateCreateRouterOptions<TInput>>;
	function createRouterInner(input: RouterRecord | CreateRouterOptions) {
		const reservedWordsUsed = new Set(
			Object.keys(input).filter((v) => reservedWords.includes(v))
		);
		if (reservedWordsUsed.size > 0) {
			throw new Error(
				"Reserved words used in `router({})` call: " +
					Array.from(reservedWordsUsed).join(", ")
			);
		}

		const procedures: Record<string, AnyProcedure> = omitPrototype({});

		function step(from: CreateRouterOptions, path: string[] = []) {
			const aggregate: RouterRecord = omitPrototype({});
			for (const [key, item] of Object.entries(from ?? {})) {
				if (isRouter(item)) {
					aggregate[key] = step(item._def.record, [...path, key]);
					continue;
				}
				if (!isProcedure(item)) {
					// RouterRecord
					aggregate[key] = step(item, [...path, key]);
					continue;
				}

				const newPath = [...path, key].join(".");

				if (procedures[newPath]) {
					throw new Error(`Duplicate key: ${newPath}`);
				}

				procedures[newPath] = item;
				aggregate[key] = item;
			}

			return aggregate;
		}
		const record = step(input);

		const _def: AnyRouter["_def"] = {
			_config: config,
			router: true,
			procedures,
			...emptyRouter,
			record,
		};

		return {
			...record,
			_def,
			createCaller: createCallerFactory<TRoot>()({
				_def,
			}),
		};
	}

	return createRouterInner;
}

function isProcedure(
	procedureOrRouter: ValueOf<CreateRouterOptions>
): procedureOrRouter is AnyProcedure {
	return typeof procedureOrRouter === "function";
}

/** @internal */
type MergeRouters<
	TRouters extends AnyRouter[],
	TRoot extends AnyRootTypes = TRouters[0]["_def"]["_config"]["$types"],
	// eslint-disable-next-line @typescript-eslint/ban-types
	TRecord extends RouterRecord = {}
> = TRouters extends [
	infer Head extends AnyRouter,
	...infer Tail extends AnyRouter[]
]
	? MergeRouters<Tail, TRoot, Head["_def"]["record"] & TRecord>
	: BuiltRouter<TRoot, TRecord>;

export function mergeRouters<TRouters extends AnyRouter[]>(
	...routerList: [...TRouters]
): MergeRouters<TRouters> {
	const record = mergeWithoutOverrides(
		{},
		...routerList.map((r) => r._def.record)
	);
	const errorFormatter = routerList.reduce(
		(currentErrorFormatter, nextRouter) => {
			if (
				nextRouter._def._config.errorFormatter &&
				nextRouter._def._config.errorFormatter !== defaultFormatter
			) {
				if (
					currentErrorFormatter !== defaultFormatter &&
					currentErrorFormatter !==
						nextRouter._def._config.errorFormatter
				) {
					throw new Error(
						"You seem to have several error formatters"
					);
				}
				return nextRouter._def._config.errorFormatter;
			}
			return currentErrorFormatter;
		},
		defaultFormatter
	);

	const transformer = routerList.reduce((prev, current) => {
		if (
			current._def._config.transformer &&
			current._def._config.transformer !== defaultTransformer
		) {
			if (
				prev !== defaultTransformer &&
				prev !== current._def._config.transformer
			) {
				throw new Error("You seem to have several transformers");
			}
			return current._def._config.transformer;
		}
		return prev;
	}, defaultTransformer);

	const router = createRouterFactory({
		errorFormatter,
		transformer,
		isDev: routerList.every((r) => r._def._config.isDev),
		allowOutsideOfServer: routerList.every(
			(r) => r._def._config.allowOutsideOfServer
		),
		isServer: routerList.every((r) => r._def._config.isServer),
		$types: routerList[0]?._def._config.$types,
	})(record);

	return router as MergeRouters<TRouters>;
}
