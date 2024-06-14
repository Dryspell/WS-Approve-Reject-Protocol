import useChat from "~/hooks/useChat";
import { socket } from "~/lib/Client/socket";

export default function ChatPage() {
	socket.on("connect", () => {
		console.log("connected to server!!");
	});

	const { Chat } = useChat(socket);

	return (
		<main class="mx-auto text-gray-700 p-4">
			<Chat />
		</main>
	);
}
