import { useLocation } from "@solidjs/router";
import { For, Show } from "solid-js";

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
  const isActive = (path: string) => location.pathname === `/${path}` || location.pathname.startsWith(`/${path}/`);

  return (
    <nav class="border-b border-white/5 bg-[#1a1a2e]/95 backdrop-blur-md">
      <div class="flex items-center justify-between px-4">
        <div class="flex items-center gap-1">
          <a href="/" class="mr-3 flex items-center gap-1.5 py-2.5 text-sm font-bold text-white">
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
                  "bg-white/10 text-white": !primary && isActive(value),
                  "text-white/40 hover:bg-white/5 hover:text-white/70": !isActive(value) && !primary,
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

        <Show when={isDev()}>
          <div class="flex items-center gap-1 border-l border-white/10 pl-2">
            <span class="text-[10px] font-medium uppercase tracking-wider text-white/20">Dev</span>
            <For each={devRoutes}>
              {({ value, label }) => (
                <a
                  href={`/${value}`}
                  class="rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors"
                  classList={{
                    "bg-amber-500/20 text-amber-400": isActive(value),
                    "text-white/30 hover:bg-white/5 hover:text-white/50": !isActive(value),
                  }}
                >
                  {label}
                </a>
              )}
            </For>
          </div>
        </Show>
      </div>
    </nav>
  );
}
