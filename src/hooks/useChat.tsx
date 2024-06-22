import { clientSocket, SC_ComType, SignalType } from "~/types/socket";
import { createSignal } from "solid-js";
import { TextField, TextFieldInput } from "~/components/ui/text-field";
import { Component, ComponentProps, For, onMount } from "solid-js";
import { ChatHandlerArgs, Message, Room } from "~/lib/Server/chat";
import { createStore, SetStoreFunction } from "solid-js/store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { createId } from "@paralleldrive/cuid2";
import { InferCallbackData, InferRequestData } from "~/types/socket-utils";
import { Button } from "~/components/ui/button";
import { randAnimal } from "@ngneat/falso";
import { showToast } from "~/components/ui/toast";
import { DEFAULT_REQUEST_TIMEOUT } from "~/lib/Client/socket";

export enum ChatActionType {
	CreateOrJoinRoom,
	LeaveRoom,
	SendMessage,
}

export const chatHandler =
	(
		rooms: Record<string, Room>,
		setRooms: SetStoreFunction<Record<string, Room>>
	) =>
	([type, comId, data]:
		| [type: SC_ComType.Delta, comId: string, data: Message]
		| [type: SC_ComType.Set, comId: string, data: Room]) => {
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
	};

const DEFAULT_CHAT_ROOM = {
	id: "global",
	name: "Global",
	members: [],
	messages: [],
	permissions: [],
};

const joinRoom = (
	socket: clientSocket,
	roomId: string,
	roomName: string,
	userName: string,
	setRooms: SetStoreFunction<Record<string, Room>>
) => {
	socket
		.timeout(DEFAULT_REQUEST_TIMEOUT)
		.emit(
			SignalType.Chat,
			ChatActionType.CreateOrJoinRoom,
			[createId(), [roomId, roomName, userName]],
			(
				err: Error,
				[returnType, comId, returnData]: InferCallbackData<
					ChatHandlerArgs,
					ChatActionType.CreateOrJoinRoom
				>
			) => {
				if (err) {
					showToast({
						title: "Error",
						description: err.message,
						variant: "error",
					});
					return;
				}
				if (returnType === SC_ComType.Reject) {
					const [reason] = returnData;
					showToast({
						title: "Error",
						description: reason,
						variant: "error",
					});
					return;
				}

				const [roomId, roomName, ...roomData] = returnData;
				showToast({
					title: "Room Joined!",
					description: `You have
              successfully created or joined room: ${roomName}`,
					variant: "success",
				});
				setRooms({
					[roomId]: [roomId, roomName, ...roomData],
				});
			}
		);
};

const sendMessage = (
	socket: clientSocket,
	message: Message,
	rooms: Record<string, Room>,
	setRooms: SetStoreFunction<Record<string, Room>>
) => {
	socket
		.timeout(DEFAULT_REQUEST_TIMEOUT)
		.emit(
			SignalType.Chat,
			ChatActionType.SendMessage,
			[createId(), [message]],
			(
				err: Error,
				[returnType, comId, returnData]: InferCallbackData<
					ChatHandlerArgs,
					ChatActionType.SendMessage
				>
			) => {
				if (returnType === SC_ComType.Reject) {
					const [reason] = returnData;
					showToast({
						title: "Error",
						description: reason,
						variant: "error",
					});
					return;
				}
				if (err) {
					showToast({
						title: "Error",
						description: err.message,
						variant: "error",
					});
					return;
				}
				if (returnType === SC_ComType.Approve && returnData) {
					const [senderId, roomId, ...rest] = message;
					const room = rooms[roomId];
					room[3].push(message);
					setRooms({
						[roomId]: room,
					});
				}
			}
		);
};

export default function useChat(socket: clientSocket) {
	const [messages, setMessages] = createSignal([] as Message[]);

	const [rooms, setRooms] = createStore<Record<string, Room>>({});
	const [currentRoom, setCurrentRoom] = createSignal(DEFAULT_CHAT_ROOM.id);
	const [user, setUser] = createSignal({
		name: randAnimal(),
		id: createId(),
	});
	const [chatInput, setChatInput] = createSignal("");

	socket.on(SignalType.Chat, chatHandler(rooms, setRooms));

	const Chat: Component<ComponentProps<"div">> = (rawProps) => {
		onMount(() => {
			joinRoom(
				socket,
				DEFAULT_CHAT_ROOM.id,
				DEFAULT_CHAT_ROOM.name,
				user().name,
				setRooms
			);
		});

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
							const message: Message = [
								user().id,
								currentRoom(),
								Date.now(),
								chatInput(),
							];
							sendMessage(socket, message, rooms, setRooms);
						}}
					>
						Send!
					</Button>
				</div>
			</div>
		);
	};

	return { Chat, messages, setMessages };
}
