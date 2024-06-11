import { createRepresentation, deepClone, serialize } from "~/types/utils";
import { deserialize } from "../types/utils";

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
	const deserialized = deserialize(
		deepClone(serialized),
		createRepresentation(testSerialObject)
	);

	return (
		<div class="grid grid-cols-3 gap-4">
			<div>
				<h1>Test Object</h1>
				<pre>{JSON.stringify(testSerialObject, null, 2)}</pre>
			</div>
			<div>
				<h1>Representation</h1>
				<pre>
					{JSON.stringify(
						createRepresentation(testSerialObject),
						null,
						2
					)}
				</pre>
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
				<pre>
					{JSON.stringify(
						serialize(deepClone(testSerialObject2)),
						null,
						2
					)}
				</pre>
			</div>
			<div>
				<h1>Deserialized Second Object</h1>
				<pre>
					{JSON.stringify(
						deserialize(
							serialize(deepClone(testSerialObject2)),
							createRepresentation(testSerialObject)
						),
						null,
						2
					)}
				</pre>
			</div>
		</div>
	);
}
