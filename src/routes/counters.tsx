import useSocketCounter from "~/hooks/useSocketCounter";
import { socket } from "~/lib/Client/socket";

export default function CountersPage() {
	socket.on("connect", () => {
		console.log("connected to server!!");
	});

	const { Counters } = useSocketCounter(socket, "1");

	return (
		<main class="mx-auto text-gray-700 p-4">
			<div>
				<Counters class="py-[1rem]" />
			</div>
		</main>
	);
}
