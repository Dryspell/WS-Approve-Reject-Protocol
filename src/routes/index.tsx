import { A } from "@solidjs/router";
import Counter from "~/components/Counter";
import { socket } from "~/lib/socket";

export default function Home() {
	socket.on("connect", () => {
		console.log("connected to server!!");
	});

	return (
		<main class="text-center mx-auto text-gray-700 p-4">
			<h1 class="max-6-xs text-6xl text-sky-700 font-thin uppercase my-16">
				Hello world!
			</h1>
			<Counter />
		</main>
	);
}
