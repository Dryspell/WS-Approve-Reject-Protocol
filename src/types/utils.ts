export const deepClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

export type JSONObject =
	| string
	| number
	| boolean
	| null
	| undefined
	| {
			[key: string]: JSONObject;
	  }
	| JSONObject[];

export type SerializedObject<
	T = JSONObject | JSONObject[] // extends JSONObject | JSONObject | unknown = unknown
> = (string | number | boolean | null | undefined | SerializedObject)[];

export const serialize = <
	T extends JSONObject | JSONObject[],
	TRep extends T = T
>(
	obj: T,
	rep?: TRep
) => {
	if (!obj || typeof obj !== "object") return [obj] as SerializedObject<TRep>;

	return Object.entries(obj).reduce((acc, [key, value], i) => {
		acc[i] = !value || typeof value !== "object" ? value : serialize(value);
		return acc;
	}, [] as SerializedObject<TRep>);
};

export const deserialize = <
	TRep extends JSONObject,
	R = TRep extends JSONObject[] ? TRep[] : TRep
>(
	serialized: SerializedObject,
	representation: TRep
): R => {
	if (!representation || typeof representation !== "object") {
		throw new Error("Invalid representation");
	}

	if (Array.isArray(representation)) {
		return serialized.map((value, i) => {
			return !value || typeof value !== "object"
				? value
				: deserialize(value, representation[0]);
		}) as R;
	}

	const repKeys = Object.keys(representation);

	return serialized.reduce(
		(acc, value, i) => {
			const repKey = repKeys[i];

			acc[repKey] =
				!value || typeof value !== "object"
					? value
					: typeof representation[repKey] === "object" &&
					  representation[repKey]
					? // && !Array.isArray(representation[repKey])
					  deserialize(value, representation[repKey])
					: undefined;
			return acc;
		},
		{} as {
			[key: string]: JSONObject;
		}
	) as R;
};

export const createRepresentation = <T extends JSONObject>(
	representative: T
): T => {
	if (!representative || typeof representative !== "object") {
		throw new Error("Invalid representative");
	}

	if (Array.isArray(representative)) {
		return representative
			.map((value) => {
				return typeof value === "string"
					? ""
					: typeof value === "number"
					? 0
					: typeof value === "boolean"
					? false
					: value == null
					? value
					: createRepresentation(value);
			})
			.slice(0, 1) as typeof representative;
	}

	return Object.entries(representative).reduce((acc, [key, value]) => {
		//@ts-expect-error - allow implicit any
		acc[key] =
			typeof value === "string"
				? ""
				: typeof value === "number"
				? 0
				: typeof value === "boolean"
				? false
				: value == null
				? value
				: createRepresentation(value);
		return acc;
	}, {} as typeof representative);
};

// https://stackoverflow.com/questions/52855145/typescript-object-type-to-array-type-tuple/68695508#68695508
// https://github.com/microsoft/TypeScript/issues/13298

type Object = {
	[key: string]: string | null | boolean | number | Object | Object[];
};
const testObj = {
	a: "a" as string | boolean,
	b: null,
	c: true,
	d: 1,
	e: {
		f: "f",
		g: null,
		h: true,
		i: 1,
	},
	j: ["hello", false] as [string, boolean],
} satisfies JSONObject;

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
	k: infer I
) => void
	? I
	: never;

type LastOf<T> = UnionToIntersection<
	T extends any ? () => T : never
> extends () => infer R
	? R
	: never;

// TS4.0+
type Push<T extends any[], V> = [...T, V];

type TuplifyUnion<
	T,
	L = LastOf<T>,
	N = [T] extends [never] ? true : false
> = true extends N ? [] : Push<TuplifyUnion<Exclude<T, L>>, L>;

type ObjValueTuple<
	T,
	KS extends any[] = TuplifyUnion<keyof T>,
	R extends any[] = []
> = KS extends [infer K, ...infer KT]
	? T[K & keyof T] extends Object
		? ObjValueTuple<T, KT, [...R, ObjValueTuple<T[K & keyof T]>]>
		: ObjValueTuple<T, KT, [...R, T[K & keyof T]]>
	: R;

type test = ObjValueTuple<typeof testObj>;

// type ObjToTuple<
// 	T,
// 	KS extends keyof T = keyof T, // any[] = TuplifyUnion<keyof T>,
// 	R extends any[] = [never]
// > = T[KS] extends Record<infer Prop, infer Value>
// 	? Push<R, [ObjToTuple<Value>]>
// 	: Push<R, T[KS]>;
// type test2 = ObjToTuple<typeof testObj>;
