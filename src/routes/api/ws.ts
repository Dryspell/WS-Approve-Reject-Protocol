import { type APIEvent } from "@solidjs/start/server";
import { Server } from "socket.io";
import {
  CS_ComType,
  SC_ComType,
  serverSocket,
  SignalType,
  type SocketWithIO,
  type sServer,
} from "~/types/socket";
import Axios from "axios";
import { setupCache } from "axios-cache-interceptor";
import counters from "~/lib/Server/counters";
import pokemonFetch from "~/lib/Server/pokemonFetch";
import chat from "~/lib/Server/chat";
import vote from "~/lib/Server/vote";
import { createPolled } from "@solid-primitives/timer";

const prohibitedWords = ["fish", "cat", "dog"];

const instance = Axios.create();
const axios = setupCache(instance);

export async function GET({ request, nativeEvent }: APIEvent) {
  const socket = nativeEvent.node.res.socket as SocketWithIO | null;
  if (!socket) return;
  if (socket.server.io) {
    // console.log("Socket is already running " + request.url, request);
  } else {
    console.log("Initializing Socket");
    const io: sServer = new Server(socket.server, {
      path: "/api/ws",
    });

    socket.server.io = io;

    const { handler: counterHandler } = counters();
    const { handler: pokemonHandler } = pokemonFetch();
    const { handler: chatHandler } = chat();
    const { handler: voteHandler } = vote();

    io.on("connection", socket => {
      console.log(`Connection: ${socket.id}`);

      socket.on(SignalType.Counter, counterHandler(socket));
      socket.on(SignalType.Pokemon, pokemonHandler(socket));
      socket.on(SignalType.Chat, chatHandler(socket));
      socket.on(SignalType.Vote, voteHandler(socket));
    });

    return new Response();
  }
}
