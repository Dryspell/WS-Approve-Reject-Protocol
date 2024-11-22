type Primitive = string | number | boolean | null | undefined;

export const isPrimitive = (value: Serializable): value is Primitive =>
  value == null || typeof value !== "object";

type Serializable =
  | string
  | number
  | boolean
  | null
  | undefined
  | Serializable[]
  | { [key: string]: Serializable };

type SerializableObject = Record<string, Serializable>;

export const representatives = {
  user: {
    type: "user",
    name: "",
    age: 0,
    address: {
      street: "",
      city: "",
      zip: 0,
    },
  },
  product: {
    type: "product",
    title: "",
    price: 0,
    categories: [] as string[],
  },
};

export type RepresentativeDict = typeof representatives;

type TypedObject<Ttype extends string> = Ttype extends keyof RepresentativeDict
  ? {
      type: Ttype;
    } & Omit<RepresentativeDict[Ttype], "type">
  : never;

export function serializeToNestedTuples<Ttype extends keyof RepresentativeDict>(
  representative: Omit<TypedObject<Ttype>, "type">,
  target: Omit<TypedObject<Ttype>, "type">,
): Serializable[] {
  function serializeHelper(rep: Serializable, obj: Serializable): Serializable {
    if (isPrimitive(obj)) {
      return obj;
    }

    if (Array.isArray(rep) && Array.isArray(obj)) {
      // Recursively handle arrays
      return obj.map(item => serializeHelper(rep[0], item));
    }

    if (rep && typeof rep === "object" && !Array.isArray(obj) && !Array.isArray(rep)) {
      // Recursively handle objects
      return Object.entries(obj).map(([key, value]) => {
        const repValue = rep[key];
        const objValue = obj[key];
        return repValue !== null && typeof repValue === "object"
          ? serializeHelper(repValue, objValue ?? {})
          : (objValue ?? null);
      });
    }

    throw new Error(`Invalid structure encountered during serialization.`);
  }

  return serializeHelper(representative as Serializable, target as Serializable) as Serializable[];
}

export function serializeWithType<Ttype extends keyof RepresentativeDict>(
  target: TypedObject<Ttype>,
): [type: Ttype, ...Serializable[]] {
  const { type, ...data } = target;

  const representative = representatives[type];
  if (!representative || typeof representative !== "object") {
    throw new Error(`No representative found for type: ${type}`);
  }

  const { type: _rType, ...rData } = representative as TypedObject<Ttype>;
  return [type, ...serializeToNestedTuples(rData, data)] as [Ttype, ...Serializable[]];
}
export function wrapSerializedObject<Ttype extends keyof RepresentativeDict>(
  serialized: [Ttype, ...Serializable[]],
): TypedObject<Ttype> {
  const [type, ...data] = serialized;

  const representative = representatives[type];
  if (!representative || typeof representative !== "object") {
    throw new Error(`No representative found for type: ${type}`);
  }

  function createProxy(rep: SerializableObject, data: Serializable[]): SerializableObject {
    if (!rep || typeof rep !== "object") {
      throw new Error("Representative must be a non-null object.");
    }

    return new Proxy(
      {},
      {
        get(_, prop: string | symbol) {
          if (prop === "toJSON") {
            // Return a custom toJSON function for JSON.stringify compatibility
            return () => {
              const result: Record<string, unknown> = {};
              Object.keys(rep).forEach((key, index) => {
                const repValue = rep[key];
                const dataValue = data[index];

                result[key] =
                  repValue !== null && typeof repValue === "object"
                    ? createProxy(repValue as SerializableObject, dataValue as Serializable[])
                    : dataValue;
              });
              return result;
            };
          }

          if (typeof prop !== "string") {
            throw new Error(`Unsupported property access: ${String(prop)}`);
          }
          const keys = Object.keys(rep);
          const index = keys.indexOf(prop);

          if (index === -1) {
            throw new Error(`Property "${prop}" does not exist in the representative.`);
          }

          const repValue = rep[prop];
          const dataValue = Array.isArray(data) ? data[index] : undefined;

          // Recursively wrap nested objects
          if (repValue !== null && typeof repValue === "object") {
            if (!Array.isArray(dataValue)) {
              throw new Error(`Expected array for nested data at property "${prop}".`);
            }
            return createProxy(repValue as SerializableObject, dataValue);
          }

          return dataValue;
        },
        ownKeys() {
          return Reflect.ownKeys(rep);
        },
        getOwnPropertyDescriptor(_, prop: string | symbol) {
          if (prop in rep) {
            return {
              enumerable: true,
              configurable: true,
            };
          }
          return undefined;
        },
      },
    );
  }

  // Exclude the "type" field from the proxy and reconstruct the full object
  const { type: _, ...rData } = representative as TypedObject<Ttype>;
  return { type, ...createProxy(rData as SerializableObject, data) } as TypedObject<Ttype>;
}

export default function SerializationPage() {
  const user = {
    type: "user" as const,
    name: "Alice",
    age: 25,
    address: {
      street: "456 Elm St",
      city: "Metropolis",
      zip: 54321,
    },
  };

  const product = {
    type: "product" as const,
    title: "Smartphone",
    price: 699,
    categories: ["electronics", "gadgets"],
  };

  // Correct serialization
  const serializedUser = serializeWithType(user);
  console.log(serializedUser);
  // Output: ["user", "Alice", 25, ["456 Elm St", "Metropolis", 54321]]

  const deserializedUser = wrapSerializedObject(serializedUser);
  console.log(deserializedUser);
  console.log(deserializedUser.address);
  console.log(JSON.stringify(deserializedUser.address));
  console.log(deserializedUser.address.street);
  console.log(deserializedUser.name); // Output: Alice

  deserializedUser.name = "Bob";
  console.log(deserializedUser.name); // Output: Bob
  console.log(deserializedUser);

  const serializedProduct = serializeWithType(product);
  console.log(serializedProduct);
  // Output: ["product", "Smartphone", 699, ["electronics", "gadgets"]]

  // Incorrect serialization: This will produce a compile-time error
  const invalidUser = {
    type: "user" as const,
    name: "Bob",
    age: "not a number", // Invalid type for age
    address: {
      street: "123 Elm St",
      city: "Smallville",
      zip: "not a number", // Invalid type for zip
    },
  };
  // serializeWithType(representatives, invalidUser); // Compile-time error

  return (
    <main class="mx-auto p-4 text-gray-700">
      <div></div>
    </main>
  );
}
