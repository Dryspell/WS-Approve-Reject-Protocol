import useChat from "~/hooks/useChat";

export default function ChatPage() {
	const { Chat } = useChat();

	return (
		<main class="mx-auto text-gray-700 p-4">
			<Chat />
		</main>
	);
}
