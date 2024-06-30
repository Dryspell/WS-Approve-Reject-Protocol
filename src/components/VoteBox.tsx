import { clientSocket, SC_ComType, SignalType } from "~/types/socket";
import { createSignal, onMount, useContext } from "solid-js";
import { Component, ComponentProps } from "solid-js";
import { Message, ChatRoom } from "~/lib/Server/chat";
import { createStore, SetStoreFunction } from "solid-js/store";
import { createId } from "@paralleldrive/cuid2";
import { randAnimal } from "@ngneat/falso";
import { SocketContext } from "~/app";
import { createLocalStorageSignal } from "~/hooks/createLocalStorageSignal";
import { GameRoom, VoteActionType, VoteHandlerArgs } from "~/lib/Server/vote";
import { DEFAULT_REQUEST_TIMEOUT } from "~/lib/Client/socket";
import { InferCallbackData } from "~/types/socket-utils";
import { showToast } from "./ui/toast";

const DEFAULT_GAME_ROOM = { id: "game1", name: "Game Room 1" };

export const voteHandler =
	(
		rooms: Record<string, GameRoom>,
		setRooms: SetStoreFunction<Record<string, GameRoom>>
	) =>
	([type, comId, data]:
		| [type: SC_ComType.Delta, comId: string, data: Message]
		| [type: SC_ComType.Set, comId: string, data: GameRoom]) => {
		try {
			// console.log(
			// 	`Received signal: ${SC_ComType[type]}, ${comId}, ${data}`
			// );
			switch (type) {
				default: {
					console.error(
						`Received unexpected signal: ${SC_ComType[type]}, ${comId}, ${data}`
					);
				}
			}
		} catch (e) {
			console.error(
				`Failed to properly handle: ${SC_ComType[type]}, ${comId}, ${data}:`,
				e instanceof Error ? e.message : e
			);
		}
	};

const joinRoom = (
	socket: clientSocket,
	roomId: string,
	roomName: string,
	user: { name: string; id: string },
	setRooms: SetStoreFunction<Record<string, GameRoom>>
) => {
	socket
		.timeout(DEFAULT_REQUEST_TIMEOUT)
		.emit(
			SignalType.Vote,
			VoteActionType.CreateOrJoinRoom,
			[createId(), [roomId, roomName, [user.id, user.name]]],
			(
				err: Error,
				[returnType, comId, returnData]: InferCallbackData<
					VoteHandlerArgs,
					VoteActionType.CreateOrJoinRoom
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
					showToast({
						title: "Error",
						description: returnData[0],
						variant: "error",
						duration: 5000,
					});
					return;
				}

				if (returnType === SC_ComType.Approve) {
					showToast({
						title: "Success",
						description: `You have
              successfully created or joined room: ${roomName}`,
						variant: "success",
						duration: 5000,
					});
					setRooms({ [roomId]: returnData });
				}
			}
		);

	throw new Error("Not implemented");
};

const VoteBox: Component<ComponentProps<"div">> = (rawProps) => {
	const socket = useContext(SocketContext);

	const [rooms, setRooms] = createStore<Record<string, GameRoom>>({});
	const [currentRoom, setCurrentRoom] = createSignal(DEFAULT_GAME_ROOM.id);
	const [user, setUser] = createLocalStorageSignal("chat-user", {
		name: randAnimal(),
		id: createId(),
	});

	const [chatInput, setChatInput] = createSignal("");

	socket.on(SignalType.Vote, voteHandler(rooms, setRooms));

	onMount(() => {
		joinRoom(
			socket,
			DEFAULT_GAME_ROOM.id,
			DEFAULT_GAME_ROOM.name,
			user(),
			setRooms
		);
	});

	return <div>Vote</div>;
};

export default VoteBox;
