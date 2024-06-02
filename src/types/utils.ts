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

export type SerializedObject = (
	| string
	| number
	| boolean
	| null
	| undefined
	| SerializedObject
)[];

export const serialize = (obj: JSONObject | JSONObject[]): SerializedObject => {
	if (!obj || typeof obj !== "object") return [obj];

	return Object.entries(obj).reduce((acc, [key, value], i) => {
		acc[i] = !value || typeof value !== "object" ? value : serialize(value);
		return acc;
	}, [] as SerializedObject);
};

export const deserialize = <
	TRep extends JSONObject,
	R = TRep extends JSONObject[] ? Partial<TRep>[] : Partial<TRep>
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
): { [K in keyof T]: JSONObject } => {
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
			.slice(0, 1) as { [K in keyof T]: JSONObject };
	}

	return Object.entries(representative).reduce((acc, [key, value]) => {
		acc[key as keyof T] =
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
	}, {} as { [K in keyof T]: JSONObject });
};
