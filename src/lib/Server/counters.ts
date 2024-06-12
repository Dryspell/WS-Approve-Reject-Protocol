import {
	CS_ComType,
	SC_ComType,
	serverSocket,
	SignalType,
} from "~/types/socket";

export default function counters() {
	const signals = new Map<string, number>();
	const defaultValue = 0;

	const handler =
		(socket: serverSocket) =>
		([type, comId, data]:
			| [type: CS_ComType.Get, comId: string]
			| [
					type: CS_ComType.GetOrCreate,
					comId: string,
					data: [sigId: string]
			  ]
			| [
					type: CS_ComType.Delta,
					comId: string,
					data: [sigId: string, delta: number]
			  ]) => {
			// console.log({ params });

			switch (type) {
				case CS_ComType.Get: {
					socket.emit(SignalType.Counter, [
						SC_ComType.Approve,
						comId,
						[Object.fromEntries(signals.entries())],
					]);
					break;
				}

				case CS_ComType.GetOrCreate: {
					const [sigId] = data;
					const counter = signals.get(sigId);
					if (counter === undefined) {
						signals.set(sigId, defaultValue);
						socket.emit(SignalType.Counter, [
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
						socket.emit(SignalType.Counter, [
							SC_ComType.Approve,
							comId,
							[counter],
						]);
					}
					break;
				}

				case CS_ComType.Delta: {
					const [sigId, delta] = data;
					const counter = signals.get(sigId);
					if (counter === undefined) {
						socket.emit(SignalType.Counter, [
							SC_ComType.Reject,
							comId,
							["Counter does not exist"],
						]);
					} else {
						signals.set(sigId, counter + delta);
						socket.emit(SignalType.Counter, [
							SC_ComType.Approve,
							comId,
						]);

						socket.broadcast.emit(SignalType.Counter, [
							SC_ComType.Delta,
							comId,
							[sigId, delta],
						]);
					}
					break;
				}
			}
		};

	return {
		signals,
		defaultValue,
		handler,
	};
}
