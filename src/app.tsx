import { Router, useLocation } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Show, Suspense } from "solid-js";
import Nav from "~/components/Nav";
import ChatOverlay from "~/components/ChatOverlay";
import "./app.css";
import "@fontsource/inter";
import { Toaster } from "./components/ui/toast";
import { MetaProvider, Title, Meta, Link } from "@solidjs/meta";
import { SpacetimeDBProvider } from "~/hooks/useSpacetimeDB";

function AppShell(props: { children: any }) {
	let location: ReturnType<typeof useLocation> | undefined;
	try {
		location = useLocation();
	} catch {
		// Router context may not be ready during initial render or HMR
	}
	const isHome = () => location?.pathname === "/";
	const isGame = () => location?.pathname?.startsWith("/vote") ?? false;
	const showNav = () => !isHome() && !isGame();

	return (
		<SpacetimeDBProvider>
			<div class="dark flex min-h-screen flex-col bg-[#1a1a2e]">
				<Show when={showNav()}>
					<Nav />
				</Show>
			<Suspense>
				<main class={showNav() ? "flex-1" : "flex-1 h-screen"}>{props.children}</main>
			</Suspense>
			{/* Suppress global ChatOverlay during gameplay; the in-game ChatPanel handles chat */}
			<Show when={!isGame()}>
				<ChatOverlay />
			</Show>
			</div>
		</SpacetimeDBProvider>
	);
}

export default function App() {
	return (
		<Router
			root={props => (
				<MetaProvider>
					<Title>Socket Signals - Real-Time Multiplayer Voting Game</Title>
					<Meta name="description" content="Join the ultimate real-time multiplayer voting game. Strategize, vote, and compete with players worldwide in Socket Signals." />
					<Meta name="keywords" content="multiplayer game, voting game, real-time game, online game, strategy game, social game, SpacetimeDB" />
					<Meta name="author" content="Socket Signals Team" />
					
					{/* OpenGraph */}
					<Meta property="og:type" content="website" />
					<Meta property="og:locale" content="en_US" />
					<Meta property="og:url" content="https://socketsignals.com" />
					<Meta property="og:site_name" content="Socket Signals" />
					<Meta property="og:title" content="Socket Signals - Real-Time Multiplayer Voting Game" />
					<Meta property="og:description" content="Join the ultimate real-time multiplayer voting game. Strategize, vote, and compete with players worldwide." />
					<Meta property="og:image" content="/og-image.png" />
					<Meta property="og:image:width" content="1200" />
					<Meta property="og:image:height" content="630" />
					<Meta property="og:image:alt" content="Socket Signals - Multiplayer Voting Game" />
					
					{/* Twitter Card */}
					<Meta name="twitter:card" content="summary_large_image" />
					<Meta name="twitter:title" content="Socket Signals - Real-Time Multiplayer Voting Game" />
					<Meta name="twitter:description" content="Join the ultimate real-time multiplayer voting game. Strategize, vote, and compete with players worldwide." />
					<Meta name="twitter:image" content="/og-image.png" />
					<Meta name="twitter:creator" content="@socketsignals" />
					
					{/* Robots */}
					<Meta name="robots" content="index, follow" />
					<Link rel="canonical" href="https://socketsignals.com" />
					
					<AppShell>{props.children}</AppShell>
				</MetaProvider>
			)}
		>
			<FileRoutes />
			<Toaster />
		</Router>
	);
}
