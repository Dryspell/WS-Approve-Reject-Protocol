import { createRepresentation, deepClone, serialize, deserialize } from "~/types/utils";

export default function Serialization(props: {}) {
  const testSerialObject = {
    greeting: "Welcome!",
    instructions: [
      "These are serialized objects",
      "Use the serialization functions to",
      "convert them to and from JSON",
    ],
    sampleNest: {
      language: "TypeScript",
      sample: {
        "Hello, world!": {
          language: "TypeScript",
          source: 'console.log("Hello, world!")',
        },
      },
    },
    arrayNest: {
      fish: [
        {
          cat: "dog",
        },
        {
          cat: "dog",
        },
        {
          bark: "meow",
        },
      ],
    },
  };

  const testSerialObject2 = {
    greeting: "Welcome!",
    instructions: [
      "These are serialized objects",
      "Use the serialization functions to",
      "convert them to and from JSON",
    ],
    sampleNest: {
      language: "TypeScript",
      sample: {
        "Hello, world!": {
          language: "TypeScript",
          source: 'console.log("Hello, world!")',
        },
      },
    },
    arrayNest: {
      fish: [
        {
          cat: "dog",
        },
        {
          cat: "dog",
        },
        {
          bark: "meow",
        },
      ],
    },
  };

  const serialized = serialize(deepClone(testSerialObject));
  const deserialized = deserialize(deepClone(serialized), createRepresentation(testSerialObject));

  const serializeProxy = new Proxy(
    serialize({
      testSerialObject2,
    }),
    {
      get: (target, prop) => {
        console.log(target, prop);
        if (!(prop in testSerialObject2)) {
          console.log("undefined");
          return undefined;
        }
        const newProp = prop as keyof typeof testSerialObject2;
        const index = Object.keys(testSerialObject2).indexOf(newProp);
        if (!Array.isArray(target) || !Array.isArray(target[0])) return undefined;
        const res = target?.[0]?.[Object.keys(testSerialObject2).indexOf(newProp)];
        console.log(res, index);
        return res;
      },
    },
  ) as unknown as typeof testSerialObject2;

  return (
    <div class="grid grid-cols-3 gap-4">
      <div>
        <h1>Test Object</h1>
        <pre>{JSON.stringify(testSerialObject, null, 2)}</pre>
      </div>
      <div>
        <h1>Representation</h1>
        <pre>{JSON.stringify(createRepresentation(testSerialObject), null, 2)}</pre>
      </div>
      <div>
        <h1>Serialized</h1>
        <pre>{JSON.stringify(serialized, null, 2)}</pre>
      </div>
      <div>
        <h1>Deserialized</h1>
        <pre>{JSON.stringify(deserialized, null, 2)}</pre>
      </div>
      <div>
        <h1>Serialized Second Object</h1>
        <pre>{JSON.stringify(serialize(deepClone(testSerialObject2)), null, 2)}</pre>
      </div>
      <div>
        <h1>Deserialized Second Object</h1>
        <pre>
          {JSON.stringify(
            deserialize(
              serialize(deepClone(testSerialObject2)),
              createRepresentation(testSerialObject),
            ),
            null,
            2,
          )}
        </pre>
      </div>
      <div>
        <h1>Proxy Serialized Access</h1>
        <pre>{JSON.stringify(serializeProxy.arrayNest, null, 2)}</pre>
      </div>
    </div>
  );
}
