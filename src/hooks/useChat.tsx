import { clientSocket, SC_ComType, SignalType } from "~/types/socket";
import { createEffect, createSignal } from "solid-js";
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
import { formatDistance } from "date-fns";
import {
	Resizable,
	ResizableHandle,
	ResizablePanel,
} from "~/components/ui/resizable";
import { Card } from "~/components/ui/card";

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
	user: { name: string; id: string },
	setRooms: SetStoreFunction<Record<string, Room>>
) => {
	socket
		.timeout(DEFAULT_REQUEST_TIMEOUT)
		.emit(
			SignalType.Chat,
			ChatActionType.CreateOrJoinRoom,
			[createId(), [roomId, roomName, [user.id, user.name]]],
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
						duration: 5000,
					});
					return;
				}
				if (returnType === SC_ComType.Reject) {
					const [reason] = returnData;
					showToast({
						title: "Error",
						description: reason,
						variant: "error",
						duration: 5000,
					});
					return;
				}

				const [roomId, roomName, ...roomData] = returnData;
				showToast({
					title: "Room Joined!",
					description: `You have
              successfully created or joined room: ${roomName}`,
					variant: "success",
					duration: 5000,
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
				console.log(
					`Received response from server: ${returnType}, ${comId}, ${returnData}`
				);
				console.log(returnType === SC_ComType.Approve);
				if (returnType === SC_ComType.Reject) {
					const [reason] = returnData;
					showToast({
						title: "Error",
						description: reason,
						variant: "error",
						duration: 5000,
					});
					return;
				}
				if (err) {
					showToast({
						title: "Error",
						description: err.message,
						variant: "error",
						duration: 5000,
					});
					return;
				}
				if (returnType === SC_ComType.Approve) {
					console.log(
						`Recieved approval from server: ${message.join(", ")}`
					);
					const [senderId, roomId, ...rest] = message;
					const [, roomName, memberIds, messages, permissions] =
						rooms[roomId];
					setRooms(roomId, [
						roomId,
						roomName,
						memberIds,
						[...messages, message],
						permissions,
					]);
				}
			}
		);
};

export default function useChat(socket: clientSocket) {
	const Chat: Component<ComponentProps<"div">> = (rawProps) => {
		const [rooms, setRooms] = createStore<Record<string, Room>>({});
		const [currentRoom, setCurrentRoom] = createSignal(
			DEFAULT_CHAT_ROOM.id
		);
		const [user, setUser] = createSignal({
			name: randAnimal(),
			id: createId(),
		});
		const [chatInput, setChatInput] = createSignal("");

		socket.on(SignalType.Chat, chatHandler(rooms, setRooms));

		onMount(() => {
			joinRoom(
				socket,
				DEFAULT_CHAT_ROOM.id,
				DEFAULT_CHAT_ROOM.name,
				user(),
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
							[, roomName, members, messages, permissions],
						]) => (
							<TabsContent value={roomId}>
								<Resizable
									orientation="horizontal"
									class="max-w-full rounded-lg border"
								>
									<ResizablePanel
										initialSize={0.15}
										class="p-2"
									>
										<For each={members}>
											{([id, name]) => (
												<Card class="m-1.5">
													<div class="flex flex-row items-center">
														<div
															class="chat-image
                              avatar"
														>
															<div class="w-10 rounded-full">
																<img
																	alt="Tailwind CSS chat bubble component"
																	src="https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.jpg"
																/>
															</div>
														</div>
														<div class="chat-header">
															{name}
														</div>
													</div>
												</Card>
											)}
										</For>
									</ResizablePanel>
									<ResizableHandle withHandle />
									<ResizablePanel
										initialSize={0.85}
										class="p-2"
									>
										<div>
											<For each={messages}>
												{([
													senderId,
													roomId,
													timestamp,
													message,
												]) => {
													return (
														<div
															class={`chat ${
																senderId ===
																user().id
																	? "chat-start"
																	: "chat-end"
															}`}
														>
															<div class="chat-image avatar">
																<div class="w-10 rounded-full">
																	<img
																		alt="Tailwind CSS chat bubble component"
																		src="https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.jpg"
																	/>
																</div>
															</div>
															<div class="chat-header">
																{
																	members.find(
																		([
																			id,
																			name,
																		]) =>
																			id ===
																			senderId
																	)?.[1]
																}
																<time class="text-xs opacity-50 px-2">
																	{formatDistance(
																		new Date(
																			timestamp
																		),
																		new Date(),
																		{
																			addSuffix:
																				true,
																		}
																	)}
																</time>
															</div>
															<div class="chat-bubble">
																{message}
															</div>
															<div class="chat-footer opacity-50">
																Delivered
															</div>
														</div>
													);
												}}
											</For>
										</div>
									</ResizablePanel>
								</Resizable>
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
									duration: 5000,
								});
							}
							const message: Message = [
								user().id,
								currentRoom(),
								Date.now(),
								chatInput(),
							];
							sendMessage(socket, message, rooms, setRooms);
							setChatInput("");
						}}
					>
						Send!
					</Button>
				</div>
			</div>
		);
	};

	return { Chat };
}
