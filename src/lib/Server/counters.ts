import { CS_ComType, SC_ComType, serverSocket, SignalType } from "~/types/socket";

export type CounterHandlerArgs =
  | [
      type: CS_ComType.Get,
      request: [comId: string],
      callback: (
        returnData:
          | [
              returnType: SC_ComType.Approve,
              comId: string,
              returnData: [counters: { [k: string]: number }],
            ]
          | [returnType: SC_ComType.Reject, comId: string, returnData: [reason: string]],
      ) => void,
    ]
  | [
      type: CS_ComType.GetOrCreate,
      request: [comId: string, [sigId: string]],
      callback: (
        returnData:
          | [returnType: SC_ComType.Approve, comId: string, returnData: [count: number]]
          | [returnType: SC_ComType.Reject, comId: string, returnData: [reason: string]],
      ) => void,
    ]
  | [
      type: CS_ComType.Delta,
      request: [comId: string, [sigId: string, delta: number]],
      callback: (
        returnData:
          | [returnType: SC_ComType.Approve, comId: string]
          | [returnType: SC_ComType.Reject, comId: string, returnData: [reason: string]],
      ) => void,
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
            callback([SC_ComType.Approve, comId, [Object.fromEntries(signals.entries())]]);
            break;
          }

          case CS_ComType.GetOrCreate: {
            const [comId, [sigId]] = request;
            const counter = signals.get(sigId);
            if (counter === undefined) {
              signals.set(sigId, defaultValue);
              callback([SC_ComType.Approve, comId, [defaultValue]]);
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
            const [comId, [sigId, delta]] = request;
            const counter = signals.get(sigId);
            if (counter === undefined) {
              callback([SC_ComType.Reject, comId, ["Counter does not exist"]]);
            } else {
              signals.set(sigId, counter + delta);
              callback([SC_ComType.Approve, comId]);

              socket.broadcast.emit(SignalType.Counter, [SC_ComType.Delta, comId, [sigId, delta]]);
            }
            break;
          }

          default: {
            console.error(`Received unexpected signal type: ${CS_ComType[type]}`);
          }
        }
      } catch (error: Error | unknown) {
        console.error(error);
        callback([
          SC_ComType.Reject,
          request[0],
          [`An error occurred: ${error instanceof Error ? error.message : "Unknown Error"}`],
        ]);
      }
    };

  return {
    signals,
    defaultValue,
    handler,
  };
}
