import { clientOnly } from "@solidjs/start";
const Chat = clientOnly(() => import("~/components/Chat"));

export default function ChatPage() {
	return (
		<main class="mx-auto text-gray-700 p-4">
			<Chat />
		</main>
	);
}
