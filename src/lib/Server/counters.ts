import {
	CS_ComType,
	SC_ComType,
	serverSocket,
	SignalType,
} from "~/types/socket";
import { serialize, SerializedObject, deserialize } from "~/types/utils";

export const get_response_rep = {} as
	| {
			returnType: SC_ComType.Approve;
			comId: string;
			returnData: { counters: { [k: string]: number } };
	  }
	| {
			returnType: SC_ComType.Reject;
			comId: string;
			returnData: { reason: string };
	  };

export const getOrCreate_request_rep = {
	comId: "",
	data: { sigId: "" },
};

export const delta_request_rep = {
	comId: "",
	data: { sigId: "", delta: 0 },
};

export type CounterHandlerArgs =
	| [
			type: CS_ComType.Get,
			request: SerializedObject<{ comId: string }>,
			callback: (
				returnData:
					| SerializedObject<{
							returnType: SC_ComType.Approve;
							comId: string;
							returnData: { counters: { [k: string]: number } };
					  }>
					| SerializedObject<{
							returnType: SC_ComType.Reject;
							comId: string;
							returnData: { reason: string };
					  }>
			) => void
	  ]
	| [
			type: CS_ComType.GetOrCreate,
			request: SerializedObject<typeof getOrCreate_request_rep>,
			callback: (
				returnData:
					| SerializedObject<{
							returnType: SC_ComType.Approve;
							comId: string;
							returnData: { count: number };
					  }>
					| SerializedObject<{
							returnType: SC_ComType.Reject;
							comId: string;
							returnData: { reason: string };
					  }>
			) => void
	  ]
	| [
			type: CS_ComType.Delta,
			request: SerializedObject<typeof delta_request_rep>,
			callback: (
				returnData:
					| SerializedObject<{
							returnType: SC_ComType.Approve;
							comId: string;
					  }>
					| SerializedObject<{
							returnType: SC_ComType.Reject;
							comId: string;
							returnData: { reason: string };
					  }>
			) => void
	  ];

export default function counters() {
	const signals = new Map<string, number>();
	const defaultValue = 0;

	const handler =
		(socket: serverSocket) =>
		(...[type, request, callback]: CounterHandlerArgs) => {
			try {
				switch (type) {
					case CS_ComType.Get: {
						const [comId] = request;
						callback(
							serialize({
								returnType: SC_ComType.Approve,
								comId,
								counters: Object.fromEntries(signals.entries()),
							})
						);
						break;
					}

					case CS_ComType.GetOrCreate: {
						const {
							comId,
							data: { sigId },
						} = deserialize(request, getOrCreate_request_rep);
						const counter = signals.get(sigId);
						if (counter === undefined) {
							signals.set(sigId, defaultValue);
							callback([
								SC_ComType.Approve,
								comId,
								[defaultValue],
							]);
							socket.broadcast.emit(SignalType.Counter, [
								SC_ComType.Set,
								comId,
								[sigId, defaultValue],
							]);
						} else {
							callback([SC_ComType.Approve, comId, [counter]]);
						}
						break;
					}

					case CS_ComType.Delta: {
						const {
							comId,
							data: { sigId, delta },
						} = deserialize(request, delta_request_rep);
						const counter = signals.get(sigId);
						if (counter === undefined) {
							callback([
								SC_ComType.Reject,
								comId,
								["Counter does not exist"],
							]);
						} else {
							signals.set(sigId, counter + delta);
							callback([SC_ComType.Approve, comId]);

							socket.broadcast.emit(SignalType.Counter, [
								SC_ComType.Delta,
								comId,
								[sigId, delta],
							]);
						}
						break;
					}

					default: {
						console.error(
							`Received unexpected signal type: ${CS_ComType[type]}`
						);
					}
				}
			} catch (error: Error | unknown) {
				console.error(error);
				callback([
					SC_ComType.Reject,
					request[0],
					[
						`An error occurred: ${
							error instanceof Error
								? error.message
								: "Unknown Error"
						}`,
					],
				]);
			}
		};

	return {
		signals,
		defaultValue,
		handler,
	};
}
