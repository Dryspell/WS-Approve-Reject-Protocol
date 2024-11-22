export const deepClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

type Primitive = string | number | boolean | null | undefined;

const isPrimitive = (
  value: JSONObject,
): value is Primitive => value == null || typeof value !== "object";

const createDefault = (value: any): any => {
  if (typeof value === "string") return "";
  if (typeof value === "number") return 0;
  if (typeof value === "boolean") return false;
  if (Array.isArray(value)) return [createDefault(value[0])];
  return createRepresentation(value);
};

export type JSONObject =
  | Primitive
  | {
    [key: string]: JSONObject;
  }
  | JSONObject[];

export type SerializedObject<
  T = JSONObject | JSONObject[], // extends JSONObject | JSONObject | unknown = unknown
> = Primitive | SerializedObject[];

export const serialize = <
  T extends JSONObject | JSONObject[],
  TRep extends T = T,
>(
  obj: T,
  rep?: TRep,
): SerializedObject<TRep> => {
  if (isPrimitive(obj)) return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => serialize(item));
  }

  const entries = Object.entries(obj);
  return entries.map(([_, value]) => serialize(value));
};

export const deserialize = <
  TRep extends JSONObject,
>(
  serialized: SerializedObject,
  representation: TRep,
): TRep extends Primitive ? Primitive
  : TRep extends JSONObject[] ? Partial<TRep>[]
  : Partial<TRep> => {
  if (isPrimitive(serialized)) {
    return serialized as TRep extends Primitive ? Primitive
      : never;
  }

  if (!representation || typeof representation !== "object") {
    throw new Error("Invalid representation");
  }

  if (Array.isArray(representation)) {
    return serialized.map((value, i) => {
      return deserialize(value, representation[0]);
    }) as TRep extends Primitive ? Primitive
      : TRep extends JSONObject[] ? Partial<TRep>[]
      : Partial<TRep>;
  }

  const repKeys = Object.keys(representation);

  return serialized.reduce(
    (acc, value, i) => {
      const repKey = repKeys[i];

      acc[repKey] = deserialize(value, representation[repKey]);
      return acc;
    },
    {} as {
      [key: string]: JSONObject;
    },
  ) as TRep extends Primitive ? Primitive
    : TRep extends JSONObject[] ? Partial<TRep>[]
    : Partial<TRep>;
};

export const createRepresentation = <T extends JSONObject>(obj: T): T => {
  if (isPrimitive(obj)) return createDefault(obj) as T;

  if (Array.isArray(obj)) {
    return [createRepresentation(obj[0])] as T;
  }

  return Object.keys(obj).reduce((acc, key) => {
    acc[key] = createRepresentation(obj[key]);
    return acc;
  }, {} as T & { [key: string]: JSONObject });
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

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends
  (k: infer I) => void ? I
  : never;

type LastOf<T> = UnionToIntersection<T extends any ? () => T : never> extends
  () => infer R ? R : never;

// TS4.0+
type Push<T extends any[], V> = [...T, V];

type TuplifyUnion<T, L = LastOf<T>, N = [T] extends [never] ? true : false> =
  true extends N ? []
    : Push<TuplifyUnion<Exclude<T, L>>, L>;

type ObjValueTuple<
  T,
  KS extends any[] = TuplifyUnion<keyof T>,
  R extends any[] = [],
> = KS extends [
  infer K,
  ...infer KT,
]
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
