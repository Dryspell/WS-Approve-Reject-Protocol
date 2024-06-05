import { createRepresentation, deepClone, serialize } from "~/types/utils";
import { deserialize } from "../types/utils";

export default function Serialization(props: {}) {
	const testSerialObject = {
		greeting: "Welcome to quicktype!",
		instructions: [
			"Type or paste JSON here",
			"Or choose a sample above",
			"quicktype will generate code in your",
			"chosen language to parse the sample data",
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
		greeting: "Welcome to quicktype!",
		instructions: [
			"Type or paste JSON here",
			"Or choose a sample above",
			"quicktype will generate code in your",
			"chosen language to parse the sample data",
			"cool",
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
			<pre>{JSON.stringify(testSerialObject, null, 2)}</pre>
			<pre>
				{JSON.stringify(
					createRepresentation(testSerialObject),
					null,
					2
				)}
			</pre>
			<pre>{JSON.stringify(serialized, null, 2)}</pre>
			<pre>{JSON.stringify(deserialized, null, 2)}</pre>
			<pre>
				{JSON.stringify(
					serialize(deepClone(testSerialObject2)),
					null,
					2
				)}
			</pre>
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
	);
}
