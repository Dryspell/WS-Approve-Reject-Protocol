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
import { Button } from "~/components/ui/button";
import { randAnimal } from "@ngneat/falso";
import { showToast } from "~/components/ui/toast";

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
		| [type: SC_ComType.Approve, comId: string]
		| [type: SC_ComType.Reject, comId: string, data: [reason: string]]
		| [type: SC_ComType.Delta, comId: string, data: Message]
		| [type: SC_ComType.Set, comId: string, data: Room]) => {
		const request = cache.get(comId);

		if (!request) {
			switch (type) {
				case SC_ComType.Set: {
					const [roomId, ...roomData] = data;
					setRooms({
						[roomId]: [roomId, ...roomData],
					});
					break;
				}

				case SC_ComType.Delta: {
					const [roomId, ...message] = data;
					const room = rooms[roomId];
					room[3].push([roomId, ...message]);
					setRooms({
						[roomId]: room,
					});
					break;
				}

				default: {
					console.error(
						`Received unexpected signal: ${SC_ComType[type]}, ${comId}, ${data}`
					);
				}
			}
		} else {
			const [reqType, reqComId, reqData] = request;
			switch (reqType) {
				case ChatActionType.CreateOrJoinRoom: {
					if (type === SC_ComType.Approve && data) {
						const [roomId, ...roomData] = data;
						setRooms({
							[roomId]: [roomId, ...roomData],
						});
						cache.delete(comId);
					} else if (type === SC_ComType.Reject) {
						const [reason] = data;
						console.error(
							`Failed to create or join room: ${reason}`
						);
					}
					break;
				}

				case ChatActionType.SendMessage: {
					if (type === SC_ComType.Approve && data) {
						const [[senderId, roomId, timestamp, message]] =
							reqData;
						const room = rooms[roomId];
						room[3].push([senderId, roomId, timestamp, message]);
						setRooms({
							[roomId]: room,
						});
						cache.delete(comId);
					} else if (type === SC_ComType.Reject) {
						const [reason] = data;
						console.error(`Failed to send message: ${reason}`);
					}
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

	const [rooms, setRooms] = createStore<Record<string, Room>>({});
	const [currentRoom, setCurrentRoom] = createSignal("global");
	const [user, setUser] = createSignal({
		name: randAnimal(),
		id: createId(),
	});
	const [chatInput, setChatInput] = createSignal("");

	socket.on(SignalType.Chat, chatHandler(cache, rooms, setRooms));

	const Chat: Component<ComponentProps<"div">> = (rawProps) => {
		onMount(() => {
			const comId = createId();
			const request: Request = [
				ChatActionType.CreateOrJoinRoom,
				comId,
				["global", "Global", user().name],
			];
			cache.set(comId, request);
			socket.emit(SignalType.Chat, request);
		});

		console.log(rooms);

		return (
			<div>
				<TextField>
					<TextFieldInput
						type={"text"}
						placeholder="Chat as user..."
						value={user().name}
						onInput={(e) =>
							setUser({
								name: e.currentTarget.value,
								id: user().id,
							})
						}
					/>
				</TextField>
				<Tabs
					defaultValue="global"
					value={currentRoom()}
					onChange={setCurrentRoom}
					class="py-1"
				>
					<div class="flex flex-row w-full justify-center items-center">
						<TabsList class="grid grid-flow-col auto-cols-min w-80% w-full">
							<For each={Object.entries(rooms)}>
								{([roomId, room]) => (
									<TabsTrigger value={roomId}>
										{room[1]}
									</TabsTrigger>
								)}
							</For>
						</TabsList>
						<Button
							variant="outline"
							class="m-1.5 inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 text-sm font-medium"
						>
							Create Room
						</Button>
					</div>

					<For each={Object.entries(rooms)}>
						{([
							roomId,
							[, roomName, memberIds, messages, permissions],
						]) => (
							<TabsContent value={roomId}>
								<For each={messages}>
									{([
										senderId,
										roomId,
										timestamp,
										message,
									]) => <div>{message}</div>}
								</For>
							</TabsContent>
						)}
					</For>
				</Tabs>
				<div class="flex flex-row w-full justify-center items-center">
					<TextField class="w-full">
						<TextFieldInput
							value={chatInput()}
							onInput={(e) => setChatInput(e.currentTarget.value)}
							type={"text"}
							placeholder="Type a message..."
						/>
					</TextField>
					<Button
						class="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 mx-3 text-sm font-medium"
						onClick={() => {
							if (!chatInput() || !currentRoom() || !user().id) {
								showToast({
									title: "You say anything!",
									description:
										"Please enter a message before sending!",
									variant: "error",
								});
							}
							const comId = createId();
							const request: Request = [
								ChatActionType.SendMessage,
								comId,
								[
									[
										user().id,
										currentRoom(),
										Date.now(),
										chatInput(),
									],
								],
							];
							cache.set(comId, request);
							socket.emit(SignalType.Chat, request);
						}}
					>
						Send!
					</Button>
				</div>
			</div>
		);
	};

	return { Chat, cache, messages, setMessages };
}
