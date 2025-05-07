import { CS_ComType, SC_ComType, serverSocket, SignalType } from "~/types/socket";
import Axios from "axios";
import { setupCache } from "axios-cache-interceptor";
import { PokemonApiResponse } from "~/hooks/useDataFetching";

const axiosInstance = Axios.create();
const axios = setupCache(axiosInstance);

export type PokemonFetchHandlerArgs = {
  type: CS_ComType.Get;
  request: {
    comId: string;
    data: {
      id: number;
    };
  };
};

export default function pokemonFetch() {
  const handler =
    (socket: serverSocket) =>
    (args: PokemonFetchHandlerArgs, callback: (error: Error | null, response: any) => void) => {
      const { type, request } = args;
      switch (type) {
        case CS_ComType.Get: {
          const { comId, data } = request;
          axios({
            url: `https://pokeapi.co/api/v2/pokemon/${data.id}`,
            method: "GET",
          }).then(response => {
            if (response.status === 200) {
              callback(null, {
                type: SC_ComType.Approve,
                comId,
                data: response.data
              });
            } else {
              callback(null, {
                type: SC_ComType.Reject,
                comId,
                data: {
                  reason: "Pokemon not found"
                }
              });
            }
          }).catch(error => {
            callback(null, {
              type: SC_ComType.Reject,
              comId,
              data: {
                reason: error.message || "Failed to fetch Pokemon"
              }
            });
          });
          break;
        }
      }
    };

  return { handler };
}
