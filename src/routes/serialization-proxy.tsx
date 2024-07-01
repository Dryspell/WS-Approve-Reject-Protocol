import { serializeProxy } from "../lib/serializeProxy";

//! TODO: IMPLEMENT SOCKETIO CUSTOM PARSER

export default function SerializationProxyPage() {
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
  console.log(serializeProxy(testSerialObject).arrayNest.fish);

  const testSerial = { hello: "world", toJSON: () => ["Hello, world!"] };

  return (
    <main class="mx-auto p-4 text-gray-700">
      <div>
        <pre>{JSON.stringify(testSerialObject, null, 2)}</pre>
        <pre>{JSON.stringify(serializeProxy(testSerialObject).arrayNest, null, 2)}</pre>
        <pre>{JSON.stringify(testSerial, null, 2)}</pre>
      </div>
    </main>
  );
}
