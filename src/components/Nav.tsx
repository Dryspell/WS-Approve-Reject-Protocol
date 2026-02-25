import { useLocation } from "@solidjs/router";
import { For, Show } from "solid-js";

const routes = [
  { value: "vote", label: "Play", icon: "M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" },
  { value: "chat", label: "Chat", icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" },
  { value: "social", label: "Social", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
  { value: "leaderboard", label: "Ranks", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  { value: "profile", label: "Profile", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
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
    <nav class="border-b border-slate-200 bg-white">
      <div class="flex items-center justify-between px-4">
        <div class="flex items-center gap-1">
          <a href="/" class="mr-3 flex items-center gap-1.5 py-2 text-sm font-bold text-slate-800">
            <svg class="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span class="hidden sm:inline">Socket Signals</span>
          </a>

          <For each={routes}>
            {({ value, label, icon }) => (
              <a
                href={`/${value}`}
                class="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors"
                classList={{
                  "bg-slate-100 text-slate-900": isActive(value),
                  "text-slate-500 hover:bg-slate-50 hover:text-slate-700": !isActive(value),
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
          <div class="flex items-center gap-1 border-l border-slate-100 pl-2">
            <span class="text-[10px] font-medium uppercase tracking-wider text-slate-300">Dev</span>
            <For each={devRoutes}>
              {({ value, label }) => (
                <a
                  href={`/${value}`}
                  class="rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors"
                  classList={{
                    "bg-amber-100 text-amber-700": isActive(value),
                    "text-slate-400 hover:bg-slate-50 hover:text-slate-600": !isActive(value),
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
