import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import Nav from "~/components/Nav";
import "./app.css";
import "@fontsource/inter";
import { Toaster } from "./components/ui/toast";
import { MetaProvider, Title } from "@solidjs/meta";
import { SpacetimeDBProvider } from "~/hooks/useSpacetimeDB";

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
