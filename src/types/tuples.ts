type Foo = [a: "a", b: "b", c: "c"];

declare const Sigil: unique symbol;

export type TupleFilterByIndex<
	T extends any[],
	N extends number | `${number}`
> = TupleExclude<
	{ [K in keyof T]: `${K}` extends `${N}` ? T[K] : typeof Sigil },
	typeof Sigil
>;

export type TupleExclude<T extends any[], V, A extends any[] = []> = T extends [
	infer F,
	...infer R
]
	? TupleExclude<
			R,
			V,
			F extends V
				? A
				: T extends [...infer FF, ...R]
				? [...A, ...FF]
				: [...A, F]
	  >
	: A;

type Bar = TupleFilterByIndex<Foo, 1 | 2>;
