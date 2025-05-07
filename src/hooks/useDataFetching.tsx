import { createId } from "@paralleldrive/cuid2";
import { Component, ComponentProps, For, useContext } from "solid-js";
import {
  clientSocket,
  ClientToServerEvents,
  CS_ComType,
  SC_ComType,
  SignalType,
  EmitFunction,
} from "~/types/socket";
import { createStore } from "solid-js/store";
import { JSONObject } from "~/types/utils";
import { DEFAULT_REQUEST_TIMEOUT } from "~/lib/timeout-constants";
import { SocketContext } from "~/app";

const enum QueryStatus {
  Idle,
  Loading,
  Success,
  Error,
}

export type PokemonApiResponse = {
  id: number;
  name: string;
} & JSONObject;

type PokemonRequest = {
  type: CS_ComType.Get;
  request: {
    comId: string;
    data: {
      id: number;
    };
  };
};

type PokemonResponse = {
  type: SC_ComType.Approve | SC_ComType.Reject;
  comId: string;
  data: PokemonApiResponse | { reason: string };
};

export default function useDataFetching<
  TSuccessData,
  TSignalType extends keyof ClientToServerEvents & SignalType,
>(signalType: TSignalType) {
  const socket = useContext(SocketContext);

  const [queryData, setQueryData] = createStore<
    Record<
      string, // queryKey (pokemonId)
      | {
          queryStatus: QueryStatus.Success;
          data?: PokemonApiResponse;
        }
      | {
          queryStatus: QueryStatus.Loading;
        }
      | {
          queryStatus: QueryStatus.Error;
          error: string;
        }
    >
  >({});

  function fetchPokemon(pokemonId: number) {
    const comId = createId();
    setQueryData({ [pokemonId]: { queryStatus: QueryStatus.Loading } });

    const request: PokemonRequest = {
      type: CS_ComType.Get,
      request: {
        comId,
        data: { id: pokemonId },
      }
    };

    socket.timeout(DEFAULT_REQUEST_TIMEOUT).emit(
      SignalType.Pokemon,
      request,
      (error: Error | null, returnData: PokemonResponse) => {
        if (error) {
          setQueryData({
            [pokemonId]: {
              queryStatus: QueryStatus.Error,
              error: error.message,
            },
          });
          return;
        }

        if (returnData.type === SC_ComType.Reject) {
          setQueryData({
            [pokemonId]: {
              queryStatus: QueryStatus.Error,
              error: (returnData.data as { reason: string }).reason,
            },
          });
          return;
        }

        if (returnData.type === SC_ComType.Approve) {
          setQueryData({
            [pokemonId]: {
              queryStatus: QueryStatus.Success,
              data: returnData.data as PokemonApiResponse,
            },
          });
          return;
        }
      }
    );
  }

  const Interface: Component<ComponentProps<"div">> = rawProps => {
    return (
      <div class="p-4 text-gray-700" {...rawProps}>
        <form
          onSubmit={e => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            console.log(formData.get("pokemonId"), typeof formData.get("pokemonId"));
            const pokemonId = !Number.isNaN(parseInt(formData.get("pokemonId") as string))
              ? parseInt(formData.get("pokemonId") as string)
              : 1;
            fetchPokemon(pokemonId);
          }}
          class="max-6-xs my-16 grid grid-cols-2 gap-4 text-6xl font-thin uppercase text-sky-700"
        >
          <div>
            <label for="pokemonId">Pokemon ID:</label>
            <input
              name="pokemonId"
              type="number"
              min="1"
              max="898"
              class="rounded-md border border-gray-300 p-2"
            />
          </div>
          <button type="submit" class="rounded-md border border-gray-300 p-2">
            Fetch Pokemon
          </button>
        </form>
        <div>
          <For each={Object.entries(queryData)}>
            {([queryKey, queryData]) => (
              <>
                {queryData.queryStatus === QueryStatus.Loading ? (
                  <div>Loading...</div>
                ) : queryData.queryStatus === QueryStatus.Error ? (
                  <div>Error: {queryData.error}</div>
                ) : (
                  <pre>{JSON.stringify(queryData.data, null, 2)}</pre>
                )}
              </>
            )}
          </For>
        </div>
      </div>
    );
  };

  return {
    Interface,
    fetchPokemon,
    queryData,
    setQueryData,
  };
}
