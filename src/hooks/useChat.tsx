import { clientSocket, SC_ComType } from "~/types/socket";
import { createSignal } from "solid-js";
import { TextField, TextFieldInput } from "~/components/ui/text-field";
import { Component, ComponentProps, For, onMount } from "solid-js";
import { Message } from "~/lib/Server/chat";

export const chatHandler =
	(
		cache: Map<string, Request>,
		messages: Message[],
		setMessages: (messages: Message[]) => void
	) =>
	([type, comId, data]:
		| [
				type: SC_ComType.Approve,
				comId: string,
				data: [sender: string, message: string]
		  ]
		| [type: SC_ComType.Reject, comId: string, data: [reason: string]]) => {
		const request = cache.get(comId);

		if (!request) {
			switch (type) {
				case SC_ComType.Approve: {
					setMessages([...messages, data]);
					break;
				}

				default: {
					console.error(
						`Received unexpected signal: ${SC_ComType[type]}, ${comId}, ${data}`
					);
				}
			}
		}
	};

export default function useChat(socket: clientSocket) {
	const cache = new Map<string, Request>();
	const [messages, setMessages] = createSignal([] as Message[]);

	const Chat: Component<ComponentProps<"div">> = (rawProps) => {
		return (
			<div>
				<TextField>
					<TextFieldInput
						type={"text"}
						placeholder="Chat as user..."
					/>
				</TextField>
				<For each={messages()}>{(message) => <div>{message}</div>}</For>
				<TextField>
					<TextFieldInput
						type={"text"}
						placeholder="Type a message"
					/>
				</TextField>
			</div>
		);
	};

	return { Chat, cache, messages, setMessages };
}
