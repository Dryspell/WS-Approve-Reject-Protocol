import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { createContext, Suspense } from "solid-js";
import Nav from "~/components/Nav";
import "./app.css";
import "@fontsource/inter";
import { Toaster } from "./components/ui/toast";
import { MetaProvider, Title } from "@solidjs/meta";
import { SpacetimeDBClient, createSpacetimeDBClient } from "~/lib/spacetimedb";

export const SpacetimeDBContext = createContext<SpacetimeDBClient | null>(null);

export const SpacetimeDBProvider = (props: { children: any }) => {
	const client = createSpacetimeDBClient({
		host: import.meta.env.VITE_SPACETIME_HOST || "localhost:3000",
		database: import.meta.env.VITE_SPACETIME_DATABASE || "game",
	});

	return (
		<SpacetimeDBContext.Provider value={client}>
			{props.children}
		</SpacetimeDBContext.Provider>
	);
};

export default function App() {
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
