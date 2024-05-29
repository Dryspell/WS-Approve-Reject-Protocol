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

export const deserialize = (
	serialized: SerializedObject,
	representation: JSONObject
): JSONObject => {
	if (!representation || typeof representation !== "object") return undefined;

	if (Array.isArray(representation)) {
		return serialized.map((value, i) => {
			return !value || typeof value !== "object"
				? value
				: deserialize(value, representation[i]);
		});
	}

	const repKeys = Object.keys(representation);

	return serialized.reduce((acc, value, i) => {
		const repKey = repKeys[i];

		acc[repKey] =
			!value || typeof value !== "object"
				? value
				: typeof representation[repKey] === "object" &&
				  representation[repKey] &&
				  !Array.isArray(representation[repKey])
				? deserialize(value, representation[repKey])
				: undefined;
		return acc;
	}, {} as typeof representation);
};
