import { useLocation } from "@solidjs/router";
import { For, Show } from "solid-js";
import { useTheme } from "~/app";

const routes = [
  { value: "vote", label: "Play", primary: true, icon: "M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" },
  { value: "leaderboard", label: "Ranks", primary: false, icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  { value: "profile", label: "Profile", primary: false, icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
];

const devRoutes = [
  { value: "db-inspector", label: "DB" },
  { value: "canvas/spike", label: "Spikes" },
];

const isDev = () => {
  if (typeof window === "undefined") return false;
  return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
};

export default function Nav() {
  const location = useLocation();
  const { dark, toggle } = useTheme();
  const isActive = (path: string) => location.pathname === `/${path}` || location.pathname.startsWith(`/${path}/`);

  return (
    <nav
      class="border-b backdrop-blur-md transition-colors"
      classList={{
        "border-white/5 bg-[#1a1a2e]/95": dark(),
        "border-gray-200 bg-white/95": !dark(),
      }}
    >
      <div class="flex items-center justify-between px-4">
        <div class="flex items-center gap-1">
          <a
            href="/"
            class="mr-3 flex items-center gap-1.5 py-2.5 text-sm font-bold transition-colors"
            classList={{ "text-white": dark(), "text-gray-900": !dark() }}
          >
            <svg class="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span class="hidden sm:inline">Socket Signals</span>
          </a>

          <For each={routes}>
            {({ value, label, icon, primary }) => (
              <a
                href={`/${value}`}
                class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all"
                classList={{
                  "bg-blue-600 text-white shadow-md shadow-blue-600/25": primary && isActive(value),
                  "bg-white/10 text-white": dark() && !primary && isActive(value),
                  "bg-black/10 text-gray-900": !dark() && !primary && isActive(value),
                  "text-white/40 hover:bg-white/5 hover:text-white/70": dark() && !isActive(value) && !primary,
                  "text-gray-500 hover:bg-black/5 hover:text-gray-800": !dark() && !isActive(value) && !primary,
                  "bg-blue-600/80 text-white hover:bg-blue-600": primary && !isActive(value),
                }}
              >
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d={icon} />
                </svg>
                <span class="hidden sm:inline">{label}</span>
              </a>
            )}
          </For>
        </div>

        <div class="flex items-center gap-2">
          {/* Theme toggle */}
          <button
            onClick={toggle}
            title={dark() ? "Switch to light mode" : "Switch to dark mode"}
            class="rounded-md p-1.5 transition-colors"
            classList={{
              "text-white/40 hover:bg-white/10 hover:text-white/70": dark(),
              "text-gray-400 hover:bg-black/5 hover:text-gray-700": !dark(),
            }}
          >
            <Show when={dark()} fallback={
              // Moon icon
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.72 9.72 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
              </svg>
            }>
              {/* Sun icon */}
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
              </svg>
            </Show>
          </button>

          <Show when={isDev()}>
            <div class="flex items-center gap-1 border-l pl-2 transition-colors" classList={{ "border-white/10": dark(), "border-gray-200": !dark() }}>
              <span class="text-[10px] font-medium uppercase tracking-wider" classList={{ "text-white/20": dark(), "text-gray-300": !dark() }}>Dev</span>
              <For each={devRoutes}>
                {({ value, label }) => (
                  <a
                    href={`/${value}`}
                    class="rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors"
                    classList={{
                      "bg-amber-500/20 text-amber-400": isActive(value),
                      "text-white/30 hover:bg-white/5 hover:text-white/50": dark() && !isActive(value),
                      "text-gray-400 hover:bg-black/5 hover:text-gray-600": !dark() && !isActive(value),
                    }}
                  >
                    {label}
                  </a>
                )}
              </For>
            </div>
          </Show>
        </div>
      </div>
    </nav>
  );
}
