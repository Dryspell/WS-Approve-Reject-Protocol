import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { createContext, Suspense } from "solid-js";
import Nav from "~/components/Nav";
import "./app.css";
import "@fontsource/inter";
import { Toaster } from "./components/ui/toast";
import { socket } from "./lib/Client/socket";
import { clientSocket } from "./types/socket";

export const SocketContext = createContext(socket as clientSocket);

export default function App() {
	socket.on("connect", () => {
		console.log("connected to server!!");
	});

	return (
		<Router
			root={(props) => (
				<>
					<SocketContext.Provider value={socket}>
						<Nav />
						<Suspense>{props.children}</Suspense>
					</SocketContext.Provider>
				</>
			)}
		>
			<FileRoutes />
			<Toaster />
		</Router>
	);
}
