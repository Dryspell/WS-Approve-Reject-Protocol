import { CS_ComType, SC_ComType, serverSocket, SignalType } from "~/types/socket";

export type CounterHandlerArgs = {
  type: CS_ComType.Get;
  request: {
    comId: string;
  };
  callback: (
    returnData:
      | {
          type: SC_ComType.Approve;
          comId: string;
          data: {
            counters: { [k: string]: number };
          };
        }
      | {
          type: SC_ComType.Reject;
          comId: string;
          data: {
            reason: string;
          };
        }
  ) => void;
} | {
  type: CS_ComType.GetOrCreate;
  request: {
    comId: string;
    data: {
      sigId: string;
    };
  };
  callback: (
    returnData:
      | {
          type: SC_ComType.Approve;
          comId: string;
          data: {
            amount: number;
          };
        }
      | {
          type: SC_ComType.Reject;
          comId: string;
          data: {
            reason: string;
          };
        }
  ) => void;
} | {
  type: CS_ComType.Delta;
  request: {
    comId: string;
    data: {
      sigId: string;
      amount: number;
    };
  };
  callback: (
    returnData:
      | {
          type: SC_ComType.Approve;
          comId: string;
        }
      | {
          type: SC_ComType.Reject;
          comId: string;
          data: {
            reason: string;
          };
        }
  ) => void;
};

export default function counters() {
  const signals = new Map<string, number>();
  const defaultValue = 0;

  const handler =
    (socket: serverSocket) =>
    ({ type, request, callback }: CounterHandlerArgs) => {
      try {
        switch (type) {
          case CS_ComType.Get: {
            const { comId } = request;
            callback({
              type: SC_ComType.Approve,
              comId,
              data: {
                counters: Object.fromEntries(signals.entries())
              }
            });
            break;
          }

          case CS_ComType.GetOrCreate: {
            const { comId, data: { sigId } } = request;
            const counter = signals.get(sigId);
            if (counter === undefined) {
              signals.set(sigId, defaultValue);
              callback({
                type: SC_ComType.Approve,
                comId,
                data: {
                  amount: defaultValue
                }
              });
              socket.broadcast.emit(SignalType.Counter, {
                type: SC_ComType.Set,
                comId,
                data: {
                  sigId,
                  amount: defaultValue
                }
              });
            } else {
              callback({
                type: SC_ComType.Approve,
                comId,
                data: {
                  amount: counter
                }
              });
            }
            break;
          }

          case CS_ComType.Delta: {
            const { comId, data: { sigId, amount } } = request;
            const counter = signals.get(sigId);
            if (counter === undefined) {
              callback({
                type: SC_ComType.Reject,
                comId,
                data: {
                  reason: "Counter does not exist"
                }
              });
            } else {
              signals.set(sigId, counter + amount);
              callback({
                type: SC_ComType.Approve,
                comId
              });

              socket.broadcast.emit(SignalType.Counter, {
                type: SC_ComType.Delta,
                comId,
                data: {
                  sigId,
                  amount
                }
              });
            }
            break;
          }

          default: {
            console.error(`Received unexpected signal type: ${CS_ComType[type]}`);
          }
        }
      } catch (error: Error | unknown) {
        console.error(error);
        callback({
          type: SC_ComType.Reject,
          comId: request.comId,
          data: {
            reason: `An error occurred: ${error instanceof Error ? error.message : "Unknown Error"}`
          }
        });
      }
    };

  return {
    signals,
    defaultValue,
    handler,
  };
}
