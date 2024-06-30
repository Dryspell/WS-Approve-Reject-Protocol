import {
	CS_ComType,
	SC_ComType,
	serverSocket,
	SignalType,
} from "~/types/socket";
import { User } from "./chat";

export enum VoteActionType {
	CreateOrJoinRoom,
	ReadyGameStart,
	SetVoteColor,
	CreateOffer,
	AcceptOffer,
}

export enum TicketColor {
	Red,
	Blue,
	None,
}

export type Ticket = [
	ticketId: string,
	ticketOwner: User[0],
	ticketColor: TicketColor
];

export enum OfferType {
	Buy,
	Sell,
	BuyPromise,
	SellPromise,
}
export type Offer = [
	offerId: string,
	offerOwner: User[0],
	offerType: OfferType,
	price: number
];

export type GameRoom = [
	roomId: string,
	roomName: string,
	members: User[],
	tickets: Ticket[],
	offers: Offer[],
	startTime: number | null
];

export type VoteHandlerArgs = [
	type: VoteActionType.CreateOrJoinRoom,
	request: [
		comId: string,
		data: [roomId: string, roomName: string, user: User]
	],
	callback: (
		returnData:
			| [
					returnType: SC_ComType.Approve,
					comId: string,
					returnData: GameRoom
			  ]
			| [
					returnType: SC_ComType.Reject,
					comId: string,
					returnData: [reason: string]
			  ]
	) => void
];

export default function vote() {
	const rooms = new Map<string, GameRoom>();

	const handler =
		(socket: serverSocket) =>
		(...[type, request, callback]: VoteHandlerArgs) => {
			try {
				switch (type) {
					case VoteActionType.CreateOrJoinRoom: {
						const [comId, [roomId, roomName, user]] = request;
						if (!user) {
							callback([
								SC_ComType.Reject,
								comId,
								["User is not logged in"],
							]);
							return;
						}

						let room = rooms.get(roomId);
						if (!room) {
							room = [roomId, roomName, [user], [], [], null];
							rooms.set(roomId, room);
						} else if (!room[2].includes(user)) {
							const [
								roomId,
								roomName,
								members,
								tickets,
								offers,
								startTime,
							] = room;
							const newRoom: GameRoom = [
								roomId,
								roomName,
								[...members, user],
								tickets,
								offers,
								startTime,
							];
							rooms.set(roomId, newRoom);
							socket.join(roomId);
							socket.broadcast.emit(SignalType.Vote, [
								SC_ComType.Set,
								roomId,
								newRoom,
							]);

							callback([SC_ComType.Approve, comId, newRoom]);
						}

						break;
					}
					default: {
						console.error(
							`Received unexpected signal: ${CS_ComType[type]}, ${request}`
						);
					}
				}
			} catch (e) {
				console.error(
					`Failed to properly handle: ${CS_ComType[type]}, ${request}:`,
					e instanceof Error ? e.message : e
				);
			}
		};

	return { handler };
}
