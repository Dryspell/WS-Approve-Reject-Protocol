import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { createContext, Suspense, useContext } from "solid-js";
import Nav from "~/components/Nav";
import "./app.css";
import "@fontsource/inter";
import { Toaster } from "./components/ui/toast";
import { socket } from "./lib/Client/socket";
import { clientSocket } from "./types/socket";
import { MetaProvider, Title } from "@solidjs/meta";
import { SpacetimeDBClient, createSpacetimeDBClient } from "~/lib/spacetimedb";

export const SocketContext = createContext(socket as clientSocket);

// Create SpacetimeDB context
const SpacetimeDBContext = createContext<SpacetimeDBClient>();

export const useSpacetimeDB = () => {
	const context = useContext(SpacetimeDBContext);
	if (!context) {
		throw new Error("useSpacetimeDB must be used within a SpacetimeDBProvider");
	}
	return context;
};

export const SpacetimeDBProvider = (props: { children: any }) => {
	const client = createSpacetimeDBClient({
		host: "localhost:3000", // Replace with your SpacetimeDB server address
		database: "chat", // Replace with your database name
	});

	return (
		<SpacetimeDBContext.Provider value={client}>
			{props.children}
		</SpacetimeDBContext.Provider>
	);
};

export default function App() {
	socket.on("connect", () => {
		console.log("connected to server!!");
	});

	return (
		<Router
			root={props => (
				<MetaProvider>
					<Title>Socket Signals</Title>
					<SpacetimeDBProvider>
						<div class="flex min-h-screen flex-col">
							<Nav />
							<Suspense>
								<main class="flex-1">{props.children}</main>
							</Suspense>
						</div>
					</SpacetimeDBProvider>
				</MetaProvider>
			)}
		>
			<FileRoutes />
			<Toaster />
		</Router>
	);
}
