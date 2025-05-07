import { createId } from "@paralleldrive/cuid2";
import { Component, ComponentProps, For, onMount, useContext } from "solid-js";
import { Flex } from "~/components/ui/flex";
import { clientSocket, CS_ComType, SC_ComType, SignalType, CounterActionResponse } from "~/types/socket";
import { createStore, SetStoreFunction } from "solid-js/store";
import { showToast } from "~/components/ui/toast";
import { DEFAULT_REQUEST_TIMEOUT, DEFAULT_TOAST_DURATION } from "~/lib/timeout-constants";
import { InferCallbackData } from "~/types/socket-utils";
import { CounterHandlerArgs } from "~/lib/Server/counters";
import { SocketContext } from "~/app";

export const counterHandler =
  (
    counters: {
      [counterId: string]: number;
    },
    setCounters: SetStoreFunction<{
      [counterId: string]: number;
    }>,
  ) =>
  (data: {
    type: SC_ComType;
    comId: string;
    data?: { sigId: string; amount: number } | { counters: { [sigId: string]: number } };
  }) => {
    switch (data.type) {
      case SC_ComType.Set: {
        const { sigId, amount } = data.data as { sigId: string; amount: number };
        setCounters({ [sigId]: amount });
        break;
      }

      case SC_ComType.Delta: {
        const { sigId, amount } = data.data as { sigId: string; amount: number };
        setCounters({ [sigId]: counters[sigId] + amount });
        break;
      }

      default: {
        console.error(`Received unexpected signal type: ${SC_ComType[data.type]}`);
      }
    }
  };

export default function useSocketCounter(sigId: string) {
  const [counters, setCounters] = createStore<{
    [counterId: string]: number;
  }>({});

  const socket = useContext(SocketContext);
  socket.on(SignalType.Counter, counterHandler(counters, setCounters));

  const delta = (delt: number) => {
    socket
      .timeout(DEFAULT_REQUEST_TIMEOUT)
      .emit<CS_ComType.Delta>(
        SignalType.Counter,
        {
          type: CS_ComType.Delta,
          request: {
            comId: createId(),
            data: {
              sigId,
              amount: delt
            }
          }
        },
        (error: Error | null, returnData: CounterActionResponse<CS_ComType.Delta> | { type: SC_ComType.Reject; comId: string; data: { reason: string } }) => {
          if (error) {
            showToast({
              title: "Error",
              description: error.message,
              variant: "error",
              duration: DEFAULT_TOAST_DURATION,
            });
            return;
          }

          if (returnData.type === SC_ComType.Reject) {
            showToast({
              title: "Error",
              description: returnData.data.reason,
              variant: "error",
              duration: DEFAULT_TOAST_DURATION,
            });
            return;
          }
          setCounters({ [sigId]: counters[sigId] + delt });
        }
      );
  };

  const Counters: Component<ComponentProps<"div">> = rawProps => {
    onMount(() => {
      socket
        .timeout(DEFAULT_REQUEST_TIMEOUT)
        .emit<CS_ComType.Get>(
          SignalType.Counter,
          {
            type: CS_ComType.Get,
            request: {
              comId: createId()
            }
          },
          (error: Error | null, returnData: CounterActionResponse<CS_ComType.Get> | { type: SC_ComType.Reject; comId: string; data: { reason: string } }) => {
            if (error) {
              console.error(error.message);
              return;
            }

            if (returnData.type === SC_ComType.Reject) {
              console.error(returnData.data.reason);
              return;
            }
            setCounters(returnData.data.counters);
          }
        );

      socket
        .timeout(DEFAULT_REQUEST_TIMEOUT)
        .emit<CS_ComType.GetOrCreate>(
          SignalType.Counter,
          {
            type: CS_ComType.GetOrCreate,
            request: {
              comId: createId(),
              data: {
                sigId
              }
            }
          },
          (error: Error | null, returnData: CounterActionResponse<CS_ComType.GetOrCreate> | { type: SC_ComType.Reject; comId: string; data: { reason: string } }) => {
            if (error) {
              console.error(error.message);
              return;
            }

            if (returnData.type === SC_ComType.Reject) {
              console.error(returnData.data.reason);
              return;
            }
            setCounters({ [sigId]: returnData.data.amount });
          }
        );
    });

    return (
      <Flex flexDirection="row" justifyContent="center" alignItems="center" {...rawProps}>
        <For each={Object.entries(counters)}>
          {([id, value]) => (
            <>
              <button
                class="w-[200px] rounded-full border-2 border-gray-300 bg-gray-100 px-[2rem] py-[1rem] focus:border-gray-400 active:border-gray-400"
                onClick={() => delta(-1)}
              >
                Decrement
              </button>
              <h2 class="px-[2rem] text-2xl font-thin text-gray-700">{`CounterId: ${id}, value: ${value}`}</h2>
              <button
                class="w-[200px] rounded-full border-2 border-gray-300 bg-gray-100 px-[2rem] py-[1rem] focus:border-gray-400 active:border-gray-400"
                onClick={() => delta(1)}
              >
                Increment
              </button>
            </>
          )}
        </For>
      </Flex>
    );
  };

  return { Counters, counters, setCounters, delta };
}
