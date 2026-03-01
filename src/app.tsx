import { Router, useLocation } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Show, Suspense, createSignal, onMount, createContext, useContext } from "solid-js";
import Nav from "~/components/Nav";
import ChatOverlay from "~/components/ChatOverlay";
import "./app.css";
import "@fontsource/inter";
import { Toaster } from "./components/ui/toast";
import { MetaProvider, Title, Meta, Link } from "@solidjs/meta";
import { SpacetimeDBProvider } from "~/hooks/useSpacetimeDB";

// ── Theme context ──────────────────────────────────────────────────────────
type ThemeContextType = { dark: () => boolean; toggle: () => void };
export const ThemeContext = createContext<ThemeContextType>({ dark: () => true, toggle: () => {} });
export const useTheme = () => useContext(ThemeContext);

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

	// Persist theme preference; default to dark for the game aesthetic
	const [dark, setDark] = createSignal(true);
	onMount(() => {
		const stored = localStorage.getItem("theme");
		setDark(stored !== "light");
	});
	const toggle = () => {
		const next = !dark();
		setDark(next);
		localStorage.setItem("theme", next ? "dark" : "light");
	};

	return (
		<ThemeContext.Provider value={{ dark, toggle }}>
			<SpacetimeDBProvider>
				<div
					class="flex min-h-screen flex-col"
					classList={{ dark: dark(), "bg-[#1a1a2e]": dark(), "bg-gray-50": !dark() }}
				>
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
		</ThemeContext.Provider>
	);
}

export default function App() {
	return (
		<Router
			root={props => (
				<MetaProvider>
				<Title>Nashfall — The Vote Exchange Protocol</Title>
				<Meta name="description" content="Join Nashfall — The Vote Exchange Protocol. Strategize, trade votes, and compete in a real-time multiplayer minority-wins elimination game." />
				<Meta name="keywords" content="multiplayer game, voting game, real-time game, online game, strategy game, social game, SpacetimeDB" />
				<Meta name="author" content="Nashfall Team" />
				
				{/* OpenGraph */}
				<Meta property="og:type" content="website" />
				<Meta property="og:locale" content="en_US" />
				<Meta property="og:url" content="https://nashfall.com" />
				<Meta property="og:site_name" content="Nashfall" />
				<Meta property="og:title" content="Nashfall — The Vote Exchange Protocol" />
				<Meta property="og:description" content="Strategize, trade votes, and compete in a real-time multiplayer minority-wins elimination game." />
				<Meta property="og:image" content="https://nashfall.com/og-image.png" />
				<Meta property="og:image:width" content="1200" />
				<Meta property="og:image:height" content="630" />
				<Meta property="og:image:alt" content="Nashfall — The Vote Exchange Protocol" />
				
				{/* Twitter Card */}
				<Meta name="twitter:card" content="summary_large_image" />
				<Meta name="twitter:title" content="Nashfall — The Vote Exchange Protocol" />
				<Meta name="twitter:description" content="Strategize, trade votes, and compete in a real-time multiplayer minority-wins elimination game." />
				<Meta name="twitter:image" content="https://nashfall.com/og-image.png" />
				<Meta name="twitter:creator" content="@nashfall" />
				
				{/* Robots */}
				<Meta name="robots" content="index, follow" />
				<Link rel="canonical" href="https://nashfall.com" />
					
					<AppShell>{props.children}</AppShell>
				</MetaProvider>
			)}
		>
			<FileRoutes />
			<Toaster />
		</Router>
	);
}
