import {
	clientSocket,
	ClientToServerEvents,
	SC_ComType,
	SignalType,
} from "~/types/socket";
import { createSignal } from "solid-js";
import { TextField, TextFieldInput } from "~/components/ui/text-field";
import { Component, ComponentProps, For, onMount } from "solid-js";
import { Message, Room } from "~/lib/Server/chat";
import { createStore, SetStoreFunction } from "solid-js/store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { createId } from "@paralleldrive/cuid2";
import { InferRequestData } from "~/types/socket-utils";

type Request = InferRequestData<SignalType.Chat>;

export enum ChatActionType {
	CreateOrJoinRoom,
	LeaveRoom,
	SendMessage,
}

export const chatHandler =
	(
		cache: Map<string, Request>,
		rooms: Record<string, Room>,
		setRooms: SetStoreFunction<Record<string, Room>>
	) =>
	([type, comId, data]:
		| [type: SC_ComType.Approve, comId: string, data: Room]
		| [type: SC_ComType.Reject, comId: string, data: [reason: string]]) => {
		const request = cache.get(comId);

		if (!request) {
			switch (type) {
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

	const [rooms, setRooms] = createStore<Record<string, Room>>({});

	const handler = chatHandler(cache, rooms, setRooms);

	const Chat: Component<ComponentProps<"div">> = (rawProps) => {
		onMount(() => {
			const comId = createId();
			const request: Request = [
				ChatActionType.CreateOrJoinRoom,
				comId,
				["global", "Global", "user1"],
			];
			cache.set(comId, request);
			socket.emit(SignalType.Chat, request);
		});

		return (
			<div>
				<TextField>
					<TextFieldInput
						type={"text"}
						placeholder="Chat as user..."
					/>
				</TextField>
				<Tabs defaultValue="global" class="py-1">
					<TabsList class="grid w-full grid-cols-2">
						<TabsTrigger value="global">Global</TabsTrigger>
						<TabsTrigger value="room1">room1</TabsTrigger>
					</TabsList>
					<TabsContent value="global">
						<For each={messages()}>
							{(message) => <div>{message}</div>}
						</For>
						<TextField>
							<TextFieldInput
								type={"text"}
								placeholder="Type a message"
							/>
						</TextField>
					</TabsContent>
					<TabsContent value="room1">room1</TabsContent>
				</Tabs>
			</div>
		);
	};

	return { Chat, handler, cache, messages, setMessages };
}
